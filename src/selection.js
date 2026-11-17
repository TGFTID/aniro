export const SELECTION_RULES_VERSION = 1;

export const SCENARIOS = [
  { id: "compensation", label: "Kompensacja mocy biernej", description: "Porównaj kompensatory na podstawie wymagań z pomiarów." },
  { id: "storage", label: "Magazyn energii", description: "Porównaj pojemność i znamionową moc baterii." },
  { id: "inverter", label: "Falownik", description: "Porównaj znamionową moc AC i napięcie wyjściowe falownika." },
  { id: "storage-inverter", label: "Magazyn i falownik", description: "Porównaj urządzenia oraz udokumentowany zakres współpracy." },
  { id: "combined", label: "Rozwiązanie łączone", description: "Sprawdź wymagania dla kompensatora, magazynu i falownika." },
];

const groupsByScenario = {
  compensation: ["compensator"],
  storage: ["storage"],
  inverter: ["inverter"],
  "storage-inverter": ["storage", "inverter"],
  combined: ["compensator", "storage", "inverter"],
};

const option = (value, label) => ({ value, label });
const numericField = (id, label, unit, hint) => ({ id, label, unit, hint, type: "number", required: true, min: 0 });
const selectField = (id, label, options, hint) => ({ id, label, options, hint, type: "select", required: true });

const compensationFields = [
  numericField("reactivePowerKvar", "Wymagana moc kompensacji", "kvar", "Podaj moc ustaloną przez osobę analizującą pomiary. Potwierdź profil i warunki pomiaru w źródle."),
  selectField("reactiveDirection", "Rodzaj mocy biernej", [
    option("inductive", "Indukcyjna"), option("capacitive", "Pojemnościowa"), option("both", "Indukcyjna i pojemnościowa"),
  ], "Rodzaj powinien wynikać z pomiarów lub projektu."),
  numericField("compVoltageV", "Znamionowe napięcie sieci dla kompensacji", "V", "Dla instalacji trójfazowej podaj wartość międzyfazową."),
  selectField("gridConnection", "Układ przewodów", [
    option("3P/4W", "Trójfazowy, 4 przewody (3P/4W)"),
    option("3P/3W", "Trójfazowy, 3 przewody (3P/3W)"),
    option("1P/2W", "Jednofazowy, 2 przewody (1P/2W)"),
  ], "Podaj konfigurację potwierdzoną w dokumentacji instalacji."),
  selectField("harmonicsRequired", "Czy wymagana jest filtracja harmonicznych?", [
    option("no", "Nie"), option("yes", "Tak"),
  ], "Decyzja powinna wynikać z analizy jakości energii."),
  { id: "harmonics", label: "Wymagane rzędy harmonicznych", type: "harmonics", required: true,
    when: { id: "harmonicsRequired", value: "yes" }, hint: "Wpisz całkowite rzędy harmonicznych rozdzielone przecinkami, np. 3, 5, 7." },
];

const storageFields = [
  numericField("capacityKwh", "Minimalna pojemność magazynu", "kWh", "Podaj wartość przyjętą w projekcie."),
  selectField("capacityBasis", "Rodzaj pojemności", [
    option("nominal", "Znamionowa"), option("usable", "Użytkowa"),
  ], "Pojemność porównamy z tym samym rodzajem pojemności w źródłach produktu."),
  numericField("storagePowerKw", "Minimalna znamionowa moc ładowania i rozładowania", "kW", "Podaj moc po stronie baterii, wynikającą z projektu lub z profilu pracy."),
];

const inverterFields = [
  numericField("acPowerKw", "Minimalna znamionowa moc wyjściowa AC", "kW", "Podaj wymaganą moc czynną pojedynczego falownika."),
  numericField("inverterVoltageV", "Znamionowe napięcie AC dla falownika", "V", "Dla instalacji trójfazowej podaj wartość międzyfazową."),
];

const inverterUses = [
  option("hybrid", "Hybrydowy"), option("storage", "Do magazynu energii"), option("grid", "Sieciowy (on-grid)"),
];

