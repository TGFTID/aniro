import { loadCatalog } from './catalog.js';
import { SCENARIOS, getInputFields, selectProducts, getAccessoryOptions } from './selection.js';
import { quote } from './pricing.js';
import { pdfFactsById, blockedFieldsById, compatibilityPairs, sourcePdf } from './evidence.js';

const labels = {
  compensator: 'Kompensatory',
  storage: 'Magazyny energii',
  inverter: 'Falowniki',
};
const subtypes = { module: 'Modułowy', cabinet: 'Szafowy', hybrid: 'Hybrydowy', grid: 'Sieciowy', storage: 'Do magazynu', residential: 'Domowy', commercial: 'Komercyjny' };
const checkInput = {
  ratedReactivePowerKvar: 'reactivePowerKvar',
  reactivePowerRangeKvar: 'reactivePowerKvar',
  nominalCompVoltageV: 'compVoltageV',
  supplyVoltageV: 'compVoltageV',
  usableCapacityKwh: 'capacityKwh',
  nominalCapacityKwh: 'capacityKwh',
  nominalChargeDischargePowerKw: 'storagePowerKw',
  nominalAcPowerKw: 'acPowerKw',
  nominalAcVoltageV: 'inverterVoltageV',
};
const statusLabels = {
  matches: 'Zgodność z porównanymi parametrami',
  manual: 'Do ręcznej weryfikacji',
  fails: 'Poza wymaganiami',
};
const state = { catalog: null, scenario: null, inputs: {}, result: null, selected: new Map(), option: null };

const el = (id) => document.getElementById(id);
const text = (value = '') => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const amount = (value, currency) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(value);

function sourceLink(url, label) {
  try {
    const target = new URL(url);
    if (target.protocol === 'https:' && (target.hostname === 'aniro.pl' || target.hostname.endsWith('.aniro.pl'))) {
      return '<a class="source-link" href="' + text(target.href) + '" target="_blank" rel="noopener noreferrer">' + text(label) + '</a>';
    }
  } catch { /* A file or document reference can be rendered as plain text. */ }
  return '';
}

function pdfLinks(source) {
  if (typeof source !== 'string') return '';
  return source.split(/; | · /).map(sourcePdf).filter(Boolean).map(({ file, page }) =>
    '<a class="source-link" href="./evidence/' + encodeURIComponent(file) + '#page=' + page
    + '" target="_blank" rel="noopener noreferrer">' + text(file + ', s. ' + page) + '</a>'
  ).join('');
}

function productSource(product) {
  const source = product.source ?? {};
  return [
    sourceLink(source.url, 'Karta katalogowa Aniro'),
    '<p class="source-info">' + text([source.retrieved_date, source.source_record_id ?? product.id].filter(Boolean).join(' / ')) + '</p>',
  ].join('');
}

function list(values) {
  return '<ul class="inline-list">' + values.map((value) => '<li>' + text(value) + '</li>').join('') + '</ul>';
}

function updateSteps(current) {
  const actions = document.querySelectorAll('[data-step]');
  const available = [true, Boolean(state.scenario), Boolean(state.result), Boolean(getReadyOption())];
  for (const [index, action] of actions.entries()) {
    action.disabled = !available[index];
    if (index + 1 === current) action.setAttribute('aria-current', 'step');
    else action.removeAttribute('aria-current');
  }
}

function showStep(step) {
  for (const panel of document.querySelectorAll('.step')) panel.hidden = panel.id !== 'step-' + step;
  updateSteps(step);
  if (step === 4) renderScopeSummary();
  el('title-' + step).focus();
}

function currentStep() {
  return Number(document.querySelector('[data-step][aria-current="step"]').dataset.step);
}

function invalidateQuote() {
  const form = el('terms-form');
  form.elements.technical.checked = false;
  form.elements.commercial.checked = false;
  el('quote-error').hidden = true;
  el('quote').hidden = true;
  el('quote').replaceChildren();
}

function resetResults() {
  state.result = null;
  state.selected.clear();
  state.option = null;
  invalidateQuote();
  updateSteps(2);
}

function renderScenarios() {
  el('scenarios').innerHTML = SCENARIOS.map(({ id, label, description }) =>
    '<button type="button" class="choice" data-scenario="' + text(id) + '" aria-pressed="' + (id === state.scenario) + '">'
      + '<strong>' + text(label) + '</strong><small>' + text(description) + '</small></button>'
  ).join('');
}

