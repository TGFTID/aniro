"""Odbiór lokalnego buildu przez Playwright. Wymaga npm start, playwright i PyMuPDF."""
import argparse
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import fitz
from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://127.0.0.1:4397"
ARTIFACTS = ROOT / "output" / "acceptance"
CABINET = "66ab2fea59692e001228a1c9"
CONFLICT = "66b1c72d59692e0012397b2a"
OASIS = "662a3c0459692e0012ad9e81"
ISUNA = "662a3c0459692e0012ad9e2a"
GRID_INVERTER = "6448f19830b5a5001a64d9dc"
A200 = "6a7c2d9ad38ec2b6cc29f355"
ACCESSORY = "63a1642bdc00d2001a99d71c"
COMPENSATION = dict(reactivePowerKvar="15", reactiveDirection="both", compVoltageV="400",
                    gridConnection="3P/4W", harmonicsRequired="no")
PAIR = dict(capacityKwh="60", capacityBasis="nominal", storagePowerKw="10", acPowerKw="20",
            inverterVoltageV="400", inverterUse="hybrid")
MEASUREMENT_SOURCE = "Protokół syntetyczny do odbioru"
VIEWPORTS = {"desktop": (1440, 900), "mobile": (390, 844)}
COMPENSATION_MODEL = "ASVG 15 CABINET"
PAIR_MODELS = ("SUNWODA OASIS 60KWH", "SINEXCEL ISUNA 20000T")
QUICK_FIELDS = ("billTotal", "reactiveFee", "acPowerKw", "capacityKwh")
SCENARIO_KINDS = {
    "compensation": ("compensator",),
    "storage": ("storage",),
    "inverter": ("inverter",),
    "storage-inverter": ("storage", "inverter"),
    "compensation-inverter": ("compensator", "inverter"),
    "compensation-storage": ("compensator", "storage"),
    "combined": ("compensator", "storage", "inverter"),
}
# Sprawa zapisana przez interfejs buildu 48f92155215bad75a09a44dc2553c9b8badde17e.
LEGACY_CASE = {
    "version": 1,
    "id": "c15a5832-3d39-42f3-9b67-8e7bccb8a7a9",
    "scenario": "compensation",
    "inputs": {"reactivePowerKvar": {"value": "15", "source": "Pomiar testowy 2026-11-20"}},
    "progress": {
        "position": "reactiveDirection",
        "invoice": {"reactiveFee": "267", "billTotal": "1234", "period": "listopad 2026"},
        "siteInverters": "no",
        "missingQuestion": None,
    },
    "step": 2,
    "updated": "2026-11-25T17:37:36.833Z",
    "catalogDate": "2026-11-17",
    "lines": [],
    "option": None,
    "terms": {key: "" for key in (
        "vatRate", "discountRate", "labour", "transport", "extrasCurrency", "priceBasis", "commercialSource", "scope",
    )},
}


def check_width(page, stage):
    widths = page.evaluate("({actual: document.documentElement.scrollWidth, viewport: innerWidth})")
    available = page.viewport_size["width"]
    assert max(widths.values()) <= available, (stage, widths, available)


def quick_field(page, name):
    page.locator("#quick-start:not([inert])").wait_for(state="attached")
    return page.locator(f'#quick-start [name="{name}"]')


def quick_kind(page, kind):
    return page.locator(f'#quick-start [data-kind="{kind}"]')


def quick_slider(page, name):
    return page.locator(f'#quick-start .quick-number:has([name="{name}"]) input[type="range"]')


def quick_installed(page, answer):
    page.locator(f'#quick-start [name="siteInverters"][value="{answer}"]').check()


def open_questionnaire(page):
    page.locator("#quick-start-next").click()
    expect(page.get_by_role("heading", name="Twoja oferta wstępna")).to_be_visible()
    expect(page.locator("#measurements")).to_be_hidden()
    page.locator("[data-details]").click()
    expect(page.locator("#step-2")).to_be_visible()


def expect_question(page, key):
    expect(page.locator(f'#measurements [data-intake-step="{key}"]')).to_be_visible()
    check_width(page, key)


def open_scenario(page, origin, scenario):
    page.goto(origin)
    for kind in SCENARIO_KINDS[scenario]:
        quick_kind(page, kind).check()
    quick_installed(page, "no")
    open_questionnaire(page)
    check_width(page, scenario)


def enter_field(page, key, value):
    field = page.locator(f'#measurements [name="{key}"]')
    if field.evaluate("el => el.tagName") == "SELECT":
        field.select_option(value)
    else:
        field.fill(value)


def next_question(page):
    page.locator("#measurements").get_by_role("button", name="Dalej", exact=True).click()