const checklistByGroup = {
  compensator: [
    "Potwierdź reprezentatywny profil mocy biernej i harmoniczne. Dobierz sposób pomiaru, przekładniki, zabezpieczenia i warunki montażu.",
    "Potwierdź zdolność kompensacji przy wymaganym napięciu, obciążeniu i jednoczesnej filtracji. Porównanie katalogowe dotyczy pojedynczego urządzenia.",
  ],
  storage: [
    "Potwierdź pojemność dostępną w rzeczywistych warunkach, temperaturę, SOC oraz dopuszczalną moc ładowania i rozładowania.",
    "Sprawdź BMS, wariant, ograniczenia łączenia, zabezpieczenia, wymagania montażowe i zakres dostawy.",
  ],
  inverter: [
    "Potwierdź konfigurację AC i warunki pracy. Jeśli urządzenie obsługuje PV, sprawdź osobno MPPT, prąd wejścia i prąd zwarciowy.",
    "Sprawdź wymagane certyfikaty, funkcje sterowania, limity mocy, wyposażenie, zabezpieczenia i zgodność wersji.",
  ],
};

function groupsFor(scenario) {
  if (!Object.hasOwn(groupsByScenario, scenario)) throw new Error("Nieznany scenariusz doboru Aniro.");
  return groupsByScenario[scenario];
}

export function getInputFields(scenario) {
  const groups = groupsFor(scenario);
  const fields = [];
  if (groups.includes("compensator")) fields.push(...compensationFields);
  if (groups.includes("storage")) fields.push(...storageFields);
  if (groups.includes("inverter")) {
    const options = groups.includes("storage") ? inverterUses.slice(0, 2) : inverterUses;
    fields.push(...inverterFields, selectField("inverterUse", "Rodzaj falownika", options, "Wybierz funkcję, którą ma pełnić falownik w projekcie."));
  }
  return fields;
}

