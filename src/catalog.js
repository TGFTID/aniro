export const CATALOG_SCHEMA_VERSION = 1;

const categories = {
  ASVG: ["compensator", "module"],
  "ASVG W ZABUDOWIE SZAFOWEJ": ["compensator", "cabinet"],
  HYBRYDOWE: ["inverter", "hybrid"],
  "ON-GRID": ["inverter", "grid"],
  "DO MAGAZYNOW ENERGII": ["inverter", "storage"],
  "ZESTAWY DOMOWE": ["storage", "residential"],
  KOMERCYJNE: ["storage", "commercial"],
};

const units = new Map([
  ["KVAR", "kvar"], ["KVA", "kVA"], ["KW", "kW"], ["KWP", "kWp"], ["KWH", "kWh"],
  ["V AC", "V AC"], ["V DC", "V DC"], ["V", "V"], ["A", "A"], ["HZ", "Hz"],
  ["°C", "°C"], ["%", "%"], ["%RH", "%RH"], ["DB", "dB"], ["M", "m"], ["W", "W"],
]);

const number = /[+-]?\d+(?:[.,]\d+)?/.source;
const unit = /(?:kvar|kva|kwh|kwp|kw|v(?:[ \t]*(?:ac|dc))?|a|hz|°c|℃|%rh|%|db|m|w)/.source;
const valuePattern = new RegExp("^(<=|>=|<|>|≤|≥)?\\s*(" + number + ")\\s*(" + unit + ")?$", "i");
const rangePattern = new RegExp("^(?:OD\\s+)?(" + number + ")\\s*(" + unit + ")?\\s*(?:[-–—~]|DO)\\s*(" + number + ")\\s*(" + unit + ")?$", "i");

export function decodeDots(value) {
  return typeof value === "string" ? value.replaceAll("__DOT__", ".") : value;
}

function normalizeUnit(value) {
  return units.get(value?.toUpperCase().replace("℃", "°C").replace(/^V\s*(AC|DC)$/, "V $1")) ?? null;
}

function toNumber(value) {
  const result = Number(value.replace(",", "."));
  return Number.isFinite(result) ? result : null;
}

export function parseParameter(name, raw, source = null) {
  const displayName = decodeDots(name);
  const display = decodeDots(raw);
  const text = display == null ? "" : String(display).trim();
  const labelUnit = normalizeUnit(/\[([^\]]+)\]/.exec(displayName ?? "")?.[1]);
  const base = { name, displayName, raw, display, source, labelUnit, unit: null, kind: "text", status: "uninterpreted" };

  if (/^(?:|[-–—]|N\/D)$/i.test(text)) return { ...base, kind: "missing", status: "missing" };
  if (/^(?:TAK|NIE)$/i.test(text)) return { ...base, kind: "boolean", status: "parsed", value: text.toUpperCase() === "TAK" };

  const range = rangePattern.exec(text);
  if (range) {
    const min = toNumber(range[1]);
    const max = toNumber(range[3]);
    const minUnit = normalizeUnit(range[2]);
    const maxUnit = normalizeUnit(range[4]);
    const unit = maxUnit ?? minUnit ?? labelUnit;
    const conflict = (minUnit && maxUnit && minUnit !== maxUnit)
      || (labelUnit && unit && labelUnit !== unit);
    if (conflict || min === null || max === null || min > max) {
      return { ...base, kind: "range", status: "ambiguous", min, max, unit, minUnit, maxUnit };
    }
    return { ...base, kind: "range", status: "parsed", unit, min, max };
  }

  const scalar = valuePattern.exec(text);
  if (!scalar) return base;
  const value = toNumber(scalar[2]);
  if (value === null) return { ...base, status: "ambiguous" };
  const operator = scalar[1];
  const scalarUnit = normalizeUnit(scalar[3]) ?? labelUnit;
  const status = labelUnit && scalarUnit && labelUnit !== scalarUnit ? "ambiguous" : "parsed";
  if (operator) return { ...base, kind: "bound", status, unit: scalarUnit, value, operator };
  return { ...base, kind: "number", status, unit: scalarUnit, value };
}