def enter_measurements(page, inputs, check_back=False):
    fields = {key:value for key,value in inputs.items() if key not in ("inverterVoltageV","compVoltageV") or page.locator(f'#measurements [name="{key}"]').is_visible()}
    for index, (key, value) in enumerate(fields.items()):
        check_width(page, key)
        enter_field(page, key, value)
        page.locator("#measurements .source-extra summary").click()
        page.locator(f'#measurements [name="{key}-source"]').fill(MEASUREMENT_SOURCE)
        if index < len(fields) - 1:
            next_question(page)
        if check_back and index == 0:
            page.locator("#measurements").get_by_role("button", name="Wstecz", exact=True).click()
            expect(page.locator(f'#measurements [name="{key}"]')).to_have_value(value)
            expect(page.locator(f'#measurements [name="{key}-source"]')).to_have_value(MEASUREMENT_SOURCE)
            next_question(page)
    page.get_by_role("button", name="Porównaj urządzenia", exact=True).click()
    expect(page.locator("#step-3")).to_be_visible()
    check_width(page, "wyniki doboru")


def find_product(page, sku):
    page.locator("#find-model").fill(sku)
    card = page.locator(f'#groups [data-product="{sku}"]')
    expect(card).to_be_visible()
    return card


def choose_product(page, sku, kind):
    card = find_product(page, sku)
    if card.locator("[data-pick]").get_attribute("aria-pressed") != "true":
        card.locator("[data-pick]").click()
    quantity = page.locator(f'[data-line="{kind}"][data-property="quantity"]')
    expect(quantity).to_have_value("")
    quantity.fill("1")
    page.locator(f'[data-line="{kind}"][data-property="quantitySource"]').fill("Protokół testowy, 1 szt.")
    review = page.locator(f'[data-line="{kind}"][data-property="technicalSource"]')
    if review.count():
        review.fill("Przegląd do odbioru aplikacji na danych syntetycznych")


def fill_trade(page, mixed=False):
    page.locator("#go-terms").click()
    form = page.locator("#terms-form")
    values = dict(scope="Dostawa według wskazanych pozycji testowych",
                  commercialSource="Jawne warunki syntetycznej kalkulacji",
                  vatRate="23" if mixed else "0", discountRate="10" if mixed else "0",
                  labour="200" if mixed else "0", transport="100" if mixed else "0")
    for key, value in values.items():
        form.locator(f'[name="{key}"]').fill(value)
    form.locator('[name="extrasCurrency"]').select_option("PLN" if mixed else "EUR")
    form.locator('[name="priceBasis"]').select_option("net")
    form.locator('button[type="submit"]').click()
    expect(page.locator("#quote")).to_be_hidden()
    approve_trade(page)


def approve_trade(page):
    form = page.locator("#terms-form")
    form.locator('[name="technical"]').check()
    form.locator('[name="commercial"]').check()
    form.locator('button[type="submit"]').click()
    expect(page.locator("#quote")).to_be_visible()


def compact(text):
    return re.sub(r"\s+", "", text)


def check_pdf_link(page, scope):
    links = scope.locator('a[href*=".pdf#page="]')
    assert links.count() > 0, "Brak działającego odniesienia do konkretnej strony PDF"
    target = links.first.evaluate("el => el.href")
    assert urlparse(target).netloc == urlparse(page.url).netloc, target
    response = page.request.get(target.split("#", 1)[0])
    assert response.ok and response.body().startswith(b"%PDF"), target
    return target


def open_card_details(card):
    details = card.locator("details").first
    if details.get_attribute("open") is None:
        details.locator("summary").first.click()


def verify_printed_offer(page, name, required, totals):
    page.evaluate("""() => {
        window.acceptancePrintEvents = [];
        window.addEventListener('beforeprint', () => window.acceptancePrintEvents.push('beforeprint'), {once: true});
        window.addEventListener('afterprint', () => window.acceptancePrintEvents.push('afterprint'), {once: true});
    }""")
    page.locator("#print-quote").click()
    page.wait_for_function("window.acceptancePrintEvents.join(',') === 'beforeprint,afterprint'")

    output = ARTIFACTS / f"{name}.pdf"
    page.pdf(path=str(output), format="A4", print_background=True)
    with fitz.open(output) as pdf:
        pages = [" ".join(p.get_text().split()) for p in pdf]
    content = " ".join(pages)
    for term in ("Oferta robocza Aniro", "2026-11-17", "Sposób obliczeń", *required):
        assert term in content, f"{name}: brak w PDF {term}"
    for total in totals:
        assert total in compact(pages[0]), f"{name}: suma {total} powinna być na pierwszej stronie"
    assert all(len(page_text) >= 100 for page_text in pages), f"{name}: strona z pojedynczym fragmentem tekstu"
    return len(pages)


def export_incomplete_draft(page):
    with page.expect_download() as download:
        page.locator("#step-2 [data-save-draft]").click()
    draft = json.loads(Path(download.value.path()).read_bytes())
    assert draft["scenario"] == "compensation" and not draft["installationApproval"]


