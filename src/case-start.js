// UI categories map to the technical scenarios supported by selection.js.
export const scenarioKinds = {
  compensation: ['compensator'],
  storage: ['storage'],
  inverter: ['inverter'],
  'compensation-inverter': ['compensator', 'inverter'],
  'compensation-storage': ['compensator', 'storage'],
  'storage-inverter': ['storage', 'inverter'],
  combined: ['compensator', 'storage', 'inverter'],
};

export function scenarioFor(kinds = []) {
  return Object.keys(scenarioKinds).find(id =>
    kinds.length === scenarioKinds[id].length && scenarioKinds[id].every(kind => kinds.includes(kind))) ?? null;
}

export function hasQuickData(start) {
  return start && (start.kinds?.length > 0 || Object.entries(start).some(([key,value]) =>
    key !== 'kinds' && String(value ?? '').trim() !== ''));
}

const technicalValues = {acPowerKw: 'inverter', capacityKwh: 'storage'};

export function startFromIntake(scenario, {inputs, progress}) {
  const kinds = scenarioKinds[scenario] ?? [];
  const start = {...progress.quick, kinds: [...kinds],
    billTotal: progress.invoice?.billTotal ?? '', reactiveFee: progress.invoice?.reactiveFee ?? '',
    siteInverters: progress.siteInverters ?? '', inverterModel: progress.quick?.inverterModel ?? ''};
  for (const [key, kind] of Object.entries(technicalValues)) {
    if (kinds.includes(kind)) start[key] = String(inputs[key]?.value ?? '');
  }
  return start;
}

// A changed requirement needs its own source. Different decimal spellings preserve the same value.
export function mergeStartInputs(previous, start) {
  const inputs = {...previous};
  for (const [key, kind] of Object.entries(technicalValues)) {
    if (!start.kinds.includes(kind)) continue;
    const value = String(start[key] ?? '').trim();
    if (!value) { delete inputs[key]; continue; }
    const before = String(inputs[key]?.value ?? '').trim();
    const equal = before !== '' && Number(before.replace(',', '.')) === Number(value.replace(',', '.'));
    inputs[key] = {value, source: equal ? inputs[key].source : ''};
  }
  return inputs;
}
