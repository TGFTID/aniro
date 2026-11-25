const devices = [
  { kind: 'inverter', label: 'Falownik PV', series: 'Sinexcel Isuna' },
  { kind: 'storage', label: 'Magazyn energii', series: 'Sunwoda OASIS' },
  { kind: 'compensator', label: 'Kompensator mocy biernej', series: 'Sinexcel ASVG' },
]

const amounts = [
  { key: 'billTotal', label: 'Cała faktura brutto', unit: 'zł', max: 50000 },
  { key: 'reactiveFee', label: 'Opłata za energię bierną', unit: 'zł', max: 5000, kind: 'compensator' },
  { key: 'acPowerKw', label: 'Moc szukanego falownika', unit: 'kW', max: 100, kind: 'inverter', positive: true },
  { key: 'capacityKwh', label: 'Pojemność szukanego magazynu', unit: 'kWh', max: 200, kind: 'storage', positive: true },
]

const answers = [['yes', 'Tak'], ['no', 'Nie'], ['unknown', 'Nie wiem']]

function readNumber(raw, technical = false) {
  const trimmed = raw.trim()
  const pattern = technical ? /^\d+(?:[.,]\d+)?$/ : /^\d+(?:[.,]\d{1,2})?$/
  if (!pattern.test(trimmed)) return NaN
  const value = Number(trimmed.replace(',', '.'))
  return technical ? (Number.isFinite(value) ? value : NaN)
    : (Number.isSafeInteger(Math.round(value * 100)) ? value : NaN)
}

function numericMarkup({ key, label, unit, max, positive }) {
  return `<div class="quick-number">
    <label for="quick-${key}">${label}</label>
    <div class="quick-inputline">
      <input id="quick-${key}" name="${key}" inputmode="decimal" autocomplete="off" placeholder="—" aria-describedby="quick-${key}-unit quick-${key}-error">
      <span id="quick-${key}-unit">${unit}</span>
    </div>
    <input type="range" min="${positive ? '0.01' : '0'}" max="${max}" step="0.01" aria-label="${label} (${unit}), suwak">
    <small class="quick-error" id="quick-${key}-error" hidden></small>
  </div>`
}