def check_empty_start(page, screen):
    expect(page.locator("#quick-start-title")).to_have_text("Co chcesz dobrać?")
    expect(page.locator("#quick-start input[type=range]")).to_have_count(4)
    expect(page.locator("#quick-start input[data-kind]")).to_have_count(3)
    expect(page.locator("#quick-start input[data-kind]:checked")).to_have_count(0)
    expect(page.locator('#quick-start [name="siteInverters"]:checked')).to_have_count(0)
    expect(quick_field(page, "inverterModel")).to_be_hidden()
    expect(page.locator("[data-save-case]")).to_be_hidden()
    assert page.locator("#quick-start img").evaluate_all(
        "images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0)"
    ), "Brak fotografii na kartach urządzeń"
    capture(page, screen, "start", "#step-1")
    expect(page.locator("#quick-start-next")).to_be_in_viewport(ratio=1)
    for key in QUICK_FIELDS:
        field = quick_field(page, key)
        slider = quick_slider(page, key)
        expect(field).to_be_visible()
        expect(field).to_have_value("")
        expect(slider).to_be_visible()
        expect(slider).to_have_attribute("aria-valuetext", "Brak wartości")
        slider.press("ArrowRight")
        expect(field).to_have_value(re.compile(r"0[.,]0[12]"))
        expect(slider).to_have_attribute("aria-valuetext", re.compile(r"^0[.,]0[12] (zł|kW|kWh)$"))
        field.fill("123,45")
        expect(slider).to_have_value("123.45")
        field.fill("")
        expect(slider).to_have_attribute("aria-valuetext", "Brak wartości")
    for key in ("billTotal", "reactiveFee"):
        field = quick_field(page, key)
        slider = quick_slider(page, key)
        field.fill("0")
        expect(slider).to_have_value("0")
        expect(slider).to_have_attribute("aria-valuetext", "0 zł")
        field.fill("")
        expect(slider).to_have_value("0")
        expect(slider).to_have_attribute("aria-valuetext", "Brak wartości")
    for key in ("acPowerKw", "capacityKwh"):
        field = quick_field(page, key)
        field.fill("0")
        page.locator("#quick-start-next").click()
        expect(field).to_have_attribute("aria-invalid", "true")
        expect(field).to_be_focused()
        expect(page.locator("#step-2")).to_be_hidden()
        field.fill("")
    page.locator("#quick-start-next").click()
    expect(page.locator("#quick-start-feedback")).to_be_visible()
    expect(page.locator("#step-2")).to_be_hidden()
    page.locator("#quick-start-unknown").click()
    expect(page.locator("#step-2")).to_be_visible()
    message = page.locator("#intake-message")
    expect(message).to_be_visible()
    assert "moc kompensacji" in message.input_value().lower()
    expect(page.locator('[data-step="3"]')).to_be_disabled()
    check_width(page, "pomoc przy pustym starcie")


def start_invoice(page, origin, screen=None):
    page.goto(origin)
    quick_field(page, "reactiveFee").fill("250")
    quick_field(page, "billTotal").fill("1200")
    quick_installed(page, "no")
    quick_kind(page,"compensator").check()
    if screen:
        capture(page, screen, "invoice", "#quick-start")
    page.locator("#quick-start-invoice").click()
    expect(page.locator("#first-offer")).to_be_visible()
    page.locator("[data-details]").click()
    expect(page.locator("#step-2")).to_be_visible()
    expect_question(page, "reactivePowerKvar")


def open_help_and_resume(context, page, origin, new_page, screen):
    start_invoice(page, origin, screen)
    page.locator("#measurements").get_by_role("button", name="Nie wiem", exact=True).click()
    help_message = page.locator("#intake-message")
    expect(help_message).to_be_visible()
    expect(page.locator('[data-step="3"]')).to_be_disabled()
    expect(page.locator("#quote")).to_be_hidden()
    message = help_message.input_value()
    for detail in ("moc kompensacji", "kvar", "indukcyjna", "pojemnościowa", "napięcie", "układ przewodów", "harmonicznych"):
        assert detail in message.lower(), f"Brak w prośbie do instalatora: {detail}"
    page.evaluate("navigator.clipboard.writeText('tekst poprzednio skopiowany')")
    page.get_by_role("button", name="Kopiuj wiadomość", exact=True).click()
    expect(page.locator("#intake-copy-status")).to_have_text("Skopiowano wiadomość.")
    clipboard = page.evaluate("navigator.clipboard.readText()").replace("\r\n", "\n")
    assert clipboard == message, "Wiadomość nie trafiła do schowka"
    capture(page, screen, "missing", "#measurements")
    export_incomplete_draft(page)

    page.get_by_role("button", name="Zapisz i wyjdź", exact=True).click()
    expect(page.locator("#saved-cases [data-resume-case]")).to_be_visible()
    page.close()
    reopened = new_page(context)
    reopened.goto(origin)
    reopened.locator("#saved-cases [data-resume-case]").click()
    expect(reopened.locator("#intake-message")).to_have_value(message)
    reopened.get_by_role("button", name="Wróć do pytania", exact=True).click()
    expect_question(reopened, "reactivePowerKvar")
    reopened.locator('[data-step="1"]').click()
    expect(quick_field(reopened, "reactiveFee")).to_have_value("250")
    expect(quick_field(reopened, "billTotal")).to_have_value("1200")
    expect(quick_kind(reopened, "compensator")).to_be_checked()
    open_questionnaire(reopened)
    expect_question(reopened, "reactivePowerKvar")
    return reopened