function valueField(field, value) {
  const name = 'name="' + text(field.id) + '" id="field-' + text(field.id) + '"';
  if (field.type === 'select') {
    return '<select ' + name + '><option value="">Wybierz…</option>' + field.options.map((option) =>
      '<option value="' + text(option.value) + '"' + (String(value) === String(option.value) ? ' selected' : '') + '>'
      + text(option.label) + '</option>'
    ).join('') + '</select>';
  }
  const number = field.type === 'number';
  return '<input ' + name + ' type="' + (number ? 'number" step="any"' : 'text"')
    + (typeof field.min === 'number' ? ' min="' + field.min + '"' : '')
    + ' value="' + text(value) + '">';
}

function renderMeasurements() {
  const fields = getInputFields(state.scenario);
  el('fields').innerHTML = fields.map((field) => {
    const entered = state.inputs[field.id] ?? {};
    return '<fieldset class="measurement" data-field="' + text(field.id) + '"><legend>' + text(field.label)
      + (field.unit ? ' (' + text(field.unit) + ')' : '') + '</legend>'
      + (field.hint ? '<p class="muted">' + text(field.hint) + '</p>' : '')
      + '<div class="fields-row"><label>Wartość' + valueField(field, entered.value) + '</label>'
      + '<label>Źródło<input type="text" name="' + text(field.id) + '-source" value="' + text(entered.source) + '"></label></div></fieldset>';
  }).join('');
  el('input-errors').hidden = true;
  toggleConditionalFields();
}

function toggleConditionalFields() {
  const form = el('measurements');
  for (const field of getInputFields(state.scenario)) {
    if (!field.when) continue;
    const hidden = form.elements.namedItem(field.when.id).value !== field.when.value;
    const wrapper = form.querySelector('[data-field="' + field.id + '"]');
    wrapper.hidden = hidden;
    wrapper.disabled = hidden;
  }
}

function readMeasurements() {
  const form = el('measurements');
  const fields = getInputFields(state.scenario);
  return Object.fromEntries(fields.filter((field) =>
    !field.when || form.elements.namedItem(field.when.id).value === field.when.value
  ).map(({ id, type }) => {
    const control = form.elements.namedItem(id);
    const value = type === 'number' && control.value !== '' ? control.valueAsNumber : control.value.trim();
    return [id, { value, source: form.elements.namedItem(id + '-source').value.trim() }];
  }));
}

function printMeasurements() {
  const fields = getInputFields(state.scenario);
  return '<dl class="specs">' + fields.filter((field) => state.inputs[field.id]).map((field) => {
    const { value, source } = state.inputs[field.id];
    const displayed = field.options?.find((option) => option.value === value)?.label ?? value;
    return '<div><dt>' + text(field.label) + '</dt><dd>' + text(displayed) + (field.unit ? ' ' + text(field.unit) : '')
      + '<br><span class="meta">' + text(source) + '</span></dd></div>';
  }).join('') + '</dl>';
}

function parameterDetails(product) {
  const status = {
    missing: 'Brak w źródle',
    invalid: 'Wymaga sprawdzenia',
    unknown: 'Wartość niepotwierdzona',
    conflict: 'Rozbieżność',
    ambiguous: 'Wartość niejednoznaczna',
  };
  const params = (product.parameters ?? []).map((param) =>
    '<div><dt>' + text(param.displayName ?? param.name) + '</dt><dd>' + text((param.display ?? param.raw) || 'Brak w źródle')
      + (status[param.status] ? '<br><span class="meta">' + status[param.status] + '</span>' : '') + '</dd></div>'
  ).join('');
  return params ? '<h4>Parametry w katalogu</h4><dl class="specs">' + params + '</dl>' : '';
}