function asNumbers(text) {
  if (!/^\d+(?:\s*,\s*\d+)*$/.test(text)) return null;
  return [...new Set(text.split(",").map(Number))].sort((a, b) => a - b);
}

function numberFact(parameter, unitName) {
  return parameter?.status === "parsed" && parameter.kind === "number"
    && parameter.unit === unitName && parameter.value > 0 ? parameter.value : undefined;
}

function rangeFact(parameter, unitName) {
  return parameter?.status === "parsed" && parameter.kind === "range" && parameter.unit === unitName
    ? { min: parameter.min, max: parameter.max } : undefined;
}

function acVoltageFact(parameter) {
  const volts = numberFact(parameter, "V AC");
  if (volts !== undefined) return [volts];
  if (parameter?.status === "uninterpreted" && /^380\s*\/\s*400\s*\/\s*415\s*V\s*AC$/i.test(parameter.display.trim())) {
    return [380, 400, 415];
  }
  // 230/400 V is left untouched until its conductor references are documented.
  return undefined;
}

const numericFacts = {
  ratedReactivePowerKvar: "kvar",
  nominalCapacityKwh: "kWh",
  usableCapacityKwh: "kWh",
  nominalAcPowerKw: "kW",
  nominalChargeDischargePowerKw: "kW",
};

const supportedKinds = {
  ratedReactivePowerKvar: "compensator", nominalCompVoltageV: "compensator",
  reactivePowerRangeKvar: "compensator", supplyVoltageV: "compensator",
  nominalCapacityKwh: "storage", usableCapacityKwh: "storage", nominalChargeDischargePowerKw: "storage",
  nominalAcPowerKw: "inverter", nominalAcVoltageV: "inverter",
};