def capture(page, screen, stage, target, align=False):
    locator = page.locator(target)
    expect(locator).to_be_visible()
    if align:
        locator.evaluate("""el => {
            el.scrollIntoView({block: 'start', behavior: 'instant'});
            window.scrollBy({top: -32, behavior: 'instant'});
        }""")
    else:
        page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    check_width(page, stage)
    page.screenshot(path=str(ARTIFACTS / f"{screen}-{stage}.png"), animations="disabled")


def check_accessories_and_catalog(page):
    accessories = page.locator("#results-accessories")
    catalog_toggle = accessories.get_by_text("Akcesoria w katalogu", exact=True)
    catalog_toggle.click()
    expect(accessories.locator("[data-accessory-list] article")).to_have_count(5)
    accessories.locator("[data-accessory-domain]").select_option("compensation")
    unknown_accessory = accessories.locator("article").filter(has_text=ACCESSORY)
    expect(unknown_accessory).to_contain_text("Katalog nie zawiera tabeli parametrów")
    assert not unknown_accessory.locator("[data-pick]").count()
    catalog_toggle.click()

    associated = find_product(page, "65576b5bfb92ae00136075d0")
    open_card_details(associated)
    associated.get_by_text("Powiązania spoza migawki (7)", exact=True).click()
    expect(associated.get_by_text("Poza migawką katalogu", exact=True)).to_have_count(7)


def check_compensation(page, screen):
    first = page.locator('#measurements [name="reactivePowerKvar"]')
    expect(first).to_have_value("")
    capture(page, screen, "form", "#measurements")
    next_question(page)
    expect(page.locator("#intake-error")).to_be_visible()
    expect(first).to_be_visible()
    expect(page.locator('[data-step="3"]')).to_be_disabled()
    enter_measurements(page, COMPENSATION, check_back=True)
    expect(page.locator("#go-terms")).to_be_disabled()
    check_accessories_and_catalog(page)
    choose_product(page, CABINET, "compensator")
    capture(page, screen, "items", "#selected", align=True)
    fill_trade(page, mixed=True)
    quote = page.locator("#quote")
    expect(quote).to_contain_text(COMPENSATION_MODEL)
    assert all(total in compact(quote.inner_text()) for total in ("4483,35", "369,00"))
    expect(quote.locator(".totals")).to_have_count(2)
    expect(quote).to_contain_text("2026-11-17")
    capture(page, screen, "preview", "#quote", align=screen == "mobile")
    context_terms = ("Dane z faktury i instalacji", "Opłata za energię bierną", "Cała faktura",
                     "Falowniki na obiekcie", "250 zł", "1200 zł")
    pages = verify_printed_offer(page, f"{screen}-compensation", (COMPENSATION_MODEL, *context_terms), ("4483,35", "369,00"))

    page.locator('#terms-form [name="transport"]').fill("120")
    expect(quote).to_be_hidden()
    expect(page.locator('#terms-form [name="technical"]')).not_to_be_checked()
    approve_trade(page)
    check_unknown_breaks_selection(page)
    return pages


def check_unknown_breaks_selection(page):
    page.locator('[data-step="2"]').click()
    answer = page.locator('#measurements [name="harmonicsRequired"]')
    expect(answer).to_have_value("no")
    page.locator('#measurements [data-intake-action="unknown"]').click()
    expect(page.locator("#intake-message")).to_be_visible()
    expect(page.locator('[data-step="3"]')).to_be_disabled()
    expect(page.locator('[data-step="4"]')).to_be_disabled()
    expect(page.locator("#quote")).to_be_hidden()
    expect(page.locator("#preview-lines")).not_to_contain_text(COMPENSATION_MODEL)
    page.locator('#measurements [data-intake-action="return"]').click()
    expect(answer).to_have_value("")