function numericValue(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string" || !/^\d+(?:[,.]\d+)?$/.test(raw.trim())) return null;
  const value = Number(raw.trim().replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function harmonicRanks(raw) {
  const values = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.trim().split(/[\s,;]+/) : [];
  const harmonics = values.map(numericValue);
  return harmonics.length && harmonics.every((value) => Number.isSafeInteger(value) && value >= 2)
    ? [...new Set(harmonics)].sort((a, b) => a - b) : null;
}

function normalizeInputs(scenario, inputs) {
  const values = {};
  const missingInputs = [];
  for (const field of getInputFields(scenario)) {
    if (field.when && values[field.when.id]?.value !== field.when.value) continue;
    const raw = inputs?.[field.id]?.value;
    const source = typeof inputs?.[field.id]?.source === "string" ? inputs[field.id].source.trim() : "";
    let value = null;
    let invalid = "Uzupełnij wartość.";
    if (field.type === "number") {
      const parsed = numericValue(raw);
      if (parsed !== null && parsed > field.min) value = parsed;
      if (raw !== "" && raw != null) invalid = "Wpisz poprawną liczbę większą niż " + field.min + " " + field.unit + ".";
    } else if (field.type === "harmonics") {
      value = harmonicRanks(raw);
      invalid = "Wpisz rzędy harmonicznych jako liczby całkowite od 2.";
    } else if (field.options.some(({ value: possible }) => possible === raw)) {
      value = raw;
    }
    if (field.required && (value === null || !source)) {
      missingInputs.push({ id: field.id, label: field.label, reason: value === null ? invalid : "Podaj źródło danych lub decyzji." });
    }
    if (value !== null) values[field.id] = { value, source };
  }
  return { values, missingInputs };
}

const renderNumber = (value) => String(value).replace(".", ",");
const format = (value, unit) => renderNumber(value) + " " + unit;

function compare(product, key, label, condition, explanation, missingMessage) {
  const fact = product.facts?.[key];
  if (fact?.status === "conflict") {
    return { field: key, label, status: "manual", reason: "Źródła podają rozbieżne dane. Sprawdź parametr z Aniro.", source: fact.source ?? null };
  }
  if (fact?.value === undefined || !fact.source) {
    return { field: key, label, status: "manual", reason: missingMessage ?? "Brak jednoznacznej wartości w powiązanym źródle.", source: null };
  }
  const matches = condition(fact.value);
  return {
    field: key, label, status: matches ? "matches" : "fails",
    reason: explanation(fact.value, matches), source: fact.source, sourceLabel: fact.label, raw: fact.raw,
  };
}

function minimum(product, key, label, need, unit) {
  return compare(product, key, label, (rated) => rated >= need, (rated, matches) =>
    "Wymagane ≥ " + format(need, unit) + ". Źródło podaje " + format(rated, unit)
      + (matches ? " – spełnia próg liczbowy." : " – poniżej wymaganego progu."));
}

function documentedRange(product, key, label, need, unit, missingMessage) {
  return compare(product, key, label, ({ min, max }) => need >= min && need <= max, ({ min, max }, matches) =>
    "Wymagane " + format(need, unit) + ". Zakres w źródle " + renderNumber(min) + "–" + format(max, unit)
    + (matches ? " – wartość w granicach." : " – wartość poza granicami."), missingMessage);
}

function compensatorChecks(product, values) {
  const power = values.reactivePowerKvar.value;
  const voltage = values.compVoltageV.value;
  const wiring = values.gridConnection.value;
  const direction = values.reactiveDirection.value;
  const directionLabel = compensationFields[1].options.find(({ value }) => value === direction).label;
  const checks = [
    minimum(product, "ratedReactivePowerKvar", "Znamionowa moc bierna", power, "kvar"),
    documentedRange(product, "reactivePowerRangeKvar", "Zakres zmniejszenia mocy biernej", power, "kvar",
      "Brak porównywalnej dolnej i górnej granicy zmniejszenia mocy biernej. Potwierdź zakres regulacji."),
    compare(product, "nominalCompVoltageV", "Znamionowe napięcie", (rated) => rated === voltage, (rated, matches) =>
      "Obiekt " + format(voltage, "V") + ", urządzenie " + format(rated, "V")
        + (matches ? " – wartości znamionowe są zgodne." : " – różne napięcia znamionowe.")),
    documentedRange(product, "supplyVoltageV", "Zakres napięcia zasilającego", voltage, "V",
      "Brak przedziału napięcia zasilającego do porównania. Potwierdź warunki pracy."),
    compare(product, "gridConnection", "Układ przewodów", (specified) => specified === wiring, (specified, matches) =>
      "Obiekt " + wiring + ", urządzenie " + specified + (matches ? " – układy zgodne." : " – różne układy.")),
    compare(product, "reactiveDirection", "Rodzaj kompensowanej mocy biernej", (supported) => supported.includes(direction), () =>
      "Wymaganie „" + directionLabel.toLowerCase() + "”. Opis podaje kompensację mocy indukcyjnej i pojemnościowej."),
  ];
  if (values.harmonicsRequired.value === "yes") {
    const needed = values.harmonics.value;
    checks.push(compare(product, "harmonics", "Rzędy harmonicznych", (supported) => needed.every((rank) => supported.includes(rank)),
      (supported) => "Wymagane " + needed.join(", ") + ". " + (supported.length
        ? "Źródło wymienia " + supported.join(", ") + "." : "Źródło podaje brak funkcji filtracji."),
      "Brak jednoznacznej listy rzędów harmonicznych. Potwierdź je w karcie modelu."));
  }
  return checks;
}

function storageChecks(product, values) {
  const usable = values.capacityBasis.value === "usable";
  return [
    minimum(product, usable ? "usableCapacityKwh" : "nominalCapacityKwh",
      usable ? "Pojemność użytkowa" : "Pojemność znamionowa", values.capacityKwh.value, "kWh"),
    minimum(product, "nominalChargeDischargePowerKw", "Znamionowa moc ładowania i rozładowania", values.storagePowerKw.value, "kW"),
  ];
}

function inverterChecks(product, values) {
  const voltage = values.inverterVoltageV.value;
  const use = values.inverterUse.value;
  return [
    { field: "inverterUse", label: "Rodzaj falownika", status: product.subtype === use ? "matches" : "fails",
      reason: "Kategoria katalogowa: " + (product.category[2] ?? "brak") + ".", source: product.source.url ?? null },
    minimum(product, "nominalAcPowerKw", "Znamionowa moc wyjściowa AC", values.acPowerKw.value, "kW"),
    compare(product, "nominalAcVoltageV", "Znamionowe napięcie wyjściowe AC", (supported) => supported.includes(voltage), (supported, matches) =>
      "Obiekt " + format(voltage, "V") + ", urządzenie " + supported.map(renderNumber).join(" / ") + " V AC"
        + (matches ? " – napięcie występuje w wykazie." : " – napięcia brak w wykazie."),
    "Brak porównywalnego napięcia AC z potwierdzonym odniesieniem międzyfazowym."),
  ];
}

const checksByGroup = { compensator: compensatorChecks, storage: storageChecks, inverter: inverterChecks };

export function getAccessoryOptions(product, catalog) {
  const ids = new Set((product.associatedProducts ?? []).map(({ id }) => id));
  return [...ids].map((id) => catalog.byId[id]).filter((item) => item?.kind === "accessory").map((accessory) => ({
    product: accessory,
    status: "manual",
    source: product.source.url ?? null,
    reason: "Powiązanie w katalogu. Potwierdź zgodność, potrzebę, wariant i ilość w projekcie.",
  }));
}

export function evaluateCompatibility(storage, inverter, catalog) {
  if (storage.kind !== "storage" || inverter.kind !== "inverter") throw new Error("Do oceny zgodności wymagany jest magazyn i falownik.");
  const ids = [storage.id, inverter.id];
  const matches = (catalog.compatibilityPairs ?? []).filter((pair) => pair.ids?.length === 2
    && ids.every((id) => pair.ids.includes(id)) && pair.source && pair.scope);
  const supported = matches.filter(({ status }) => status === undefined || status === "documented" || status === "confirmed");
  const excluded = matches.filter(({ status }) => status === "incompatible");
  const denial = inverter.facts?.batterySupported?.value === false && inverter.facts.batterySupported.source;
  if (supported.length && (excluded.length || denial)) {
    return { ids, status: "manual", source: [...matches.map((pair) => pair.source), ...(denial ? [denial] : [])].join(" · "),
      scope: "Sprzeczne źródła", reason: "Źródła podają zarówno współpracę, jak i informację ją wykluczającą. Uzgodnij z Aniro." };
  }
  if (excluded.length || denial) {
    const entry = excluded[0];
    return { ids, status: "incompatible", source: entry?.source ?? denial, scope: entry?.scope ?? "Funkcja współpracy z magazynem",
      reason: entry?.reason ?? "Źródło potwierdza brak współpracy w podanym zakresie." };
  }
  if (supported.length) {
    return { ids, status: "documented", source: supported.map((pair) => pair.source).join(" · "),
      scope: supported.map((pair) => pair.scope).join(" · "),
      reason: "Dokumentacja wymienia parę w tym zakresie. Potwierdź wariant, wersję, konfigurację i ograniczenia." };
  }
  return { ids, status: "manual", source: null, scope: "Para magazyn–falownik",
    reason: "Brak dokumentu wiążącego te dwa modele. Potwierdź zgodność u producenta." };
}

export function selectProducts(scenario, inputs, catalog) {
  const kinds = groupsFor(scenario);
  const { values, missingInputs } = normalizeInputs(scenario, inputs);
  const checklist = kinds.flatMap((kind) => checklistByGroup[kind]);
  const hasPair = kinds.includes("storage") && kinds.includes("inverter");
  if (hasPair) checklist.push("Potwierdź zgodność dokładnych modeli, oprogramowania, BMS, napięć i komunikacji. Ustal ilości i wyposażenie na podstawie projektu.");
  if (scenario === "combined") checklist.push("Zweryfikuj współpracę kompensatora z układem magazyn–falownik w projekcie instalacji.");
  if (missingInputs.length) {
    return { status: "missing-input", selectionRulesVersion: SELECTION_RULES_VERSION, missingInputs,
      inputs: values, groups: [], compatibility: [], checklist };
  }

  const priority = { matches: 0, manual: 1, fails: 2 };
  const groups = kinds.map((kind) => {
    const candidates = catalog.products.filter((product) => product.kind === kind).map((product) => {
      const checks = checksByGroup[kind](product, values);
      const status = checks.some((check) => check.status === "fails") ? "fails"
        : checks.some((check) => check.status === "manual") ? "manual" : "matches";
      return { product, status, checks };
    });
    candidates.sort((a, b) => priority[a.status] - priority[b.status]);
    return { kind, candidates };
  });
  const compatibility = [];
  if (hasPair) {
    const eligible = (kind) => groups.find((group) => group.kind === kind).candidates.filter(({ status }) => status !== "fails");
    const inverters = eligible("inverter");
    for (const { product: storage } of eligible("storage")) {
      for (const { product: inverter } of inverters) compatibility.push(evaluateCompatibility(storage, inverter, catalog));
    }
    compatibility.sort((a, b) => (a.status === "documented" ? 0 : 1) - (b.status === "documented" ? 0 : 1));
  }
  return { status: "review-required", selectionRulesVersion: SELECTION_RULES_VERSION, missingInputs,
    inputs: values, groups, compatibility, checklist };
}