function unresolvedRequirements(lines, forOffer = false) {
  const fields = getInputFields(state.scenario);
  const requirements = lines.flatMap(({ candidate: { product, checks } }) => {
    const open = checks.filter(({ status }) => status === 'manual');
    if (!open.length && !product.conflicts?.length) return [];
    return '<section><h4>' + text(product.model) + '</h4><ul class="inline-list">'
      + open.map((check) => {
        const id = checkInput[check.field] ?? check.field;
        const input = state.inputs[id];
        const field = fields.find((entry) => entry.id === id);
        const value = field?.options?.find((option) => option.value === input?.value)?.label ?? input?.value;
        const requirement = input && field ? '<dl class="specs"><div><dt>Wymaganie obiektu</dt><dd>'
          + text(value) + (field.unit ? ' ' + text(field.unit) : '')
          + '<br><span class="meta">' + text(input.source) + '</span></dd></div></dl>' : '';
        const proof = check.source ? '<p class="source-info">' + text(check.source) + '</p>' + pdfLinks(check.source)
          : '<p class="source-info">W źródłach urządzenia brak porównywalnej wartości.</p>';
        return '<li><strong>' + text(check.label) + '</strong><p>' + text(check.reason) + '</p>' + requirement + proof + '</li>';
      }).join('')
      + (product.conflicts ?? []).map((conflict) => '<li>' + text(conflict) + '</li>').join('')
      + '</ul>' + productSource(product) + '</section>';
  });
  if (!requirements.length) return '';
  return '<div class="notice alert open-checks">'
    + (forOffer ? '<h4>Częściowa wycena wskazanych pozycji</h4>' : '')
    + '<p><strong>Spełnienie wymagań obiektu niepotwierdzone</strong></p>'
    + '<p>Poniższe kontrole wymagają weryfikacji. Źródło podane przez użytkownika odnotowujemy osobno, a wynik porównania katalogowego pozostaje otwarty.</p>'
    + requirements.join('') + '</div>';
}

function productDetails(product, checks) {
  const conflicts = product.conflicts ?? [];
  const missing = product.missing ?? [];
  const pdfFacts = (product.pdfFacts ?? []).map((fact) =>
    '<div><dt>' + text(fact.label) + '</dt><dd>' + text(fact.value)
      + (fact.status === 'requires-review' ? '<br><strong class="grade manual">Do weryfikacji</strong>' : '')
      + '<br><span class="meta source-info">' + text(fact.source) + '</span>' + pdfLinks(fact.source)
      + '</dd></div>'
  ).join('');
  return (conflicts.length ? '<div class="notice alert"><strong>Rozbieżność w źródle</strong>' + list(conflicts) + '</div>' : '')
    + '<h4>Porównanie z wymaganiami</h4>'
    + '<ul class="inline-list">' + checks.map((check) => '<li><strong>' + text(check.label) + '</strong> '
      + '<span class="grade ' + text(check.status) + '">' + text(statusLabels[check.status]) + '</span><br>' + text(check.reason)
      + (check.raw ? '<br><span class="meta">' + text([check.sourceLabel, check.raw].filter(Boolean).join(' / ')) + '</span>' : '')
      + (check.source ? '<br><span class="meta source-info">' + text(check.source) + '</span>' + pdfLinks(check.source) : '') + '</li>').join('') + '</ul>'
    + parameterDetails(product)
    + (pdfFacts ? '<h4>Udokumentowane dane techniczne</h4><dl class="specs">' + pdfFacts + '</dl>' : '')
    + (missing.length ? '<h4>Braki karty</h4>' + list(missing) : '')
    + productSource(product) + linkedAccessories(product);
}

function snapshot(product) {
  const price = product.priceSnapshot;
  const displayed = price?.value > 0 ? amount(price.value, price.currency) : 'Cena do potwierdzenia';
  const status = product.availabilitySnapshot === true ? 'Dostępny w katalogu'
    : product.availabilitySnapshot === false ? 'Niedostępny w katalogu' : 'Brak danych o dostępności';
  return '<p class="meta">Migawka ' + text(product.source?.retrieved_date ?? state.catalog.snapshotDate ?? '')
    + ' · ' + text(displayed) + ' · ' + status + '</p>';
}

function accessoryDetails(product) {
  return '<article class="variant"><h4>' + text(product.model) + '</h4>'
    + '<p class="grade manual">Akcesorium do ręcznej weryfikacji</p>' + snapshot(product)
    + (product.missing.length ? list(product.missing) : parameterDetails(product))
    + productSource(product) + '</article>';
}

function linkedAccessories(product) {
  const accessories = getAccessoryOptions(product, state.catalog);
  if (!accessories.length) return '';
  const inCatalog = accessories.filter((entry) => entry.product);
  const outside = accessories.filter((entry) => entry.status === 'outside-catalog');
  return '<h4>Powiązane akcesoria</h4>'
    + inCatalog.map((entry) =>
      '<p class="muted">' + text(entry.reason) + '</p>' + sourceLink(entry.source, 'Katalogowe powiązanie') + accessoryDetails(entry.product)
    ).join('')
    + (outside.length ? '<details class="review"><summary>Powiązania spoza migawki (' + outside.length + ')</summary>'
      + '<ul class="inline-list">' + outside.map((entry) =>
        '<li><strong>' + text(entry.model || entry.id) + '</strong><br><span class="grade manual">Poza migawką katalogu</span>'
        + '<p class="source-info">ID ' + text(entry.id) + '</p><p>' + text(entry.reason) + '</p>'
        + sourceLink(entry.source, 'Karta urządzenia nadrzędnego') + '</li>'
      ).join('') + '</ul></details>' : '');
}