def check_unsaved_answer_survives_resume(page, origin):
    page.goto(origin)
    quick_kind(page, "compensator").check()
    quick_field(page, "reactiveFee").fill("267")
    saved = save_new_case(page)
    expect(saved).to_contain_text("Kompensacja mocy biernej")
    page.locator("#new-case").click()
    expect(page.locator("#step-1")).to_be_visible()
    expect(quick_field(page, "reactiveFee")).to_have_value("")
    expect(quick_kind(page, "compensator")).not_to_be_checked()
    quick_kind(page, "storage").check()
    open_questionnaire(page)
    expect_question(page, "capacityKwh")
    page.locator('#measurements [name="capacityKwh"]').fill("733")
    page.locator('#measurements [data-intake-action="back"]').click()
    saved.click()
    expect(page.locator("#step-1")).to_be_visible()
    expect(quick_field(page, "reactiveFee")).to_have_value("267")
    expect(quick_kind(page, "compensator")).to_be_checked()
    expect(page.locator("#saved-cases")).to_contain_text("Sprawy w tej karcie")
    page.locator("#saved-cases [data-resume-case]").filter(has_text="Magazyn energii").click()
    expect(quick_field(page, "capacityKwh")).to_have_value("733")
    open_questionnaire(page)
    expect_question(page, "capacityKwh")
    expect(page.locator('#measurements [name="capacityKwh"]')).to_have_value("733")


def save_new_case(page):
    rows = page.locator("#saved-cases [data-resume-case]")
    ids = "buttons => buttons.map(button => button.dataset.resumeCase)"
    before = set(rows.evaluate_all(ids))
    page.locator("[data-save-case]").click()
    expect(page.locator("#save-status")).to_contain_text("Sprawa zapisana")
    added = set(rows.evaluate_all(ids)) - before
    assert len(added) == 1, added
    return page.locator(f'#saved-cases [data-resume-case="{added.pop()}"]')


def save_partial_start(page, origin, key, value):
    page.goto(origin)
    quick_field(page, key).fill(value)
    saved = save_new_case(page)
    page.reload()
    saved.click()
    expect(page.locator("#step-1")).to_be_visible()
    expect(page.locator("#quick-start input[data-kind]:checked")).to_have_count(0)
    for field in QUICK_FIELDS:
        expect(quick_field(page, field)).to_have_value(value if field == key else "")


def check_only_power(page, origin):
    save_partial_start(page, origin, "acPowerKw", "20")
    open_questionnaire(page)
    expect_question(page, "inverterUse")
    expect(page.locator("#measurements")).not_to_contain_text("Skąd pochodzi")
    enter_field(page,"inverterUse","hybrid")
    page.get_by_role("button",name="Porównaj urządzenia",exact=True).click()
    expect(page.locator("#groups > section > h3")).to_have_text(["Falowniki"])
    page.locator('[data-step="1"]').click()
    quick_field(page, "acPowerKw").fill("21")
    open_questionnaire(page)
    expect(page.locator("#intake-heading")).to_have_text("Możesz porównać urządzenia")
    page.get_by_role("button", name="Porównaj urządzenia", exact=True).click()
    expect(page.locator("#groups > section > h3")).to_have_text(["Falowniki"])

def check_only_amounts(page, origin):
    save_partial_start(page, origin, "reactiveFee", "250")
    expect(page.locator(".quick-suggestion")).to_contain_text("magazyn")
    page.locator("#quick-start-next").click()
    assert_three_models(page)
    page.locator("[data-edit]").click()
    quick_kind(page,"inverter").uncheck()
    quick_kind(page,"storage").uncheck()
    open_questionnaire(page)
    expect_question(page, "inverters")
    enter_field(page, "siteInverters", "no")
    next_question(page)
    expect_question(page, "reactivePowerKvar")
    expect(page.locator('#measurements [name="reactivePowerKvar"]')).to_have_value("")
    expect(page.locator('[data-step="3"]')).to_be_disabled()
    enter_measurements(page, COMPENSATION)
    expect(page.locator("#groups > section > h3")).to_have_text(["Kompensatory"])

    save_partial_start(page, origin, "billTotal", "1200")
    expect(page.locator(".quick-suggestion")).to_contain_text("falownik")
    page.locator("#quick-start-next").click()
    assert_three_models(page)
    page.locator("[data-benefits]").click()
    page.locator('[data-benefit-tab="solar"]').click()
    solar = page.locator("#first-offer .offer-benefits details").last
    expect(solar).to_have_attribute("open", "")
    for name, value in {"avoided":"200","tariff":"1,10","lostRevenue":"20"}.items():
        solar.locator(f'[name="{name}"]').fill(value)
    assert compact(solar.locator("[data-solar-total]").inner_text()) in ("200zł","200,00zł")
    solar.locator('[data-solar-period="year"]').click()
    assert compact(solar.locator("[data-solar-total]").inner_text()) in ("2400zł","2400,00zł")


