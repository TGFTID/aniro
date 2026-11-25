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


def check_width(page, stage):
    widths = page.evaluate("({actual: document.documentElement.scrollWidth, viewport: innerWidth})")
    available = page.viewport_size["width"]
    assert max(widths.values()) <= available, (stage, widths, available)


def open_scenario(page, origin, scenario):
    page.goto(origin)
    page.locator(f'[data-scenario="{scenario}"]').click()
    expect(page.locator("#step-2")).to_be_visible()
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
    for index, (key, value) in enumerate(inputs.items()):
        check_width(page, key)
        enter_field(page, key, value)
        page.locator(f'#measurements [name="{key}-source"]').fill(MEASUREMENT_SOURCE)
        if index < len(inputs) - 1:
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


def open_help_and_resume(context, page, origin, new_page, screen):
    open_scenario(page, origin, "compensation")
    sliders = page.locator("#measurements [data-amount-slider]")
    expect(sliders).to_have_count(2)
    fee = page.locator('#measurements [name="reactiveFee"]')
    fee_slider = page.locator('[data-amount-slider="reactiveFee"]')
    expect(fee).to_have_value("")
    fee_slider.press("ArrowRight")
    expect(fee).to_have_value("0.01")
    fee.fill("250")
    expect(fee_slider).to_have_value("250")
    capture(page, screen, "invoice", "#measurements")
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
    expect(page.locator("[data-resume-case]")).to_be_visible()
    page.close()
    reopened = new_page(context)
    reopened.goto(origin)
    reopened.locator("[data-resume-case]").click()
    expect(reopened.locator("#intake-message")).to_have_value(message)
    reopened.get_by_role("button", name="Wróć do pytania", exact=True).click()
    expect(reopened.locator('#measurements [name="reactiveFee"]')).to_have_value("250")
    return reopened


def complete_invoice(page):
    enter_field(page, "reactiveFee", "250")
    enter_field(page, "billTotal", "1200")
    enter_field(page, "billPeriod", "listopad 2026")
    next_question(page)
    enter_field(page, "siteInverters", "no")
    next_question(page)


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
    complete_invoice(page)
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
    pages = verify_printed_offer(page, f"{screen}-compensation", (COMPENSATION_MODEL,), ("4483,35", "369,00"))

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
    open_scenario(page, origin, "compensation")
    page.locator('[name="reactiveFee"]').fill("267")
    page.locator("[data-save-case]").click()
    expect(page.locator("#save-status")).to_contain_text("Sprawa zapisana")
    page.locator("#new-case").click()
    saved = page.locator("[data-resume-case]").first
    expect(saved).to_contain_text("Mam na fakturze opłatę za energię bierną")
    page.locator('[data-scenario="storage"]').click()
    page.locator('#measurements [name="capacityKwh"]').fill("733")
    page.locator('#measurements [data-intake-action="back"]').click()
    saved.click()
    expect(page.locator('#measurements [name="reactiveFee"]')).to_have_value("267")
    page.locator('[data-step="1"]').click()
    page.locator('[data-scenario="storage"]').click()
    expect(page.locator('#measurements [name="capacityKwh"]')).to_have_value("733")


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
    complete_invoice(page)
    enter_measurements(page, {**COMPENSATION, "reactivePowerKvar": "100", "harmonicsRequired": "yes", "harmonics": "13"})
    card = find_product(page, CONFLICT)
    open_card_details(card)
    detail = card.inner_text().lower()
    for term in ("13", "15", "rozbież", "ręczn"):
        assert term in detail, detail[:200]


def check_unconfirmed_pair(page, origin):
    open_scenario(page, origin, "combined")
    complete_invoice(page)
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
    errors, outside, screens = [], [], {}
    origin_server = urlparse(origin).netloc
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=channel)
        version = None

        def new_page(context):
            page = context.new_page()
            page.set_default_timeout(7000)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
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
                expect(page.locator('[data-scenario="compensation"]')).to_be_visible()
                capture(page, screen, "start", "#step-1")
                build = page.request.get(origin + "/version.json").json()["commit"]
                if version is None:
                    version = build
                assert build == version, (build, version)
                if not preview:
                    assert build == expected, (build, expected)
                    expect(page.locator("#version")).to_have_attribute("title", expected)

                page = open_help_and_resume(context, page, origin, new_page, screen)
                pdfs = {"compensation": check_compensation(page, screen), "pair": check_pair(page, origin, screen)}
                scenarios = ["invoice-amount-slider", "invoice-copy-save-resume", "back-keeps-data",
                             "compensation-offer-print",
                             "incompatible-inverter-blocked", "documented-pair-offer-print",
                             "missing-accessory-data", "edit-invalidates-offer", "unknown-clears-selection"]
                if screen == "desktop":
                    check_catalog_conflict(page, origin)
                    pdfs["partialPair"] = check_pair(page, origin, screen, partial=True)
                    check_unsaved_answer_survives_resume(page, origin)
                    scenarios += ["harmonics-conflict", "partial-pair-offer-print", "resume-keeps-other-answer"]
                else:
                    check_unconfirmed_pair(page, origin)
                    scenarios.append("unconfirmed-pair-single-option")
                screens[screen] = {"viewport": [width, height], "scenarios": scenarios, "pdfPages": pdfs}
        browser_version = browser.version
        browser.close()

    assert not errors, errors
    assert not outside, outside
    report = {"commit": version, "mode": "preview" if preview else "exact-sha", "gitHead": head,
              "browser": f"{channel or 'Chromium'} {browser_version}", "screens": screens,
              "consoleErrors": errors, "externalRequests": outside}
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