export function createQuickStart(host, { onContinue, onChange, onInvoice, onUnknown }) {
  host.innerHTML = `
    <h2 id="quick-start-title" tabindex="-1">Co chcesz dobrać?</h2>
    <p class="quick-hint">Zaznacz urządzenia lub wpisz dane do automatycznej propozycji.</p>
    <div class="quick-cards" role="group" aria-label="Potrzebne urządzenia">
      ${devices.map(({ kind, label, series }) => `<label class="quick-card">
        <span class="quick-photo"><img alt="" src="./src/quick-${kind}.png"></span>
        <span class="quick-device-label">${label}<small>${series}</small></span>
        <input type="checkbox" name="kinds" value="${kind}" data-kind="${kind}">
      </label>`).join('')}
    </div>
    <section class="quick-values" aria-labelledby="quick-values-title">
      <h3 id="quick-values-title">Jakie wartości już znasz?</h3>
      <p class="quick-hint">Przesuń suwak lub wpisz liczbę. Nieznane pola zostaw puste.</p>
      <div class="period-pick"><span>Faktura za</span><label><input type="radio" name="billingPeriod" value="month" checked>Miesiąc</label><label><input type="radio" name="billingPeriod" value="year">Rok</label></div>
      <div class="quick-value-grid">${amounts.map(numericMarkup).join('')}</div>
      <button id="quick-start-invoice" class="quick-link" type="button">Mam na fakturze opłatę za energię bierną</button>
    </section>
    <div class="quick-survey">
      <div class="quick-installed" role="radiogroup" aria-labelledby="quick-installed-title">
        <h3 id="quick-installed-title">Masz już falownik?</h3>
        <div class="quick-answers">
          ${answers.map(([value, label]) => `<label class="quick-answer">
            <input type="radio" name="siteInverters" value="${value}"><span>${label}</span>
          </label>`).join('')}
        </div>
      </div>
      <label class="quick-model" hidden>Model (opcjonalnie)<input name="inverterModel" autocomplete="off"></label>
    </div>
    <p id="quick-start-feedback" class="quick-feedback" tabindex="-1" role="alert" hidden></p>
    <p class="quick-suggestion" aria-live="polite" hidden></p>
    <div class="quick-actions">
      <output class="quick-count" aria-live="polite"></output>
      <button id="quick-start-next" class="primary" type="button">Pokaż ofertę →</button>
    </div>
    <div class="quick-secondary">
      <button id="quick-start-unknown" class="quick-link" type="button">Nie wiem, od czego zacząć</button>
      <details class="quick-services network-settings"><summary>Sieć <span id="network-label">3 fazy · 400 V</span></summary><label>Napięcie sieci (V)<input name="networkVoltage" type="number" min="1" max="2000" step="any" placeholder="400"></label></details>
      <details class="quick-services"><summary>Panele PV i wsparcie techniczne</summary>
        <a href="https://aniro.pl/fotowoltaika-w-ofercie-aniro/" target="_blank" rel="noopener">Panele PV · zapytaj o dostępność ↗</a>
        <a href="https://aniro.pl/" target="_blank" rel="noopener">Jakość energii, prefabrykacja i serwis ↗</a>
      </details>
    </div>`

  const query = selector => host.querySelector(selector)
  const cards = [...host.querySelectorAll('[data-kind]')]
  const radios = [...host.querySelectorAll('[name=siteInverters]')]
  const model = query('[name=inverterModel]')
  const feedback = query('#quick-start-feedback')
  const suggestion = query('.quick-suggestion')
  const unknown = query('#quick-start-unknown')
  const fields = amounts.map(amount => {
    const entry = query(`[name=${amount.key}]`)
    const block = entry.closest('.quick-number')
    return { ...amount, entry, range: block.querySelector('[type=range]'), error: block.querySelector('small') }
  })

  function snapshot() {
    return {
      kinds: cards.filter(card => card.checked).map(card => card.value),
      ...Object.fromEntries(fields.map(field => [field.key, field.entry.value.trim()])),
      siteInverters: radios.find(radio => radio.checked)?.value ?? '',
      inverterModel: model.value.trim(),
      billingPeriod: query('[name=billingPeriod]:checked').value,
      networkVoltage: query('[name=networkVoltage]').value,
    }
  }

  function validate(field) {
    const raw = field.entry.value.trim()
    const value = readNumber(raw, field.positive)
    const valid = raw === '' || (Number.isFinite(value) && (!field.positive || value > 0))
    field.entry.setAttribute('aria-invalid', String(!valid))
    field.error.hidden = valid
    field.error.textContent = valid ? '' : field.positive ? 'Wpisz liczbę większą od zera.' : 'Wpisz kwotę od 0 zł (maks. 2 miejsca po przecinku).'
    field.range.max = String(valid && raw ? Math.max(value, field.max) : field.max)
    field.range.value = valid && raw ? String(value) : field.range.min
    field.range.setAttribute('aria-valuetext', valid && raw ? `${raw} ${field.unit}` : 'Brak wartości')
    const fraction = valid && raw ? Number(field.range.value) / Number(field.range.max) : 0
    field.range.style.setProperty('--filled', (fraction * 100) + '%')
    field.range.classList.toggle('is-empty', !raw || !valid)
    return valid
  }

  function getProposedKinds(data) {
    return fields.filter(field => field.kind && readNumber(data[field.key], field.positive) > 0).map(field => field.kind)
  }

  function render() {
    const data = snapshot()
    query('#network-label').textContent = data.networkVoltage ? data.networkVoltage + ' V' : '3 fazy · 400 V'
    const filled = fields.filter(field => validate(field) && data[field.key]).length
    const proposed = data.kinds.length ? [] : getProposedKinds(data)
    query('.quick-count').textContent = filled ? `Wpisane wartości: ${filled} z 4` : 'Wszystkie wartości są opcjonalne'
    query('.quick-model').hidden = data.siteInverters !== 'yes'
    unknown.textContent = data.kinds.length
      ? 'Nie wiem, jak zebrać dane'
      : 'Nie wiem. Chcę pomocy z pomiarem energii biernej'
    suggestion.hidden = proposed.length === 0
    const labels = devices.filter(device => proposed.includes(device.kind)).map(device => device.label.toLowerCase())
    suggestion.textContent = proposed.length ? `Z podanych wartości proponujemy zakres: ${labels.join(', ')}. Możesz go zmienić, zaznaczając karty.` : ''
  }

  function changed() {
    feedback.hidden = true
    render()
    onChange(snapshot())
  }

  function open(data = {}) {
    const kinds = Array.isArray(data.kinds) ? data.kinds : []
    for (const card of cards) card.checked = kinds.includes(card.value)
    for (const field of fields) field.entry.value = data[field.key] ?? ''
    for (const radio of radios) radio.checked = radio.value === data.siteInverters
    model.value = data.inverterModel ?? ''
    query('[name=billingPeriod][value=' + (data.billingPeriod === 'year' ? 'year' : 'month') + ']').checked = true
    query('[name=networkVoltage]').value = data.networkVoltage ?? ''
    feedback.hidden = true
    render()
  }

  for (const control of [...cards, ...radios]) control.addEventListener('change', changed)
  model.addEventListener('input', changed)
  for (const control of host.querySelectorAll('[name=billingPeriod], [name=networkVoltage]')) control.addEventListener('input', changed)
  for (const field of fields) {
    field.entry.addEventListener('input', changed)
    field.range.addEventListener('input', () => {
      field.entry.value = field.range.value
      changed()
    })
  }

  function validateBeforeContinuing() {
    const invalid = fields.find(field => !validate(field))
    invalid?.entry.focus()
    if (!query('[name=networkVoltage]').reportValidity()) return false
    return !invalid
  }

  query('#quick-start-next').addEventListener('click', () => {
    if (!validateBeforeContinuing()) return
    const data = snapshot()
    if (!data.kinds.length) data.kinds = getProposedKinds(data)
    if (!data.kinds.length && data.billTotal !== '') data.kinds = devices.map(device => device.kind)
    if (!data.kinds.length) {
      feedback.textContent = 'Zaznacz urządzenie albo wybierz pomoc z pomiarem energii biernej.'
      feedback.hidden = false
      feedback.focus()
      return
    }
    onContinue(data)
  })

  query('#quick-start-invoice').addEventListener('click', () => {
    if (!validateBeforeContinuing()) return
    cards.find(card => card.value === 'compensator').checked = true
    changed()
    onInvoice(snapshot())
  })

  unknown.addEventListener('click', () => {
    if (!validateBeforeContinuing()) return
    const data = snapshot()
    if (!data.kinds.length) data.kinds = ['compensator']
    onUnknown(data)
  })
  open()
  return { open, snapshot }
}