def assert_three_models(page):
    offer = page.locator("#first-offer")
    expect(offer).to_be_visible()
    expect(offer.locator("[data-model]")).to_have_count(3)
    for kind in ("inverter","storage","compensator"):
        selected = offer.locator(f'[data-model="{kind}"]')
        assert selected.input_value(), kind
        expect(offer.locator(f'[data-price="{kind}"]')).to_contain_text(re.compile("[0-9]"))
        expect(selected).to_be_in_viewport(ratio=1)
    expect(offer.locator("[data-benefits]")).to_be_in_viewport(ratio=1)


def check_first_offer_benefits(page, origin, screen):
    page.goto(origin)
    quick_field(page, "billTotal").fill("48000")
    quick_field(page, "reactiveFee").fill("7200")
    page.locator('[name="billingPeriod"][value="year"]').check()
    page.locator("#quick-start-invoice").click()
    assert_three_models(page)
    offer = page.locator("#first-offer")
    expect(offer).to_be_visible()
    expect(page.locator("#measurements")).to_be_hidden()
    pick = offer.locator("[data-model=compensator]")
    ids = pick.locator("option").evaluate_all("rows => rows.map(row=>row.value).filter(Boolean)")
    assert len(ids)>1
    pick.select_option(ids[1])
    capture(page,screen,"initial-offer","#first-offer")
    offer.locator("[data-benefits]").click()
    expect(offer.locator("[data-info]")).to_contain_text("roczna")
    assert compact(offer.locator("[data-saving]").inner_text()) == "7200,00zł" or compact(offer.locator("[data-saving]").inner_text()) == "7200zł"
    offer.locator("[data-view=month]").click()
    assert compact(offer.locator("[data-saving]").inner_text()) in ("600zł","600,00zł")
    range_control=offer.locator(".benefit-range input")
    range_control.press("Home")
    assert compact(offer.locator("[data-saving]").inner_text()) in ("0zł","0,00zł")
    range_control.press("End")
    offer.locator(".benefit-cost input").first.fill("3600")
    expect(offer.locator("[data-return]")).to_contain_text("6 mies.")
    capture(page,screen,"benefits","#first-offer [data-fee-box] .benefit",align=True)
    page.locator("[data-save-case]").click()
    row = page.locator("#saved-cases [data-resume-case]").first
    row_id=row.get_attribute("data-resume-case")
    page.reload()
    page.locator(f'[data-resume-case="{row_id}"]').click()
    expect(pick).to_have_value(ids[1])
    offer.locator("[data-benefits]").click()
    expect(offer.locator(".benefit-cost input").first).to_have_value("3600")
    check_width(page, "oferta i korzyści")

def check_existing_inverter(page, origin):
    model = "SINEXCEL ISUNA 20000T"
    page.goto(origin)
    quick_field(page, "capacityKwh").fill("60")
    quick_field(page, "acPowerKw").fill("20")
    expect(page.locator(".quick-suggestion")).to_contain_text("falownik")
    expect(page.locator(".quick-suggestion")).to_contain_text("magazyn")
    quick_kind(page, "storage").check()
    expect(page.locator(".quick-suggestion")).to_be_hidden()
    quick_installed(page, "yes")
    quick_field(page, "inverterModel").fill(model)
    open_questionnaire(page)
    expect(page.locator("#measurements")).to_contain_text(model)
    expect(page.locator("#measurements")).to_contain_text("BMS")
    expect(page.locator('#measurements [name="inverterModel"]')).to_have_count(0)
    expect_question(page, "capacityBasis")
    enter_measurements(page, {"capacityBasis": "nominal", "storagePowerKw": "10"})
    expect(page.locator("#groups > section > h3")).to_have_text(["Magazyny energii"])
    page.locator('[data-step="1"]').click()
    page.locator("#quick-start-next").click()
    expect(page.locator("#first-offer [data-model]")).to_have_count(1)
    page.locator('[data-add-kind="inverter"]').click()
    expect(page.locator('[data-model="inverter"]')).to_be_visible()
    page.locator('[data-add-kind="compensator"]').click()
    assert_three_models(page)


def check_group_scope(page, origin):
    for scenario, fields, headings in (
        ("compensation-inverter", {**COMPENSATION, "acPowerKw": "20", "inverterVoltageV": "400", "inverterUse": "hybrid"},
         ["Kompensatory", "Falowniki"]),
        ("compensation-storage", {**COMPENSATION, "capacityKwh": "60", "capacityBasis": "nominal", "storagePowerKw": "10"},
         ["Kompensatory", "Magazyny energii"]),
    ):
        open_scenario(page, origin, scenario)
        enter_measurements(page, fields)
        expect(page.locator("#groups > section > h3")).to_have_text(headings)