function accessoryDomain(product) {
  return product.category[0] === 'KOMPENSATORY I JAKOSC ENERGII' ? 'compensation' : 'energy';
}

function renderAccessoryList(panel) {
  const domain = panel.querySelector('[data-accessory-domain]').value;
  const products = state.catalog.products.filter((product) => product.kind === 'accessory' && (!domain || accessoryDomain(product) === domain));
  panel.querySelector('[data-accessory-list]').innerHTML = products.length ? products.map(accessoryDetails).join('') : '<p>Brak akcesoriów w tej dziedzinie.</p>';
}

function renderAccessories(panel) {
  panel.innerHTML = '<details class="review"><summary>Akcesoria w katalogu</summary>'
    + '<p class="muted">Potwierdź kompatybilność i ilość potrzebną w projekcie. Akcesoria pozostają poza zestawieniem oferty.</p>'
    + '<label>Dziedzina<select data-accessory-domain><option value="">Wszystkie</option>'
    + '<option value="compensation">Kompensacja mocy biernej</option><option value="energy">Magazyny i falowniki</option>'
    + '</select></label><div data-accessory-list></div></details>';
  panel.querySelector('[data-accessory-domain]').addEventListener('input', () => renderAccessoryList(panel));
  renderAccessoryList(panel);
}

function productCard(candidate) {
  const { product, status, checks } = candidate;
  const picked = state.selected.get(product.kind)?.candidate.product.id === product.id;
  const harmonicConflict = product.conflicts?.find((conflict) => /harmoniczn/iu.test(conflict));
  const conflict = product.conflicts?.length ? '<p class="grade manual">' + text(harmonicConflict ?? 'Rozbieżność w źródle') + '</p>' : '';
  const subtitle = [product.manufacturer, subtypes[product.subtype]].filter(Boolean).join(' / ');
  return '<article class="variant" data-product="' + text(product.id) + '"><div class="variant-heading"><div>'
    + '<h4>' + text(product.model) + '</h4><p class="meta">' + text(subtitle) + '</p></div>'
    + '<p class="grade ' + text(status) + '">' + text(statusLabels[status]) + '</p></div>' + conflict
    + snapshot(product)
    + '<details><summary>Parametry i źródła</summary><div class="variant-detail">' + productDetails(product, checks) + '</div></details>'
    + (status === 'fails' ? '' : '<button type="button" data-pick="' + text(product.id) + '" aria-pressed="' + picked + '">'
      + (picked ? 'Usuń z zestawienia' : 'Wskaż wariant') + '</button>') + '</article>';
}

function renderCandidateGroups() {
  const query = el('find-model').value.trim().toLocaleLowerCase('pl-PL');
  const wantedStatus = el('find-status').value;
  el('groups').innerHTML = state.result.groups.map(({ kind, candidates }) => {
    const filtered = candidates.filter(({ product, status }) =>
      (!wantedStatus || wantedStatus === status) && (!query || [product.model, product.manufacturer, product.id]
        .some((value) => String(value ?? '').toLocaleLowerCase('pl-PL').includes(query)))
    );
    const visible = filtered.filter(({ status }) => status !== 'fails');
    const excluded = filtered.filter(({ status }) => status === 'fails');
    return '<section class="variants"><h3>' + text(labels[kind]) + '</h3>'
      + (!filtered.length ? '<p class="muted">Brak pozycji dla wybranych filtrów.</p>' : '')
      + visible.slice(0, 4).map(productCard).join('')
      + (visible.length > 4 ? '<details class="review"><summary>Pokaż pozostałe modele ('
        + (visible.length - 4) + ')</summary>' + visible.slice(4).map(productCard).join('') + '</details>' : '')
      + (excluded.length ? '<details class="review"' + (wantedStatus === 'fails' || query ? ' open' : '') + '><summary>Poza wymaganiami ('
        + excluded.length + ')</summary>' + excluded.map(productCard).join('') + '</details>' : '') + '</section>';
  }).join('');
}

