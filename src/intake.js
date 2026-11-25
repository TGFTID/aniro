import { getInputFields, selectProducts } from './selection.js';

const invoiceStep = 'invoice';
const invertersStep = 'inverters';
const emptyCatalog = { products: [] };
const unknownAction = '<button type="button" class="intake-unknown" data-intake-action="unknown">Nie wiem</button>';
const amounts = [
  { id: 'reactiveFee', label: 'Opłata za energię bierną', max: 5000 },
  { id: 'billTotal', label: 'Kwota całej faktury', max: 50000 },
];

const questions = {
  reactivePowerKvar: ['Jakiej mocy kompensacji potrzebuje obiekt?', 'W raporcie z pomiarów poszukaj wymaganej mocy kompensacji. Jednostka kvar oznacza moc bierną.'],
  reactiveDirection: ['Jaki rodzaj energii biernej trzeba kompensować?', 'Sprawdź w raporcie z pomiarów, czy instalator wskazał moc indukcyjną, pojemnościową czy obie.'],
  compVoltageV: ['Jakie jest napięcie sieci dla kompensatora?', 'Sprawdź schemat rozdzielnicy lub raport elektryka. Przy trzech fazach wpisz napięcie między fazami.'],
  gridConnection: ['Jaki jest układ przewodów w miejscu montażu?', 'W schemacie rozdzielnicy sprawdź liczbę faz i obecność przewodu neutralnego.'],
  harmonicsRequired: ['Czy elektryk zalecił filtrowanie harmonicznych?', 'Harmoniczne to zniekształcenia prądu lub napięcia. Zalecenia szukaj w raporcie z pomiarów jakości energii.'],
  harmonics: ['Które harmoniczne trzeba filtrować?', 'Podaj numery z raportu jakości energii. Przykład zapisu: 3, 5, 7.'],
  capacityKwh: ['Ile energii ma przechowywać magazyn?', 'Podaj minimalną pojemność z projektu lub analizy zużycia. kWh to jednostka ilości energii.'],
  capacityBasis: ['Czy podana pojemność jest znamionowa czy użytkowa?', 'W projekcie sprawdź, czy podano pojemność całkowitą (znamionową), czy dostępną do wykorzystania (użytkową).'],
  storagePowerKw: ['Z jaką mocą magazyn ma się ładować i rozładowywać?', 'W projekcie lub profilu pracy sprawdź wymaganą znamionową moc baterii.'],
  acPowerKw: ['Jaką moc ma oddawać jeden falownik?', 'W projekcie sprawdź wymaganą moc wyjściową AC pojedynczego falownika.'],
  inverterVoltageV: ['Przy jakim napięciu falownik ma pracować z siecią?', 'Sprawdź napięcie AC w projekcie instalacji. Dla trzech faz podaj napięcie między fazami.'],
  inverterUse: ['Jaką funkcję ma pełnić falownik?', 'Sprawdź w projekcie, czy falownik ma obsługiwać magazyn, panele z możliwością współpracy z magazynem czy pracę sieciową.'],
};

