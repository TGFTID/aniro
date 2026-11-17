import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCatalog } from "../src/catalog.js";
import { evaluateCompatibility, getAccessoryOptions, getInputFields, selectProducts } from "../src/selection.js";
import * as evidence from "../src/evidence.js";

const snapshot = JSON.parse(readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"));
const catalog = buildCatalog(snapshot, evidence);
const cabinetId = "66b1c72d59692e0012397b2a";
const sunessId = "668cd86e59692e0012d57173";
const oasisId = "662a3c0459692e0012ad9e81";
const isunaId = "662a3c0459692e0012ad9e2a";
const comp = { reactivePowerKvar: 30, reactiveDirection: "both", compVoltageV: 400, gridConnection: "3P/4W", harmonicsRequired: "no" };
const storage = { capacityKwh: 4.5, capacityBasis: "usable", storagePowerKw: 2.5 };
const inverter = { acPowerKw: 20, inverterVoltageV: 400, inverterUse: "hybrid" };
const withSources = (values) => Object.fromEntries(Object.entries(values)
  .map(([key, value]) => [key, { value, source: "Projekt testowy, s. 1" }]));
const candidate = (result, id) => result.groups.flatMap(({ candidates }) => candidates).find(({ product }) => product.id === id);
const check = (result, id, field) => candidate(result, id).checks.find((entry) => entry.field === field);

test("brak źródła, zero, niedozwolony typ i brak harmonicznych blokują dobór", () => {
  const inputs = withSources({ ...comp, reactivePowerKvar: 0, harmonicsRequired: "yes" });
  inputs.compVoltageV.source = " ";
  const result = selectProducts("compensation", inputs, catalog);
  assert.equal(result.status, "missing-input");
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.compatibility, []);
  assert.deepEqual(result.missingInputs.map(({ id }) => id), ["reactivePowerKvar", "compVoltageV", "harmonics"]);

  const paired = selectProducts("storage-inverter", withSources({ ...storage, ...inverter, inverterUse: "grid" }), catalog);
  assert.equal(paired.status, "missing-input");
  assert.deepEqual(paired.missingInputs.map(({ id }) => id), ["inverterUse"]);
  assert.equal(getInputFields("storage").some((field) => field.id === "acPowerKw"), false);
  assert.equal(getInputFields("inverter").some((field) => field.id === "capacityKwh"), false);
});

test("dolna i górna granica mocy biernej w źródle są włączne", () => {
  for (const [power, range, rated] of [
    ["0,099", "fails", "matches"], ["0,1", "matches", "matches"],
    [100, "matches", "matches"], ["100,001", "fails", "fails"],
  ]) {
    const result = selectProducts("compensation", withSources({ ...comp, reactivePowerKvar: power }), catalog);
    assert.equal(check(result, cabinetId, "reactivePowerRangeKvar").status, range);
    assert.equal(check(result, cabinetId, "ratedReactivePowerKvar").status, rated);
  }
});

test("sprzeczne harmoniczne i brak opisu kierują do sprawdzenia, a akcesoria nie są kandydatami", () => {
  const result = selectProducts("compensation", withSources({ ...comp, harmonicsRequired: "yes", harmonics: "3, 13" }), catalog);
  assert.equal(result.status, "review-required");
  assert.equal(candidate(result, cabinetId).status, "manual");
  assert.equal(check(result, cabinetId, "harmonics").status, "manual");
  assert.equal(check(result, "675703c76e8d310013284e9f", "reactiveDirection").status, "manual");
  assert.equal(candidate(result, "63a1642bdc00d2001a99d71c"), undefined);
  assert.equal(result.groups[0].candidates.length, 55);
});

test("powiązanie katalogowe udostępnia akcesorium do ręcznej weryfikacji", () => {
  const unit = catalog.products.find(({ model }) => model === "SVG 3 SINEXCEL");
  const accessories = getAccessoryOptions(unit, catalog);
  assert.deepEqual(accessories.map(({ product, status }) => [product.id, status]), [["63a1642bdc00d2001a99d71c", "manual"]]);
  assert.equal(accessories[0].source, unit.source.url);
  assert.equal("quantity" in accessories[0], false);
});

test("siedem odwołań bez kart pozostaje widocznymi identyfikatorami poza zestawieniem", () => {
  const unit = catalog.byId["65576b5bfb92ae00136075d0"];
  const unresolved = getAccessoryOptions(unit, catalog).filter(({ status }) => status === "outside-catalog");
  assert.deepEqual(unresolved.map(({ id }) => id).sort(), [
    "630837351f7b55001ad48ce6", "630837351f7b55001ad48cee", "630837351f7b55001ad48cf4",
    "630837351f7b55001ad48cfa", "63a1642bdc00d2001a99d721", "63a1642bdc00d2001a99d722",
    "63a1642bdc00d2001a99d727",
  ]);
  for (const entry of unresolved) {
    assert.equal(entry.source, unit.source.url);
    assert.equal(entry.product, null);
    assert.equal("quantity" in entry, false);
    assert.match(entry.model, /^CT1 \d+A\/5A/);
  }
});