function renderResults() {
  const { checklist } = state.result;
  el('results').innerHTML = '<details class="review"><summary>Dane użyte do porównania</summary>' + printMeasurements() + '</details>'
    + '<div class="notice"><strong>Wynik roboczy</strong><p>Porównanie katalogowe wymaga przeglądu technicznego. Ilości i pozycje wskaż samodzielnie.</p></div>'
    + (checklist.length ? '<details class="review" open><summary>Checklista weryfikacji technicznej</summary>' + list(checklist) + '</details>' : '')
    + '<a id="selection-jump" href="#selected" class="source-link" hidden>Przejdź do wskazanych pozycji</a>'
    + '<div class="columns"><label>Znajdź model<input type="search" id="find-model" placeholder="Model lub producent"></label>'
    + '<label>Wynik porównania<select id="find-status"><option value="">Wszystkie</option>'
    + Object.entries(statusLabels).map(([id, label]) => '<option value="' + id + '">' + text(label) + '</option>').join('')
    + '</select></label></div><div id="groups"></div><div id="results-accessories"></div>';
  renderCandidateGroups();
  renderAccessories(el('results-accessories'));
  renderSelected();
}

function findCandidate(id) {
  return state.result.groups.flatMap((group) => group.candidates).find(({ product }) => product.id === id);
}

function matchPair() {
  const storage = state.selected.get('storage')?.candidate.product.id;
  const inverter = state.selected.get('inverter')?.candidate.product.id;
  if (!storage || !inverter) return null;
  return state.result.compatibility.find(({ ids }) => ids.includes(storage) && ids.includes(inverter)) ?? {
    status: 'manual', reason: 'W źródłach katalogu brak potwierdzenia zgodności tych modeli.', scope: '',
  };
}

function makeOfferOptions() {
  const pair = matchPair();
  const entries = [...state.selected.entries()];
  if (pair?.status === 'documented') {
    return [
      ...entries.filter(([kind]) => kind === 'compensator').map(([kind, line]) => ({ id: kind, lines: [line] })),
      { id: 'storage-inverter', lines: entries.filter(([kind]) => kind !== 'compensator').map(([, line]) => line), pair },
    ];
  }
  return entries.map(([kind, line]) => ({ id: kind, lines: [line] }));
}

function optionLabel(option) {
  return option.lines.map(({ candidate }) => candidate.product.model).join(' + ');
}

function lineNeedsReview(line) {
  return line.candidate.status === 'manual' || (line.candidate.product.conflicts?.length ?? 0) > 0;
}

function lineComplete(line) {
  return Number.isSafeInteger(Number(line.quantity)) && Number(line.quantity) > 0 && line.quantitySource.trim()
    && (!lineNeedsReview(line) || line.technicalSource.trim());
}

function chosenOption() {
  const options = makeOfferOptions();
  return options.length === 1 ? options[0] : options.find(({ id }) => id === state.option);
}

function exceedsPairScope(option) {
  return option?.pair && option.lines.some(({ quantity }) => Number(quantity) > 1);
}

function needsPrice(option) {
  return option?.lines.find(({ candidate: { product } }) => !(product.priceSnapshot?.value > 0));
}

function getReadyOption() {
  const chosen = chosenOption();
  return chosen && chosen.lines.every(lineComplete) && !exceedsPairScope(chosen) && !needsPrice(chosen) ? chosen : null;
}

function renderPickedLine(kind, line) {
  const product = line.candidate.product;
  return '<article class="selected-line"><h4>' + text(product.model) + '</h4>'
    + snapshot(product) + productSource(product)
    + '<div class="form-grid"><div class="columns"><label>Ilość (szt.)<input type="number" min="1" step="1" data-line="' + kind + '" data-property="quantity" value="' + text(line.quantity) + '"></label>'
    + '<label>Podstawa ilości<input type="text" data-line="' + kind + '" data-property="quantitySource" value="' + text(line.quantitySource) + '"></label></div>'
    + (lineNeedsReview(line) ? '<label>Źródło weryfikacji technicznej<input type="text" data-line="' + kind + '" data-property="technicalSource" value="'
      + text(line.technicalSource) + '"></label>' : '') + '</div></article>';
}

