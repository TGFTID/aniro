"""Odbiór lokalnego buildu. Uruchom przy działającym npm start, z pakietem playwright."""
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
A200 = "6a7c2d9ad38ec2b6cc29f355"
ACCESSORY = "63a1642bdc00d2001a99d71c"
COMPENSATION = dict(reactivePowerKvar="15", reactiveDirection="both", compVoltageV="400",
                    gridConnection="3P/4W", harmonicsRequired="no")
PAIR = dict(capacityKwh="60", capacityBasis="nominal", storagePowerKw="10", acPowerKw="20",
            inverterVoltageV="400", inverterUse="hybrid")
MEASUREMENT_SOURCE = "Protokół syntetyczny do odbioru"


def open_scenario(page, scenario):
    page.goto(ORIGIN)
    page.locator(f'[data-scenario="{scenario}"]').click()
    expect(page.locator("#step-2")).to_be_visible()


def enter_measurements(page, inputs):
    for key, value in inputs.items():
        field = page.locator(f'#measurements [name="{key}"]')
        if field.evaluate("el => el.tagName") == "SELECT":
            field.select_option(value)
        else:
            field.fill(value)
        page.locator(f'#measurements [name="{key}-source"]').fill(MEASUREMENT_SOURCE)
    page.locator('#measurements button[type="submit"]').click()
    expect(page.locator("#step-3")).to_be_visible()


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
    page.locator(f'[data-line="{kind}"][data-property="quantitySource"]').fill("Jedna sztuka wskazana w protokole testowym")
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
    response = page.request.get(target.split("#", 1)[0])
    assert response.ok and response.body().startswith(b"%PDF"), target
    return target


def open_card_details(card):
    details = card.locator("details").first
    if details.get_attribute("open") is None:
        details.locator("summary").first.click()


def verify_printed_offer(page):
    output = ARTIFACTS / "partial-offer.pdf"
    page.pdf(path=str(output), format="A4", print_background=True)
    with fitz.open(output) as pdf:
        pages = [" ".join(p.get_text().split()) for p in pdf]
    content = " ".join(pages)
    for required in ["Częściowa wycena", "Spełnienie wymagań obiektu niepotwierdzone", "2000 kW",
                     "SUNWODA OASIS 60KWH", "SINEXCEL ISUNA 20000T", "2026-11-17", "Sposób obliczeń"]:
        assert required in content, "Brak informacji w wydruku: " + required
    assert "29121,19" in compact(pages[0]), "Suma kwot powinna być na pierwszej stronie"
    assert all(len(page_text) >= 100 for page_text in pages), "Strona z pojedynczym fragmentem tekstu"
    return len(pages)