def check_legacy_case(page, origin):
    page.goto(origin)
    page.evaluate("""row => localStorage.setItem('aniro.cases.v1.' + row.id, JSON.stringify(row))""", LEGACY_CASE)
    page.reload()
    page.locator(f'#saved-cases [data-resume-case="{LEGACY_CASE["id"]}"]').click()
    expect_question(page, "reactiveDirection")
    back = page.locator('#measurements [data-intake-action="back"]')
    back.click()
    expect(page.locator('#measurements [name="reactivePowerKvar"]')).to_have_value("15")
    expect(page.locator('#measurements [name="reactivePowerKvar-source"]')).to_have_value("Pomiar testowy 2026-11-20")
    back.click()
    expect(page.locator('#measurements [name="siteInverters"]')).to_have_value("no")
    back.click()
    expect_question(page, "invoice")
    expect(page.locator('#measurements [name="reactiveFee"]')).to_have_value("267")
    expect(page.locator('#measurements [name="billTotal"]')).to_have_value("1234")
    expect(page.locator('#measurements [name="billPeriod"]')).to_have_value("listopad 2026")
    next_question(page)
    next_question(page)
    next_question(page)
    expect_question(page, "reactiveDirection")
    enter_measurements(page, {key: value for key, value in COMPENSATION.items() if key != "reactivePowerKvar"})
    expect(page.locator("#groups > section > h3")).to_have_text(["Kompensatory"])


def check_pair(page, origin, screen, partial=False):
    open_scenario(page, origin, "storage-inverter")
    measurements = {**PAIR, "storagePowerKw": "2000"} if partial else PAIR
    enter_measurements(page, measurements)
    page.locator("#find-model").fill("MODEL_ZERO_WYNIKOW")
    expect(page.locator("#groups")).to_contain_text("Brak pozycji dla wybranych filtrów")
    choose_product(page, OASIS, "storage")
    selected = page.locator("#selected")
    not_compatible = find_product(page, GRID_INVERTER)
    expect(not_compatible.locator(".variant-heading .grade.fails")).to_be_visible()
    expect(not_compatible.locator("[data-pick]")).to_have_count(0)
    expect(selected).not_to_contain_text("SPI50K-B")
    choose_product(page, ISUNA, "inverter")
    expect(selected).to_contain_text("Zgodność pary udokumentowana")
    check_pdf_link(page, selected)
    pair_qty = selected.locator('[data-line="storage"][data-property="quantity"]')
    pair_qty.fill("2")
    expect(page.locator("#go-terms")).to_be_disabled()
    pair_qty.fill("1")

    fill_trade(page)
    quote = page.locator("#quote")
    assert "29121,19" in compact(quote.inner_text()), quote.inner_text()
    expect(quote.locator(".totals")).to_have_count(1)
    for model in PAIR_MODELS:
        expect(quote).to_contain_text(model)
    power = f'{measurements["storagePowerKw"]} kW'
    pdf_terms = (*PAIR_MODELS, "Zgodność pary udokumentowana", "Częściowa wycena",
                 "Spełnienie wymagań obiektu niepotwierdzone", power)
    open_checks = quote.locator(".open-checks")
    expect(open_checks).to_be_visible()
    expect(open_checks).to_contain_text("Spełnienie wymagań obiektu niepotwierdzone")
    expect(open_checks).to_contain_text(power)
    check_width(page, "oferta pary")
    variant = "partial-pair" if partial else "pair"
    return verify_printed_offer(page, f"{screen}-{variant}", pdf_terms, ("29121,19",))


def check_catalog_conflict(page, origin):
    open_scenario(page, origin, "compensation")
    enter_measurements(page, {**COMPENSATION, "reactivePowerKvar": "100", "harmonicsRequired": "yes", "harmonics": "13"})
    card = find_product(page, CONFLICT)
    open_card_details(card)
    detail = card.inner_text().lower()
    for term in ("13", "15", "rozbież", "ręczn"):
        assert term in detail, detail[:200]


def check_unconfirmed_pair(page, origin):
    open_scenario(page, origin, "combined")
    enter_measurements(page, {**COMPENSATION, **PAIR})
    choose_product(page, CABINET, "compensator")
    choose_product(page, A200, "storage")
    selected = page.locator("#selected")
    selected.locator('[name="offer-option"][value="storage"]').check()
    expect(page.locator("#go-terms")).to_be_disabled()
    expect(page.locator("#selection-status")).to_contain_text("cen")
    choose_product(page, ISUNA, "inverter")
    expect(selected).to_contain_text("Zgodność pary niepotwierdzona")
    expect(selected.locator('[name="offer-option"]')).to_have_count(3)
    expect(page.locator("#go-terms")).to_be_disabled()
    selected.locator('[name="offer-option"][value="inverter"]').check()
    fill_trade(page)
    quote = page.locator("#quote")
    expect(quote).to_contain_text("SINEXCEL ISUNA 20000T")
    expect(quote).not_to_contain_text(COMPENSATION_MODEL)
    expect(quote).not_to_contain_text("SUNWODA OASIS A200")
    check_width(page, "oferta pojedynczego wariantu")