function showPair(pair) {
  if (!pair) return '';
  const titles = { documented: 'Zgodność pary udokumentowana', manual: 'Zgodność pary niepotwierdzona', incompatible: 'Para niezgodna' };
  return '<div class="notice' + (pair.status === 'documented' ? '' : ' alert') + '"><strong>' + titles[pair.status] + '</strong>'
    + '<p>' + text(pair.reason) + '</p>'
    + (pair.status === 'documented' ? '<p>Zakres dokumentu obejmuje modele. Moc, pojemność i konfiguracja obiektu wymagają osobnego sprawdzenia.</p>' : '')
    + (pair.scope ? '<p>' + text(pair.scope) + '</p>' : '')
    + (pair.source ? '<p class="source-info">' + text(pair.source) + '</p>' : '') + pdfLinks(pair.source) + '</div>';
}

function renderSelected() {
  const area = el('selected');
  el('selection-jump').hidden = !state.selected.size;
  if (!state.selected.size) {
    area.innerHTML = '<h3>Wskazane pozycje</h3><p class="muted">Wybierz model, aby wpisać ilość i jej podstawę.</p>';
    updateSelectionStatus();
    return;
  }
  const options = makeOfferOptions();
  const pair = matchPair();
  area.innerHTML = '<h3>Wskazane pozycje</h3>' + showPair(pair)
    + unresolvedRequirements([...state.selected.values()])
    + [...state.selected.entries()].map(([kind, line]) => renderPickedLine(kind, line)).join('')
    + (options.length > 1 ? '<fieldset class="measurement"><legend>Wariant do oferty</legend>'
      + '<p class="muted">Pozycje tworzą rozłączne warianty. Wybierz jeden do rozliczenia.</p>'
      + options.map((option) => '<div class="confirm option"><label><input type="radio" name="offer-option" value="' + text(option.id) + '"'
        + (state.option === option.id ? ' checked' : '') + '> ' + text(optionLabel(option)) + '</label></div>').join('')
      + '</fieldset>' : '');
  updateSelectionStatus();
}

function updateSelectionStatus() {
  const ready = Boolean(getReadyOption());
  el('go-terms').disabled = !ready;
  const note = el('selection-status');
  note.hidden = !state.selected.size || ready;
  if (!note.hidden) {
    const options = makeOfferOptions();
    const option = chosenOption();
    const unpriced = needsPrice(option);
    if (unpriced) {
      note.textContent = unpriced.candidate.product.model + ' ma niepotwierdzoną cenę. Do wyceny potrzebna jest dodatnia cena. Możesz pobrać dane robocze.';
    } else if (exceedsPairScope(option)) {
      note.textContent = 'Dokumentacja pary pozwala wycenić po jednej sztuce każdego modelu. Układ wielosztukowy wymaga osobnej weryfikacji projektu.';
    } else note.textContent = options.length > 1 && !state.option
      ? 'Wskaż wariant i uzupełnij ilość wraz z podstawą każdej pozycji oferty.'
      : 'Uzupełnij poprawną ilość, jej podstawę i wymagane źródło weryfikacji.';
  }
  updateSteps(currentStep());
}

function renderScopeSummary() {
  const option = getReadyOption();
  if (!option) return;
  el('scope-summary').innerHTML = '<p>Zakres kalkulacji obejmuje wskazane pozycje. Ceny i dostępność pochodzą z datowanej migawki katalogu.</p>'
    + unresolvedRequirements(option.lines, true) + '<div class="review"><h3>Wariant do wyceny</h3>' + offerLines(option)
    + showPair(option.pair) + '<details><summary>Pomiary i źródła</summary>' + printMeasurements() + '</details></div>';
}

function offerLines(option) {
  return option.lines.map((line) => {
    const { product, checks } = line.candidate;
    return '<article class="selected-line"><h4>' + text(product.model) + '</h4>'
      + '<p>Ilość ' + text(line.quantity) + ' szt. <br>Podstawa ilości: ' + text(line.quantitySource) + '</p>'
      + (line.technicalSource ? '<p>Źródło weryfikacji: ' + text(line.technicalSource) + '</p>' : '')
      + snapshot(product) + productSource(product)
      + '<details><summary>Parametry i dowody</summary><div class="variant-detail">' + productDetails(product, checks) + '</div></details></article>';
  }).join('');
}

function readTerms(form) {
  const fields = new FormData(form);
  return {
    vatRate: fields.get('vatRate'),
    discountRate: fields.get('discountRate'),
    labour: fields.get('labour'),
    transport: fields.get('transport'),
    extrasCurrency: fields.get('extrasCurrency'),
    priceBasis: fields.get('priceBasis'),
    commercialSource: fields.get('commercialSource').trim(),
    scope: fields.get('scope').trim(),
  };
}