test("magazyn nie podstawia pojemności nominalnej w miejsce użytkowej ani mocy chwilowej w miejsce znamionowej", () => {
  const boundary = selectProducts("storage", withSources(storage), catalog);
  assert.equal(candidate(boundary, sunessId).status, "matches");
  assert.equal(candidate(boundary, "668cd86e59692e0012d57177").status, "manual");
  const higher = selectProducts("storage", withSources({ ...storage, capacityKwh: 4.6, storagePowerKw: 4 }), catalog);
  assert.equal(check(higher, sunessId, "usableCapacityKwh").status, "fails");
  assert.equal(check(higher, sunessId, "nominalChargeDischargePowerKw").status, "fails");
  assert.equal(check(higher, oasisId, "usableCapacityKwh").status, "manual");
});

test("oddzielne porównanie falownika opiera się na znamionowej mocy czynnej AC", () => {
  const result = selectProducts("inverter", withSources({ ...inverter, acPowerKw: 20.1 }), catalog);
  assert.equal(result.groups.length, 1);
  assert.equal(check(result, isunaId, "nominalAcPowerKw").status, "fails");
  assert.equal(check(result, isunaId, "nominalAcPowerKw").raw, "20 kW");
});

test("ISUNA 20000T porównuje napięcia międzyfazowe wymienione w karcie trybu on-grid", () => {
  const input = getInputFields("inverter").find(({ id }) => id === "inverterVoltageV");
  assert.match(input.label, /trybie sieciowym \(on-grid\)/);
  assert.match(input.hint, /off-grid\) sprawdź ręcznie/);
  const keh = catalog.products.find((product) => product.model === "SPI8K-B X2");
  for (const [inverterVoltageV, expected] of [[380, "matches"], [400, "matches"], [415, "matches"], [230, "fails"]]) {
    const result = selectProducts("inverter", withSources({ ...inverter, inverterVoltageV }), catalog);
    const voltage = check(result, isunaId, "nominalAcVoltageV");
    assert.equal(voltage.status, expected);
    assert.match(voltage.label, /trybie sieciowym \(on-grid\)/);
    assert.match(voltage.sourceLabel, /międzyfazowe on-grid/);
    assert.ok(result.checklist.some((item) => /off-grid\), sprawdź ręcznie/.test(item)));
    assert.equal(check(result, keh.id, "nominalAcVoltageV").status, "manual");
  }
});

test("współpraca modeli wymaga dokumentu lub jawnego zaprzeczenia", () => {
  const device = catalog.byId[oasisId];
  const documented = evaluateCompatibility(device, catalog.byId[isunaId], catalog);
  assert.equal(documented.status, "documented");
  assert.match(documented.source, /\.pdf/);
  assert.equal(evaluateCompatibility(catalog.byId[sunessId], catalog.byId[isunaId], catalog).status, "manual");
  const onGrid = catalog.products.find(({ subtype }) => subtype === "grid");
  assert.equal(evaluateCompatibility(device, onGrid, catalog).status, "incompatible");
  const contradictory = {
    compatibilityPairs: [...catalog.compatibilityPairs, { ids: [oasisId, isunaId], status: "incompatible",
      source: "Testowe potwierdzenie nr 2", scope: "Zakres testowy" }],
  };
  assert.equal(evaluateCompatibility(device, catalog.byId[isunaId], contradictory).status, "manual");
});

test("rozwiązanie łączone zachowuje trzy niezależne grupy i ręczny etap odbioru", () => {
  const result = selectProducts("combined", withSources({ ...comp, ...storage, capacityKwh: 60, capacityBasis: "nominal", ...inverter }), catalog);
  assert.equal(result.status, "review-required");
  assert.deepEqual(result.groups.map(({ kind }) => kind), ["compensator", "storage", "inverter"]);
  assert.equal(result.compatibility.find(({ ids }) => ids[0] === oasisId && ids[1] === isunaId)?.status, "documented");
  assert.ok(result.checklist.some((item) => item.includes("ilości")));
  assert.ok(result.checklist.some((item) => item.includes("kompensatora z układem")));
  assert.ok(result.groups.every(({ candidates }) => candidates.every((item) => !("quantity" in item))));
});
