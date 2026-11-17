import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCatalog, parseParameter } from "../src/catalog.js";
import * as evidence from "../src/evidence.js";

const source = readFileSync(new URL("../data/catalog.json", import.meta.url));
const snapshot = JSON.parse(source);
const catalog = buildCatalog(snapshot, evidence);

test("katalog zachowuje wszystkie 112 rekordów i cztery rozłączne rodzaje", () => {
  assert.equal(createHash("sha256").update(source).digest("hex"),
    "64c22de049b9b835003fa36bac2ee1d40ab090c40acb6a5f0cd76428e514d91f");
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.snapshotDate, "2026-11-17");
  assert.deepEqual(catalog.counts, { compensator: 55, inverter: 35, storage: 17, accessory: 5 });
  assert.equal(Object.keys(catalog.byId).length, 112);

  for (const original of snapshot.products) {
    const normalized = catalog.byId[original.id];
    assert.equal(normalized.model, original.model);
    assert.equal(normalized.manufacturer, original.manufacturer);
    assert.equal(normalized.ean, original.ean);
    assert.deepEqual(normalized.category, original.category);
    assert.deepEqual(normalized.parameters.map(({ name, raw }) => ({ name, value: raw })), original.parameters);
    assert.equal(normalized.descriptionRaw, original.description_source);
    assert.equal(normalized.description, original.description_source.replaceAll("__DOT__", "."));
    assert.deepEqual(normalized.source, original.source);
    assert.deepEqual(normalized.priceSnapshot, original.price_snapshot);
    assert.equal(normalized.availabilitySnapshot, original.availability_snapshot);
    assert.deepEqual(normalized.specificationLinksSource, original.specification_links_source);
    assert.deepEqual(normalized.associatedProducts, original.associated_products);
    assert.equal(normalized.technicalReviewRequired, true);
  }
});

test("parser zachowuje źródło, liczbę z markerem, granicę oraz zakres z jednostką", () => {
  const decimal = parseParameter("MAKS__DOT__ MOC WYJSCIOWA", "13__DOT__2KVA", "Karta");
  assert.deepEqual([decimal.name, decimal.raw, decimal.displayName, decimal.display, decimal.value, decimal.unit, decimal.source],
    ["MAKS__DOT__ MOC WYJSCIOWA", "13__DOT__2KVA", "MAKS. MOC WYJSCIOWA", "13.2KVA", 13.2, "kVA", "Karta"]);
  const bound = parseParameter("POZIOM HALASU [DB]", "<38");
  assert.deepEqual([bound.kind, bound.operator, bound.value, bound.unit], ["bound", "<", 38, "dB"]);
  const range = parseParameter("TEMPERATURA ROBOCZA", "-25℃~+60℃");
  assert.deepEqual([range.kind, range.min, range.max, range.unit], ["range", -25, 60, "°C"]);
  const reactive = parseParameter("ZMNIEJSZENIE MOCY BIERNEJ [KVAR] OD…DO…", "0,1 – 15");
  assert.deepEqual([reactive.min, reactive.max, reactive.unit], [0.1, 15, "kvar"]);
});

test("sprzeczne jednostki, odwrócony zakres i warunkowy przypis nie są potwierdzoną liczbą", () => {
  for (const value of ["5 kWh", "<5 kWh", "2–5 kWh", "2 kW–5 kWh"]) {
    const result = parseParameter("Pole [kW]", value);
    assert.equal(result.status, "ambiguous", value);
    assert.equal(result.raw, value);
    assert.equal(result.labelUnit, "kW");
    assert.equal(result.unit, "kWh");
  }
  assert.equal(parseParameter("Zakres", "20–10 A").status, "ambiguous");
  assert.equal(parseParameter("Pojemność [kWh]", "60 kWh*").status, "uninterpreted");
  assert.equal(parseParameter("Masa", "7").unit, null);
  assert.equal(parseParameter("Temperatura", "N/D").status, "missing");
  assert.equal(parseParameter("Prąd", "25A / 25A").status, "uninterpreted");
});

test("braki, konflikty i akcesoria pozostają widoczne", () => {
  const accessory = catalog.byId["63a1642bdc00d2001a99d71c"];
  assert.equal(accessory.kind, "accessory");
  assert.deepEqual(accessory.parameters, []);
  assert.ok(accessory.missing.some((message) => message.includes("tabeli parametrów")));
  for (const id of ["675703c76e8d310013284e9f", "675703c76e8d310013284e9e"]) {
    assert.equal(catalog.byId[id].description, "");
    assert.ok(catalog.byId[id].missing.some((message) => message.includes("opisu")));
  }
  const cabinet = catalog.byId["66b1c72d59692e0012397b2a"];
  assert.equal(cabinet.facts.harmonics.status, "conflict");
  assert.ok(cabinet.description.includes("3, 5, 7, 9, 11, 13"));
  assert.equal(cabinet.parameters.find(({ name }) => name === "HARMONICZNE KOMPENSOWANE").raw, "3, 5, 7, 9, 11, 15");
  const ultra = catalog.products.find(({ model }) => model === "ASVG 15 ULTRA SINEXCEL");
  assert.equal(ultra.facts.harmonics.status, "conflict");
});

test("moc AC do doboru pozostaje mocą czynną, a pojemność katalogowa nie wyznacza użytkowej", () => {
  const inverter = catalog.byId["6745763312e63a0012b3b8f7"];
  assert.equal(inverter.facts.nominalAcPowerKw.value, 5);
  assert.match(inverter.facts.nominalAcPowerKw.source, /\.pdf, s\. 1/);
  const atrix = catalog.byId["668cd86e59692e0012d57177"];
  assert.equal(atrix.facts.catalogCapacityKwh.value, 5);
  assert.equal(atrix.facts.usableCapacityKwh, undefined);
  const suness = catalog.byId["668cd86e59692e0012d57173"];
  assert.equal(suness.facts.usableCapacityKwh.value, 4.5);
  assert.equal(suness.facts.nominalChargeDischargePowerKw.value, 2.5);
});

test("sprzeczny dowód PDF blokuje porównanie bez usuwania faktu lub tabeli", () => {
  const id = "6745763312e63a0012b3b8f7";
  const extra = buildCatalog(snapshot, { pdfFactsById: { [id]: [
    { label: "Moc AC", value: "15 kW", source: "Potwierdzenie testowe, s. 1", status: "confirmed", field: "nominalAcPowerKw" },
  ] } }).byId[id];
  assert.equal(extra.facts.nominalAcPowerKw.status, "conflict");
  assert.ok(extra.conflicts.some((entry) => entry.includes("Moc AC")));
  assert.equal(extra.pdfFacts[0].value, "15 kW");
  assert.equal(extra.parameters.find(({ name }) => name === "ZNAMIONOWA MOC WYJSCIOWA AC").raw, "5KW");
});