function renderQuote(option, terms, result) {
  const box = el('quote');
  const totals = result.totals.map((total) =>
    '<section class="totals"><h4>' + text(total.currency) + '</h4><dl class="specs">'
    + [
      ['Urządzenia netto', total.goodsNet], ['Rabat netto', total.discount], ['Robocizna netto', total.labour],
      ['Transport netto', total.transport], ['Razem netto', total.net], ['VAT', total.vat], ['Razem brutto', total.gross],
    ].map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + text(amount(value, total.currency)) + '</dd></div>').join('')
    + '</dl></section>'
  ).join('');
  box.innerHTML = '<h3 id="quote-title" tabindex="-1">Oferta robocza Aniro</h3>'
    + '<p class="muted">Kalkulacja wskazanego zakresu. Dobór i montaż wymagają potwierdzenia dla obiektu.</p>'
    + '<dl class="specs"><div><dt>Zakres</dt><dd>' + text(terms.scope) + '</dd></div>'
    + '<div><dt>Źródło warunków handlowych</dt><dd>' + text(terms.commercialSource) + '</dd></div>'
    + '<div><dt>Ceny katalogowe</dt><dd>' + (terms.priceBasis === 'net' ? 'Netto' : 'Brutto') + '</dd></div>'
    + '<div><dt>VAT / rabat</dt><dd>' + text(terms.vatRate) + '% / ' + text(terms.discountRate) + '%</dd></div></dl>'
    + unresolvedRequirements(option.lines, true) + offerLines(option) + showPair(option.pair)
    + '<h4>Ograniczenia doboru i montażu</h4>' + list(state.result.checklist)
    + '<h4>Podsumowanie według walut</h4>' + totals
    + '<details><summary>Sposób obliczeń</summary>' + list(result.formulas) + '</details>'
    + '<details><summary>Pomiary i źródła</summary>' + printMeasurements() + '</details>'
    + '<div class="actions"><button type="button" id="print-quote">Drukuj / zapisz PDF</button></div>';
  box.hidden = false;
  el('print-quote').addEventListener('click', () => window.print());
  el('quote-title').focus();
}

document.querySelector('.workflow').addEventListener('click', (event) => {
  const button = event.target.closest('[data-step]');
  if (button && !button.disabled) showStep(Number(button.dataset.step));
});

el('scenarios').addEventListener('click', (event) => {
  const button = event.target.closest('[data-scenario]');
  if (!button || !state.catalog) return;
  if (button.dataset.scenario !== state.scenario) {
    state.scenario = button.dataset.scenario;
    state.inputs = {};
    resetResults();
    renderScenarios();
    renderMeasurements();
  }
  showStep(2);
});

el('measurements').addEventListener('input', () => {
  state.inputs = readMeasurements();
  resetResults();
  el('input-errors').hidden = true;
  toggleConditionalFields();
});
el('measurements').addEventListener('submit', (event) => {
  event.preventDefault();
  state.inputs = readMeasurements();
  const result = selectProducts(state.scenario, state.inputs, state.catalog);
  if (result.missingInputs.length) {
    const errors = el('input-errors');
    errors.innerHTML = '<strong>Uzupełnij dane przed doborem</strong>'
      + list(result.missingInputs.map(({ label, reason }) => label + ': ' + reason));
    errors.hidden = false;
    const first = result.missingInputs[0];
    const name = first.reason.includes('źródło') ? first.id + '-source' : first.id;
    el('measurements').elements.namedItem(name)?.focus();
    return;
  }
  el('input-errors').hidden = true;
  state.result = result;
  renderResults();
  showStep(3);
});

el('results').addEventListener('input', (event) => {
  if (event.target.id === 'find-model' || event.target.id === 'find-status') renderCandidateGroups();
});
el('results').addEventListener('click', (event) => {
  const action = event.target.closest('[data-pick]');
  if (!action) return;
  const candidate = findCandidate(action.dataset.pick);
  if (!candidate || candidate.status === 'fails') return;
  const { id, kind } = candidate.product;
  if (state.selected.get(kind)?.candidate.product.id === id) state.selected.delete(kind);
  else state.selected.set(kind, { candidate, quantity: '', quantitySource: '', technicalSource: '' });
  state.option = null;
  invalidateQuote();
  for (const button of el('groups').querySelectorAll('[data-pick]')) {
    const picked = [...state.selected.values()].some(({ candidate: current }) => current.product.id === button.dataset.pick);
    button.setAttribute('aria-pressed', String(picked));
    button.textContent = picked ? 'Usuń z zestawienia' : 'Wskaż wariant';
  }
  renderSelected();
  if (state.selected.has(kind)) el('selected').focus();
});
el('selected').addEventListener('input', (event) => {
  const { line, property } = event.target.dataset;
  if (line) state.selected.get(line)[property] = event.target.value;
  else if (event.target.name === 'offer-option') state.option = event.target.value;
  else return;
  invalidateQuote();
  updateSelectionStatus();
});