function addFacts(product) {
  const facts = {};
  const parameter = (name) => {
    const values = product.parameters.filter((item) => item.name === name);
    return values.length === 1 ? values[0] : undefined;
  };
  const assign = (key, value, evidence) => {
    if (value !== undefined) facts[key] = { value, source: evidence.source, label: evidence.displayName, raw: evidence.raw };
  };
  const setNumber = (key, name, unitName) => {
    const item = parameter(name);
    assign(key, numberFact(item, unitName), item);
  };
  const setRange = (key, name, unitName) => {
    const item = parameter(name);
    assign(key, rangeFact(item, unitName), item);
  };
  if (product.kind === "storage") {
    // The unqualified capacity label doesn't establish nominal or usable energy.
    setNumber("catalogCapacityKwh", "POJEMNOSC [KWH]", "kWh");
  }
  if (product.kind === "inverter") {
    setNumber("nominalAcPowerKw", "ZNAMIONOWA MOC WYJSCIOWA AC", "kW");
    const batterySupport = parameter("FUNKCJA WSPOLPRACY Z MAGAZYNEM ENERGI");
    if (batterySupport?.kind === "boolean" && batterySupport.status === "parsed") {
      assign("batterySupported", batterySupport.value, batterySupport);
    }
    const voltage = parameter("ZNAMIONOWE NAPIECIE WYJSCIOWE AC");
    assign("nominalAcVoltageV", acVoltageFact(voltage), voltage);
  }
  if (product.kind === "compensator") {
    setNumber("ratedReactivePowerKvar", "MOC ZNAMIONOWA", "kvar");
    setNumber("nominalCompVoltageV", "NAPIECIE ZNAMIONOWE", "V");
    setRange("reactivePowerRangeKvar", "ZMNIEJSZENIE MOCY BIERNEJ [KVAR] OD…DO…", "kvar");
    setRange("supplyVoltageV", "ZAKRES NAPIECIA ZASILAJACEGO [V]", "V");
    const topology = parameter("TYP PRACY");
    if (topology?.status === "uninterpreted" && /^(?:3P\/4W|3P\/3W|1P\/2W)$/i.test(topology.display.trim())) {
      assign("gridConnection", topology.display.trim().toUpperCase(), topology);
    }
    const directions = product.description?.match(/\bINDUKCYJNEJ(?:\s*,\s*JAK)?\s+I\s+POJEMNOSCIOWEJ\b/);
    if (directions) {
      assign("reactiveDirection", ["inductive", "capacitive", "both"], {
        source: product.source.url, displayName: "Opis kompensacji mocy biernej", raw: directions[0],
      });
    }
    const harmonicList = parameter("HARMONICZNE KOMPENSOWANE");
    const harmonicCapability = parameter("KOMPENSACJA HARMONICZNYCH");
    const listed = asNumbers(harmonicList?.display?.trim() ?? "");
    const explicitLists = [...(product.description ?? "").matchAll(
      /HARMONICZN\w*\s*\(?\s*(\d+(?:\s*,\s*\d+)+)/gi,
    )].map((match) => asNumbers(match[1]));
    const blocked = harmonicList?.status === "conflict" || harmonicCapability?.status === "conflict";
    const denied = harmonicCapability?.kind === "boolean" && harmonicCapability.status === "parsed" && !harmonicCapability.value;
    const expected = listed ?? explicitLists[0];
    const disagrees = explicitLists.some((entry) => String(entry) !== String(expected)) || (denied && Boolean(expected));
    if (blocked || disagrees) {
      if (harmonicList) harmonicList.status = "conflict";
      if (disagrees && !product.conflicts.some((entry) => /harmoniczn/i.test(entry))) {
        product.conflicts.push("Sprzeczne informacje o rzędach harmonicznych między tabelą i opisem katalogowym.");
      }
      facts.harmonics = { status: "conflict", source: product.source.url };
    } else if (denied) {
      assign("harmonics", [], harmonicCapability);
    } else if (expected) {
      assign("harmonics", expected, listed ? harmonicList : {
        source: product.source.url, displayName: "Rzędy harmonicznych w opisie katalogowym", raw: expected.join(", "),
      });
    }
  }
  const confirmedPdfFacts = new Map();
  for (const entry of product.pdfFacts) {
    if (entry.status !== "confirmed" || supportedKinds[entry.field] !== product.kind || !entry.source) continue;
    const values = confirmedPdfFacts.get(entry.field) ?? [];
    values.push(entry);
    confirmedPdfFacts.set(entry.field, values);
  }
  for (const [field, entries] of confirmedPdfFacts) {
    // A typed PDF entry is admitted only with exact model identity and an unambiguous value.
    const parsed = entries.map((entry) => parseParameter(entry.label, entry.value, entry.source));
    const values = parsed.map((item) => {
      if (numericFacts[field]) return numberFact(item, numericFacts[field]);
      if (field === "nominalAcVoltageV") return acVoltageFact(item);
      if (field === "nominalCompVoltageV") return numberFact(item, "V");
      if (field === "reactivePowerRangeKvar") return rangeFact(item, "kvar");
      if (field === "supplyVoltageV") return rangeFact(item, "V");
      return undefined;
    });
    const knownValues = values.filter((value) => value !== undefined);
    const [value] = knownValues;
    if (value === undefined) continue;
    const differingEvidence = knownValues.some((other) => JSON.stringify(other) !== JSON.stringify(value));
    const catalogValue = facts[field]?.value;
    const catalogConflict = catalogValue !== undefined && JSON.stringify(catalogValue) !== JSON.stringify(value);
    if (differingEvidence || catalogConflict || facts[field]?.status === "conflict") {
      facts[field] = { status: "conflict", source: entries.map((entry) => entry.source).join(" · ") };
      product.conflicts.push("Rozbieżność źródeł dla parametru „" + entries[0].label + "”.");
    } else {
      assign(field, value, parsed[values.indexOf(value)]);
    }
  }
  return facts;
}

function productFrom(record, evidence) {
  const entry = record.category?.[2];
  const [kind, subtype] = entry === "AKCESORIA"
    ? ["accessory", record.category[1] === "KOMPENSATORY AKTYWNE" ? "compensator" : "inverter"]
    : (categories[entry] ?? []);
  if (!kind) throw new Error("Nierozpoznana kategoria Aniro dla produktu " + record.id);

  const source = { ...record.source };
  const blocked = evidence.blockedFieldsById?.[record.id] ?? [];
  const parameters = (record.parameters ?? []).map(({ name, value }) => {
    const parameter = parseParameter(name, value, source.url);
    if (blocked.includes(name)) parameter.status = "conflict";
    return parameter;
  });
  const counts = new Map();
  for (const { name } of parameters) counts.set(name, (counts.get(name) ?? 0) + 1);
  const conflicts = [...(record.quality?.conflicts ?? [])];
  for (const parameter of parameters) {
    if (blocked.includes(parameter.name)
      && !conflicts.some((entry) => /harmoniczn/i.test(entry) && /harmoniczn/i.test(parameter.displayName))) {
      conflicts.push("Pole „" + parameter.displayName + "” wymaga uzgodnienia na podstawie dokumentacji modelu.");
    }
    if (counts.get(parameter.name) > 1) {
      parameter.status = "conflict";
      const message = "Wiele wartości pod nazwą „" + parameter.displayName + "” w tabeli katalogowej.";
      if (!conflicts.includes(message)) conflicts.push(message);
    }
  }
  const missing = [];
  const description = decodeDots(record.description_source);
  if (!description?.trim()) missing.push("Katalog nie zawiera opisu produktu.");
  if (!parameters.length) missing.push("Katalog nie zawiera tabeli parametrów.");
  const product = {
    id: record.id, model: record.model, manufacturer: record.manufacturer, ean: record.ean,
    kind, subtype, category: record.category, parameters, description, descriptionRaw: record.description_source,
    priceSnapshot: record.price_snapshot ?? null, availabilitySnapshot: record.availability_snapshot ?? null,
    source, conflicts, missing, technicalReviewRequired: record.quality?.technical_review_required !== false,
    pdfFacts: evidence.pdfFactsById?.[record.id] ?? [],
    dimensionsSource: record.dimensions_source ?? null, weightSource: record.weight_source ?? null,
    associatedProducts: record.associated_products ?? [], specificationLinksSource: record.specification_links_source ?? null,
  };
  product.facts = addFacts(product);
  return product;
}

export function buildCatalog(snapshot, evidence = {}) {
  if (snapshot?.schema_version !== CATALOG_SCHEMA_VERSION || !Array.isArray(snapshot.products)
    || snapshot.count !== snapshot.products.length) {
    throw new Error("Nieprawidłowa wersja lub liczba rekordów katalogu Aniro.");
  }
  const products = snapshot.products.map((record) => productFrom(record, evidence));
  const byId = Object.create(null);
  const counts = { compensator: 0, inverter: 0, storage: 0, accessory: 0 };
  for (const product of products) {
    if (!product.id || byId[product.id]) throw new Error("Powtórzony lub pusty identyfikator produktu w katalogu Aniro.");
    byId[product.id] = product;
    counts[product.kind] += 1;
  }
  return {
    schemaVersion: snapshot.schema_version, snapshotDate: snapshot.source_snapshot_date,
    source: snapshot.source, technicalApproval: snapshot.technical_approval,
    products, byId, counts, compatibilityPairs: evidence.compatibilityPairs ?? [],
  };
}

export async function loadCatalog(evidence = {}) {
  const response = await fetch(new URL("../data/catalog.json", import.meta.url));
  if (!response.ok) throw new Error("Katalog Aniro jest niedostępny (HTTP " + response.status + ").");
  return buildCatalog(await response.json(), evidence);
}