def audit(preview):
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    errors, outside, results = [], [], []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="pl-PL")
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("request", lambda r: outside.append(r.url) if urlparse(r.url).scheme in ("http", "https")
                and urlparse(r.url).netloc != urlparse(ORIGIN).netloc else None)
        page.goto(ORIGIN)
        expect(page.locator('[data-scenario="compensation"]')).to_be_visible()
        version = page.request.get(ORIGIN + "/version.json").json()["commit"]
        if not preview:
            assert version == head, (version, head)
            expect(page.locator("#version")).to_have_attribute("title", head)

        open_scenario(page, "compensation")
        page.locator('#measurements button[type="submit"]').click()
        expect(page.locator("#input-errors")).to_be_visible()
        expect(page.locator('[data-step="3"]')).to_be_disabled()
        expect(page.locator("#quote")).to_be_hidden()
        with page.expect_download() as download:
            page.locator("#step-2 [data-save-draft]").click()
        draft = json.loads(Path(download.value.path()).read_bytes())
        assert draft["scenario"] == "compensation" and not draft["installationApproval"]
        results.append("Braki danych blokują dobór. Zapis niezatwierdzonego szkicu działa.")
        enter_measurements(page, COMPENSATION)
        expect(page.locator("#go-terms")).to_be_disabled()
        accessories = page.locator("#results-accessories")
        accessories.get_by_text("Akcesoria w katalogu", exact=True).click()
        expect(accessories.locator("[data-accessory-list] article")).to_have_count(5)
        accessories.locator("[data-accessory-domain]").select_option("compensation")
        unknown_accessory = accessories.locator("article").filter(has_text=ACCESSORY)
        expect(unknown_accessory).to_contain_text("Katalog nie zawiera tabeli parametrów")
        assert not unknown_accessory.locator("[data-pick]").count()
        results.append("Akcesorium bez parametrów można sprawdzić w katalogu. Nie powstaje z niego pozycja oferty.")
        associated = find_product(page, "65576b5bfb92ae00136075d0")
        open_card_details(associated)
        outside_links = associated.get_by_text("Powiązania spoza migawki (7)", exact=True)
        outside_links.click()
        expect(associated.get_by_text("Poza migawką katalogu", exact=True)).to_have_count(7)
        choose_product(page, CABINET, "compensator")
        fill_trade(page, mixed=True)
        quote = page.locator("#quote")
        assert "ASVG 15 CABINET" in quote.inner_text()
        assert "4483,35" in compact(quote.inner_text()) and "369,00" in compact(quote.inner_text())
        expect(quote.locator(".totals")).to_have_count(2)
        expect(quote).to_contain_text("2026-11-17")
        quote.scroll_into_view_if_needed()
        quote.screenshot(path=str(ARTIFACTS / "compensation-offer.png"))
        page.locator('#terms-form [name="transport"]').fill("120")
        expect(quote).to_be_hidden()
        expect(page.locator('#terms-form [name="technical"]')).not_to_be_checked()
        results.append("Kompensacja do oferty. Oddzielne podsumowania USD i PLN. Edycja unieważnia ofertę.")

        open_scenario(page, "compensation")
        enter_measurements(page, {**COMPENSATION, "reactivePowerKvar": "100", "harmonicsRequired": "yes", "harmonics": "13"})
        card = find_product(page, CONFLICT)
        open_card_details(card)
        detail = card.inner_text()
        assert "13" in detail and "15" in detail and "rozbież" in detail.lower()
        assert "ręczn" in detail.lower(), detail[:200]
        results.append("ASVG 100 Cabinet pokazuje rozbieżność 13/15 i ręczny status.")
        open_scenario(page, "storage-inverter")
        enter_measurements(page, {**PAIR, "storagePowerKw": "2000"})
        page.locator("#find-model").fill("MODEL_ZERO_WYNIKOW")
        expect(page.locator("#groups")).to_contain_text("Brak pozycji dla wybranych filtrów")
        choose_product(page, OASIS, "storage")
        choose_product(page, ISUNA, "inverter")
        selected = page.locator("#selected")
        expect(selected).to_contain_text("Zgodność pary udokumentowana")
        check_pdf_link(page, selected)
        pair_qty = selected.locator('[data-line="storage"][data-property="quantity"]')
        pair_qty.fill("2")
        expect(page.locator("#go-terms")).to_be_disabled()
        pair_qty.fill("1")
        fill_trade(page)
        assert "29121,19" in compact(quote.inner_text()), quote.inner_text()
        expect(quote.locator(".totals")).to_have_count(1)
        expect(quote).to_contain_text("SUNWODA OASIS 60KWH")
        expect(quote).to_contain_text("SINEXCEL ISUNA 20000T")
        open_checks = quote.locator(".open-checks")
        expect(open_checks).to_be_visible()
        expect(open_checks).to_contain_text("Spełnienie wymagań obiektu niepotwierdzone")
        expect(open_checks).to_contain_text("2000 kW")
        quote.screenshot(path=str(ARTIFACTS / "documented-pair.png"))
        pdf_pages = verify_printed_offer(page)
        results.append("OASIS 60 i ISUNA 20000T mają dowód zgodności modeli. Częściowa wycena zachowuje otwarte wymaganie 2000 kW i odsyła do strony PDF.")

        page.set_viewport_size({"width": 375, "height": 812})
        open_scenario(page, "combined")
        enter_measurements(page, {**COMPENSATION, **PAIR})
        choose_product(page, CABINET, "compensator")
        choose_product(page, A200, "storage")
        selected.locator('[name="offer-option"][value="storage"]').check()
        expect(page.locator("#go-terms")).to_be_disabled()
        expect(page.locator("#selection-status")).to_contain_text("cen")
        choose_product(page, ISUNA, "inverter")
        expect(selected).to_contain_text("Zgodność pary niepotwierdzona")
        assert selected.locator('[name="offer-option"]').count() == 3
        expect(page.locator("#go-terms")).to_be_disabled()
        selected.locator('[name="offer-option"][value="inverter"]').check()
        fill_trade(page)
        expect(quote).to_contain_text("SINEXCEL ISUNA 20000T")
        expect(quote).not_to_contain_text("ASVG 15 CABINET")
        expect(quote).not_to_contain_text("SUNWODA OASIS A200")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Przewijanie poziome na telefonie"
        results.append("Rozwiązanie łączone bez dowodu dla całości. Telefon pozwala wycenić jeden wskazany wariant.")
        browser.close()
    assert not errors, errors
    assert not outside, outside
    report = {"commit": version, "browser": "Chromium", "scenarios": results,
              "quotePdfPages": pdf_pages, "consoleErrors": errors, "externalRequests": outside}
    (ARTIFACTS / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true", help="Dopuszcza niezacommitowany build roboczy")
    audit(parser.parse_args().preview)