def audit(origin, preview, expected_sha, channel):
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    expected = expected_sha or head
    errors, failed, outside, screens = [], [], [], {}
    origin_server = urlparse(origin).netloc
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=channel)
        version = None

        def new_page(context):
            page = context.new_page()
            page.set_default_timeout(7000)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
            page.on("requestfailed", lambda request: failed.append((request.url, request.failure)))
            page.on("request", lambda request: outside.append(request.url)
                    if urlparse(request.url).scheme in ("http", "https")
                    and urlparse(request.url).netloc != origin_server else None)
            return page

        for screen, (width, height) in VIEWPORTS.items():
            with browser.new_context(viewport={"width": width, "height": height}, locale="pl-PL",
                                     is_mobile=screen == "mobile", has_touch=screen == "mobile") as context:
                context.grant_permissions(["clipboard-read", "clipboard-write"], origin=origin)
                page = new_page(context)
                page.goto(origin)
                build = page.request.get(origin + "/version.json").json()["commit"]
                if version is None:
                    version = build
                assert build == version, (build, version)
                if not preview:
                    assert build == expected, (build, expected)
                    expect(page.locator("#version")).to_have_attribute("title", expected)
                try:
                    check_empty_start(page, screen)
                except AssertionError as error:
                    raise AssertionError(f"Start {screen}: błędy konsoli {errors}, nieudane żądania {failed}") from error
                check_only_power(page, origin)
                check_only_amounts(page, origin)
                check_existing_inverter(page, origin)
                check_first_offer_benefits(page, origin, screen)

                # Start the help case without earlier persistent synthetic drafts.
                page.evaluate("localStorage.clear()")

                page = open_help_and_resume(context, page, origin, new_page, screen)
                pdfs = {"compensation": check_compensation(page, screen), "pair": check_pair(page, origin, screen)}
                scenarios = ["editable-first-offer-and-monthly-yearly-benefits","four-empty-slider-fields", "explicit-zero-versus-empty", "help-from-empty-start",
                             "declared-power-skips-source-and-voltage", "editable-power-without-repeat-question", "only-reactive-fee-resume",
                             "bill-only-automatic-offer", "known-inverter-and-capacity", "manual-scope-over-suggestions",
                             "invoice-copy-save-resume", "back-keeps-data",
                             "compensation-offer-print",
                             "incompatible-inverter-blocked", "documented-pair-offer-print",
                             "missing-accessory-data", "edit-invalidates-offer", "unknown-clears-selection"]
                if screen == "desktop":
                    check_catalog_conflict(page, origin)
                    pdfs["partialPair"] = check_pair(page, origin, screen, partial=True)
                    check_unsaved_answer_survives_resume(page, origin)
                    check_group_scope(page, origin)
                    check_legacy_case(page, origin)
                    scenarios += ["harmonics-conflict", "partial-pair-offer-print", "resume-keeps-other-answer",
                                  "compensator-inverter-and-compensator-storage-scope", "resume-v1-from-48f9215"]
                else:
                    check_unconfirmed_pair(page, origin)
                    scenarios.append("unconfirmed-pair-single-option")
                screens[screen] = {"viewport": [width, height], "scenarios": scenarios, "pdfPages": pdfs}
        browser_version = browser.version
        browser.close()

    assert not errors, errors
    assert not failed, failed
    assert not outside, outside
    report = {"commit": version, "mode": "preview" if preview else "exact-sha", "gitHead": head,
              "browser": f"{channel or 'Chromium'} {browser_version}", "screens": screens,
              "consoleErrors": errors, "failedRequests": failed, "externalRequests": outside}
    encoded = json.dumps(report, ensure_ascii=False, separators=(",", ":"))
    (ARTIFACTS / "report.json").write_text(encoded + "\n", encoding="utf-8")
    print(encoded)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    version = parser.add_mutually_exclusive_group()
    version.add_argument("--preview", action="store_true", help="Dopuszcza niezacommitowany build roboczy")
    version.add_argument("--sha", help="Wymaga wskazanego pełnego SHA (domyślnie HEAD)")
    parser.add_argument("--origin", default=ORIGIN, help="Adres lokalnego serwera")
    parser.add_argument("--channel", choices=("chrome", "msedge"), help="Używa systemowej przeglądarki")
    args = parser.parse_args()
    if args.sha and not re.fullmatch(r"[a-f0-9]{40}", args.sha):
        parser.error("--sha wymaga pełnego, 40-znakowego SHA")
    audit(args.origin.rstrip("/"), args.preview, args.sha, args.channel)