el('go-terms').addEventListener('click', () => showStep(4));

function downloadDraft() {
  const options = makeOfferOptions();
  const snapshot = {
    status: 'Dane robocze do przeglądu',
    version: 1,
    catalogueDate: state.catalog.snapshotDate,
    scenario: state.scenario,
    inputs: currentStep() === 2 ? readMeasurements() : state.inputs,
    installationApproval: false,
    selectedOptions: options.map((option) => ({
      name: optionLabel(option),
      chosenForQuote: option.id === state.option || options.length === 1,
      compatibility: option.pair ?? null,
      lines: option.lines.map((line) => {
        const { product } = line.candidate;
        return {
          id: product.id,
          model: product.model,
          quantity: line.quantity ? Number(line.quantity) : null,
          quantitySource: line.quantitySource.trim(),
          technicalSource: line.technicalSource.trim(),
          catalogueSource: product.source,
        };
      }),
    })),
    pairReview: matchPair(),
    commercialTerms: currentStep() === 4 ? Object.fromEntries([...new FormData(el('terms-form'))].filter(([key]) => !['technical', 'commercial'].includes(key))) : null,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aniro-dane-robocze.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

for (const button of document.querySelectorAll('[data-save-draft]')) button.addEventListener('click', downloadDraft);

el('terms-form').addEventListener('input', (event) => {
  if (event.target.name !== 'technical' && event.target.name !== 'commercial') invalidateQuote();
  else {
    el('quote').hidden = true;
    el('quote-error').hidden = true;
  }
});
el('terms-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const option = getReadyOption();
  if (!option) return;
  const form = event.currentTarget;
  if (!form.elements.technical.checked || !form.elements.commercial.checked) return;
  const terms = readTerms(form);
  const lines = option.lines.map((line) => {
    const { product } = line.candidate;
    return {
      sku: product.id,
      name: product.model,
      quantity: Number(line.quantity),
      quantitySource: line.quantitySource.trim(),
      unitPrice: product.priceSnapshot?.value ?? null,
      currency: product.priceSnapshot?.currency ?? null,
      priceSource: [product.source?.url, product.source?.retrieved_date ?? state.catalog.snapshotDate].filter(Boolean).join(' / '),
    };
  });
  const result = quote(lines, terms);
  if (result.errors.length) {
    invalidateQuote();
    const error = el('quote-error');
    error.textContent = result.errors.join(' ');
    error.hidden = false;
    return;
  }
  renderQuote(option, terms, result);
});

let printDetails = [];
window.addEventListener('beforeprint', () => {
  if (el('quote').hidden) return;
  printDetails = [...el('quote').querySelectorAll('details:not([open])')];
  for (const details of printDetails) details.open = true;
});
window.addEventListener('afterprint', () => {
  for (const details of printDetails) details.open = false;
  printDetails = [];
});

async function start() {
  const status = el('catalog-status');
  try {
    state.catalog = await loadCatalog({ pdfFactsById, blockedFieldsById, compatibilityPairs });
    status.hidden = true;
    el('catalog-date').textContent = 'Katalog Aniro / ' + state.catalog.snapshotDate + ' / ' + state.catalog.products.length + ' pozycji';
    renderScenarios();
    renderAccessories(el('accessories'));
  } catch {
    status.classList.add('alert');
    status.innerHTML = '<strong>Katalog Aniro jest niedostępny.</strong><p>Sprawdź, czy aplikacja działa z lokalnego serwera.</p>'
      + '<button type="button">Wczytaj ponownie</button>';
    status.querySelector('button').addEventListener('click', () => window.location.reload());
  }
}

async function showVersion() {
  try {
    const response = await fetch('./version.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const { commit } = await response.json();
    el('version').textContent = 'Wersja robocza';
    if (/^[a-f0-9]{7,64}$/i.test(commit)) {
      el('version').textContent = 'Wersja ' + commit.slice(0, 12);
      el('version').title = commit;
    }
  } catch { /* The app also runs from an unversioned local checkout. */ }
}

start();
showVersion();