function text(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function amountNumber(value) {
  const normalized = value.trim().replace(/[ \u00a0\u202f]/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(Math.round(number * 100)) ? number : null;
}

function amountMaximum(value, max) {
  return Math.max(max, value ?? 0);
}

function amountMarkup({ id, label, max }, value) {
  const number = amountNumber(value);
  const defined = number !== null;
  return `<div class="intake-amount">
    <label for="intake-${id}">${label} (zł, opcjonalnie)</label>
    <input id="intake-${id}" name="${id}" type="text" inputmode="decimal" value="${text(value)}">
    <label class="intake-range" for="intake-${id}-slider">Ustaw orientacyjną kwotę</label>
    <input id="intake-${id}-slider" type="range" data-amount-slider="${id}" min="0" max="${amountMaximum(number, max)}"
      step="0.01" value="${number ?? 0}" aria-label="${label} – suwak" aria-valuetext="${defined ? number + ' zł' : 'Kwota niepodana'}">
  </div>`;
}

function optionsMarkup(options, chosen) {
  return '<option value="">Wybierz…</option>' + options.map(({ value, label }) =>
    `<option value="${text(value)}"${value === chosen ? ' selected' : ''}>${text(label)}</option>`
  ).join('');
}

function fieldMarkup(field, entered, scenario) {
  const [question, hint] = questions[field.id] ?? [field.label, field.hint];
  const { value, source } = entered ?? {};
  const caption = field.unit ? `Wartość (${text(field.unit)})` : 'Odpowiedź';
  const attributes = `name="${field.id}" id="field-${field.id}" aria-describedby="intake-hint" required`;
  const valueField = field.type === 'select'
    ? `<select ${attributes}>${optionsMarkup(field.options, value)}</select>`
    : `<input type="text"${field.type === 'number' ? ' inputmode="decimal"' : ''} ${attributes} value="${text(value)}">`;
  const existingInverterHint = scenario === 'storage' && field.id === 'capacityKwh'
    ? '<p class="notice">Czy na obiekcie jest już falownik? Jeśli tak, odczytaj jego dokładny model z tabliczki znamionowej. Przed połączeniem poproś instalatora o potwierdzenie zgodności magazynu z tym modelem, w tym komunikacji systemu zarządzania baterią (BMS).</p>'
    : '';
  return `<div class="measurement" data-field="${field.id}">
    <h3 id="intake-heading" tabindex="-1">${text(question)}</h3>
    <p id="intake-hint" class="muted">${text(hint)}</p>
    ${unknownAction}
    ${existingInverterHint}
    <div class="fields-row"><label>${caption}${valueField}</label>
    <label>Skąd masz tę informację?<input id="field-${field.id}-source" type="text" name="${field.id}-source" required
      value="${text(source)}" aria-describedby="intake-source-hint"></label></div>
    <p id="intake-source-hint" class="muted">Wystarczy np. nazwa dokumentu i strona albo data pomiaru.</p>
  </div>`;
}

function requestForElectrician(scenario, inputs, siteInverters) {
  const hasCompensation = scenario === 'compensation' || scenario === 'combined';
  const hasStorage = ['storage', 'storage-inverter', 'combined'].includes(scenario);
  const hasInverter = ['inverter', 'storage-inverter', 'combined'].includes(scenario);
  const requests = [];
  if (hasCompensation) {
    requests.push('Proszę zarejestrować profil mocy biernej w reprezentatywnym okresie pracy obiektu oraz podać datę, zakres i warunki pomiaru. Na tej podstawie proszę wyznaczyć wymaganą moc kompensacji w kvar i kierunek mocy biernej (indukcyjna, pojemnościowa lub oba kierunki).');
    requests.push('Proszę potwierdzić napięcie znamionowe w V (międzyfazowe dla trzech faz) oraz układ przewodów w miejscu montażu (3P/4W, 3P/3W lub 1P/2W).');
    if (inputs.harmonicsRequired?.value === 'yes') {
      requests.push('Proszę podać rzędy harmonicznych, które ma objąć filtracja, i dołączyć wyniki pomiarów jakości energii.');
    } else if (inputs.harmonicsRequired?.value !== 'no') {
      requests.push('Proszę sprawdzić, czy potrzebna jest filtracja harmonicznych. Jeśli tak, proszę wskazać wymagane rzędy z pomiarów jakości energii.');
    }
    if (siteInverters === 'yes') {
      requests.push('Proszę uwzględnić w pomiarach okresy pracy falowników i typowe obciążenie obiektu.');
    } else if (siteInverters !== 'no') {
      requests.push('Proszę sprawdzić, czy na obiekcie pracują falowniki, i w razie potrzeby objąć pomiarem okresy ich pracy.');
    }
  }
  if (hasStorage) {
    requests.push('Proszę podać minimalną pojemność magazynu w kWh (znamionową lub użytkową) oraz wymaganą znamionową moc ładowania i rozładowania w kW.');
  }
  if (scenario === 'storage') {
    requests.push('Jeśli na obiekcie działa już falownik, proszę podać jego dokładny model i potwierdzić zgodność magazynu z falownikiem, w tym komunikację BMS, przed połączeniem.');
  }
  if (hasInverter) {
    requests.push('Proszę podać wymaganą moc wyjściową AC jednego falownika w kW, jego napięcie AC w V w trybie sieciowym oraz funkcję falownika.');
  }
  return ['Dzień dobry, proszę o dane do porównania urządzeń dla obiektu.',
    ...requests.map((request) => '- ' + request),
    'Proszę wskazać źródło każdej wartości, np. datę pomiaru lub nazwę i stronę dokumentu. Dziękuję.'].join('\n');
}

export function createIntake({ form, fields, onChange, onComplete, onSave, onBack }) {
  let scenario;
  let technicalFields = [];
  let inputs = {};
  let progress = {};

  function steps() {
    const context = scenario === 'compensation' || scenario === 'combined' ? [invoiceStep, invertersStep] : [];
    return [...context, ...technicalFields.filter(({ when }) => !when || inputs[when.id]?.value === when.value).map(({ id }) => id)];
  }

  function snapshot() {
    return structuredClone({ inputs, progress });
  }

  function open(nextScenario, nextInputs = {}, nextProgress = {}) {
    scenario = nextScenario;
    technicalFields = getInputFields(scenario);
    inputs = Object.fromEntries(technicalFields.filter(({ id }) => nextInputs?.[id]).map(({ id }) => {
      const { value, source } = nextInputs[id];
      return [id, { value: Array.isArray(value) ? [...value] : value, source }];
    }));
    const invoice = nextProgress?.invoice ?? {};
    progress = {
      position: nextProgress?.position,
      invoice: { reactiveFee: String(invoice.reactiveFee ?? ''), billTotal: String(invoice.billTotal ?? ''), period: String(invoice.period ?? '') },
      siteInverters: ['yes', 'no', 'unknown'].includes(nextProgress?.siteInverters) ? nextProgress.siteInverters : '',
      missingQuestion: nextProgress?.missingQuestion,
    };
    const available = steps();
    if (!available.includes(progress.position)) progress.position = available[0];
    if (progress.missingQuestion !== progress.position) progress.missingQuestion = null;
    if (progress.missingQuestion) delete inputs[progress.missingQuestion];
    render();
  }

  function render(focus = false) {
    const available = steps();
    const index = available.indexOf(progress.position);
    const field = technicalFields.find(({ id }) => id === progress.position);
    let body;
    let actions;
    if (progress.missingQuestion) {
      const { missingInputs, inputs: knownValues } = selectProducts(scenario, inputs, emptyCatalog);
      const missingList = missingInputs.map(({ id, label }) => {
        const { unit } = technicalFields.find((entry) => entry.id === id);
        const detail = knownValues[id] ? ' (podaj źródło, np. dokument lub datę pomiaru)' : unit ? ` (${unit})` : '';
        return `<li>${text(label + detail)}</li>`;
      }).join('');
      body = `<div class="intake-help notice">
        <h3 id="intake-heading" tabindex="-1">Poproś elektryka o pomoc</h3>
        ${missingList ? `<p>Do uzupełnienia</p><ul>${missingList}</ul>` : '<p>Masz dane wymagane do porównania urządzeń.</p>'}
        <label for="intake-message">Gotowa wiadomość do elektryka</label>
        <textarea class="intake-copy" id="intake-message" rows="9" readonly>${text(requestForElectrician(scenario, inputs, progress.siteInverters))}</textarea>
        <p id="intake-copy-status" role="status" hidden></p>
      </div>`;
      actions = `<button type="button" class="primary" data-intake-action="copy">Kopiuj wiadomość</button>
        <button type="button" data-intake-action="save-exit">Zapisz i wyjdź</button>
        <button type="button" data-intake-action="return">Wróć do pytania</button>`;
    } else {
      if (progress.position === invoiceStep) {
        body = `<h3 id="intake-heading" tabindex="-1">Ile wynosi opłata za energię bierną na fakturze?</h3>
          <p class="muted">Sprawdź pozycje w części „Dystrybucja” lub „Rozliczenie energii”. Szukaj nazw „energia bierna indukcyjna”, „energia bierna pojemnościowa” lub „ponadumowny pobór energii biernej”.</p>
          ${unknownAction}
          <div class="intake-amounts">${amounts.map((amount) => amountMarkup(amount, progress.invoice[amount.id])).join('')}</div>
          <label for="intake-period">Okres rozliczeniowy (opcjonalnie)</label>
          <input id="intake-period" name="billPeriod" type="text" placeholder="np. maj 2026" value="${text(progress.invoice.period)}" maxlength="80">
          <p class="muted">Kwoty służą do opisania rachunku. Moc urządzenia dobierzesz na podstawie pomiarów.</p>`;
      } else if (progress.position === invertersStep) {
        body = `<h3 id="intake-heading" tabindex="-1">Czy na obiekcie pracują falowniki?</h3>
          <p class="muted">Falowniki mogą pracować np. przy panelach fotowoltaicznych, magazynach energii lub napędach maszyn. W razie wątpliwości sprawdź dokumentację lub zapytaj instalatora.</p>
          ${unknownAction}
          <label for="intake-inverters">Odpowiedź</label>
          <select id="intake-inverters" name="siteInverters">${optionsMarkup([
            { value: 'yes', label: 'Tak' }, { value: 'no', label: 'Nie' }, { value: 'unknown', label: 'Nie wiem' },
          ], progress.siteInverters)}</select>`;
      } else {
        body = fieldMarkup(field, inputs[field.id], scenario);
      }
      actions = `<button type="submit" class="primary">${index === available.length - 1 ? 'Porównaj urządzenia' : 'Dalej'}</button>
        <button type="button" data-intake-action="back">Wstecz</button>`;
    }
    fields.innerHTML = `<div class="intake-step" data-intake-step="${progress.position}">
      <p class="intake-counter muted">Pytanie ${index + 1} z ${available.length}</p>
      ${body}<p id="intake-error" class="notice alert" role="alert" hidden></p>
      <div class="actions intake-controls">${actions}</div></div>`;
    if (focus) fields.querySelector('#intake-heading').focus();
  }

  function setPosition(position, missingQuestion = null) {
    progress.position = position;
    progress.missingQuestion = missingQuestion;
    render(true);
    onChange();
  }

  function showError(message, control) {
    const error = fields.querySelector('#intake-error');
    error.textContent = message;
    error.hidden = false;
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      control.focus();
    }
  }

  function inputChanged(event) {
    const { name, value, dataset } = event.target;
    if (!scenario || !fields.contains(event.target)) return;
    if (progress.position === invoiceStep && !progress.missingQuestion) {
      const amount = amounts.find(({ id }) => name === id || dataset.amountSlider === id);
      if (amount) {
        const { id, max } = amount;
        const entered = form.elements.namedItem(id);
        const slider = fields.querySelector(`[data-amount-slider="${id}"]`);
        if (dataset.amountSlider) entered.value = value;
        const number = amountNumber(entered.value);
        slider.max = String(amountMaximum(number, max));
        slider.value = String(number ?? 0);
        slider.setAttribute('aria-valuetext', number === null ? 'Kwota niepodana' : `${number} zł`);
        if (progress.invoice[id] === entered.value) return;
        progress.invoice[id] = entered.value;
        entered.removeAttribute('aria-invalid');
      } else if (name === 'billPeriod' && progress.invoice.period !== value) {
        progress.invoice.period = value;
      } else return;
    } else if (name === 'siteInverters') {
      if (progress.siteInverters === value) return;
      progress.siteInverters = value;
      if (value === 'unknown') {
        setPosition(invertersStep, invertersStep);
        return;
      }
    } else {
      const id = progress.position;
      const property = name === id ? 'value' : name === `${id}-source` ? 'source' : null;
      if (!property) return;
      const current = inputs[id] ?? { value: '', source: '' };
      if (current[property] === value) return;
      inputs[id] = { ...current, [property]: value };
      event.target.removeAttribute('aria-invalid');
      const available = steps();
      const index = available.indexOf(id);
      fields.querySelector('.intake-counter').textContent = `Pytanie ${index + 1} z ${available.length}`;
      fields.querySelector('button[type="submit"]').textContent = index === available.length - 1 ? 'Porównaj urządzenia' : 'Dalej';
    }
    fields.querySelector('#intake-error').hidden = true;
    onChange();
  }

  function advance() {
    if (progress.position === invoiceStep) {
      for (const { id } of amounts) {
        const value = progress.invoice[id];
        if (value.trim() && amountNumber(value) === null) {
          showError('Wpisz kwotę w złotych z maksymalnie dwoma miejscami po przecinku albo pozostaw pole puste.', form.elements.namedItem(id));
          return;
        }
      }
    }
    const { missingInputs, inputs: validatedInputs } = selectProducts(scenario, inputs, emptyCatalog);
    const available = steps();
    const current = missingInputs.find(({ id }) => id === progress.position);
    if (current) {
      const control = form.elements.namedItem(current.reason.startsWith('Podaj źródło') ? `${current.id}-source` : current.id);
      showError(current.reason, control);
      return;
    }
    const next = available[available.indexOf(progress.position) + 1];
    if (next) setPosition(next);
    else if (missingInputs.length) {
      setPosition(missingInputs[0].id);
      showError(missingInputs[0].reason);
    } else onComplete(validatedInputs);
  }

  async function copyMessage() {
    const message = fields.querySelector('#intake-message');
    const status = fields.querySelector('#intake-copy-status');
    const { ownerDocument } = message;
    let copied = false;
    try {
      await ownerDocument.defaultView.navigator.clipboard.writeText(message.value);
      copied = true;
    } catch {
      message.focus();
      message.select();
      try {
        copied = ownerDocument.execCommand?.('copy') === true;
      } catch { /* The message remains selected for manual copying. */ }
    }
    status.textContent = copied ? 'Skopiowano wiadomość.' : 'Zaznaczono wiadomość. Skopiuj ją z menu lub skrótem Ctrl+C.';
    status.hidden = false;
  }

  fields.addEventListener('input', inputChanged);
  fields.addEventListener('change', inputChanged);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (scenario && !progress.missingQuestion) advance();
  });
  fields.addEventListener('click', (event) => {
    const action = event.target.closest('[data-intake-action]')?.dataset.intakeAction;
    switch (action) {
      case 'back': {
        const available = steps();
        const previous = available[available.indexOf(progress.position) - 1];
        if (previous) setPosition(previous);
        else onBack();
        break;
      }
      case 'unknown':
        if (progress.position === invertersStep) progress.siteInverters = 'unknown';
        delete inputs[progress.position];
        setPosition(progress.position, progress.position);
        break;
      case 'return':
        setPosition(progress.position);
        break;
      case 'copy':
        void copyMessage();
        break;
      case 'save-exit':
        if (onSave() !== false) onBack();
        break;
    }
  });

  return { open, snapshot };
}
