const currencyCodes = new Set(Intl.supportedValuesOf('currency'))
const maxSafeAmount = BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 2))

function requiredText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function currencyCode(value) {
  if (!requiredText(value)) return null
  const code = value.trim().toUpperCase()
  return currencyCodes.has(code) ? code : null
}

// Decimal strings and finite numbers share exact rational arithmetic before rounding.
function decimal(value) {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (!requiredText(raw)) return null
  const input = raw.trim()
  if (input.length > 128) return null
  const match = /^(\d+)?(?:[.,](\d+))?(?:e([+-]?\d{1,3}))?$/i.exec(input)
  if (!match || (!match[1] && !match[2])) return null

  const fraction = match[2] ?? ''
  const numerator = BigInt((match[1] ?? '') + fraction)
  const scale = fraction.length - Number(match[3] ?? 0)
  if (scale < 0) return { numerator: numerator * 10n ** BigInt(-scale), denominator: 1n }
  return { numerator, denominator: 10n ** BigInt(scale) }
}

function percent(value) {
  const ratio = decimal(value)
  if (!ratio || ratio.numerator > 100n * ratio.denominator) return null
  return { numerator: ratio.numerator, denominator: 100n * ratio.denominator }
}

function wholeQuantity(value) {
  const quantity = decimal(value)
  if (!quantity || quantity.numerator === 0n || quantity.numerator % quantity.denominator !== 0n) return null
  const units = quantity.numerator / quantity.denominator
  return units <= BigInt(Number.MAX_SAFE_INTEGER) ? units : null
}

function roundHalfUp(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator)
}

function minorUnits(currency) {
  const format = new Intl.NumberFormat('pl-PL', { style: 'currency', currency })
  return 10n ** BigInt(format.resolvedOptions().maximumFractionDigits)
}

function readLine(entry, index, errors) {
  const line = entry ?? {}
  const label = 'Pozycja ' + (index + 1) + '. '
  const quantity = wholeQuantity(line.quantity)
  const unitPrice = decimal(line.unitPrice)
  const currency = currencyCode(line.currency)

  if (!requiredText(line.sku) || !requiredText(line.name)) errors.push(label + 'Brakuje identyfikatora lub nazwy.')
  if (quantity === null) errors.push(label + 'Podaj dodatnią całkowitą ilość.')
  if (!requiredText(line.quantitySource)) errors.push(label + 'Podaj podstawę przyjętej ilości.')
  if (!unitPrice || unitPrice.numerator === 0n) errors.push(label + 'Podaj dodatnią cenę jednostkową.')
  if (!requiredText(line.priceSource)) errors.push(label + 'Podaj źródło ceny jednostkowej.')
  if (!currency) errors.push(label + 'Podaj prawidłowy kod waluty.')

  return { quantity, unitPrice, currency }
}

function readTerms(entry, errors) {
  const terms = entry ?? {}
  const vat = percent(terms.vatRate)
  const discountRate = percent(terms.discountRate)
  const labour = decimal(terms.labour)
  const transport = decimal(terms.transport)
  const extrasCurrency = currencyCode(terms.extrasCurrency)

  if (terms.priceBasis !== 'net' && terms.priceBasis !== 'gross') errors.push('Potwierdź podstawę cen netto albo brutto.')
  if (!requiredText(terms.commercialSource)) errors.push('Podaj źródło potwierdzenia warunków handlowych.')
  if (!requiredText(terms.scope)) errors.push('Podaj zakres prac i dostawy.')
  if (!vat) errors.push('Podaj stawkę VAT w przedziale od 0 do 100%.')
  if (!discountRate) errors.push('Podaj stawkę rabatu w przedziale od 0 do 100%.')
  if (!labour) errors.push('Podaj koszt robocizny netto równy co najmniej zero.')
  if (!transport) errors.push('Podaj koszt transportu netto równy co najmniej zero.')
  if (!extrasCurrency) errors.push('Podaj prawidłowy kod waluty robocizny i transportu.')

  return { priceBasis: terms.priceBasis, vat, discountRate, labour, transport, extrasCurrency }
}

function roundPrice(price, unitsPerCurrency) {
  return roundHalfUp(price.numerator * unitsPerCurrency, price.denominator)
}

function lineAmount(line, unitsPerCurrency) {
  const numerator = line.quantity * line.unitPrice.numerator * unitsPerCurrency
  return roundHalfUp(numerator, line.unitPrice.denominator)
}

function applyRate(amount, rate) {
  return roundHalfUp(amount * rate.numerator, rate.denominator)
}

function removeVat(gross, vat) {
  return roundHalfUp(gross * vat.denominator, vat.denominator + vat.numerator)
}

function totalsInCurrency(currency, goods, terms, currencyUnit, labour, transport) {
  const servicesNet = labour + transport
  const discountedGoods = goods - applyRate(goods, terms.discountRate)
  const pricesAreGross = terms.priceBasis === 'gross'
  const goodsNet = pricesAreGross ? removeVat(goods, terms.vat) : goods
  const discountedGoodsNet = pricesAreGross ? removeVat(discountedGoods, terms.vat) : discountedGoods
  const discount = goodsNet - discountedGoodsNet
  const net = discountedGoodsNet + servicesNet
  const vat = pricesAreGross
    ? discountedGoods - discountedGoodsNet + applyRate(servicesNet, terms.vat)
    : applyRate(net, terms.vat)
  const amounts = { goodsNet, discount, labour, transport, net, vat, gross: net + vat }
  if (Object.values(amounts).some((amount) => amount > maxSafeAmount)) return null

  const total = { currency }
  for (const [key, amount] of Object.entries(amounts)) {
    total[key] = Number(amount) / Number(currencyUnit)
  }
  return total
}

export function quote(lines, terms) {
  const errors = []
  if (!Array.isArray(lines) || lines.length === 0) errors.push('Dodaj co najmniej jedną pozycję do wyceny.')
  const checkedLines = Array.isArray(lines)
    ? Array.from(lines, (line, index) => readLine(line, index, errors))
    : []
  const checkedTerms = readTerms(terms, errors)
  if (errors.length) return { errors, totals: [], formulas: [] }

  const goodsByCurrency = new Map()
  for (const line of checkedLines) {
    const currency = line.currency
    const existing = goodsByCurrency.get(currency) ?? 0n
    goodsByCurrency.set(currency, existing + lineAmount(line, minorUnits(currency)))
  }

  const { extrasCurrency } = checkedTerms
  const extraUnits = minorUnits(extrasCurrency)
  const labour = roundPrice(checkedTerms.labour, extraUnits)
  const transport = roundPrice(checkedTerms.transport, extraUnits)
  if ((labour || transport) && !goodsByCurrency.has(extrasCurrency)) goodsByCurrency.set(extrasCurrency, 0n)

  const totals = []
  for (const [currency, goods] of goodsByCurrency) {
    const includesExtras = currency === extrasCurrency
    const total = totalsInCurrency(
      currency,
      goods,
      checkedTerms,
      minorUnits(currency),
      includesExtras ? labour : 0n,
      includesExtras ? transport : 0n,
    )
    if (total) totals.push(total)
    else errors.push('Kwoty w ' + currency + ' przekraczają zakres dokładnego zapisu.')
  }
  if (errors.length) return { errors, totals: [], formulas: [] }

  const formulas = checkedTerms.priceBasis === 'gross' ? [
    'Towary brutto = suma zaokrąglonych pozycji w danej walucie. Pozycja brutto = ilość × cena jednostkowa brutto.',
    'Towary brutto po rabacie = towary brutto − zaokrąglony rabat procentowy od towarów brutto.',
    'Towary netto przed i po rabacie = odpowiednie kwoty brutto ÷ (1 + VAT ÷ 100), po zaokrągleniu.',
    'Rabat netto = towary netto przed rabatem − towary netto po rabacie.',
    'VAT towarów = towary brutto po rabacie − towary netto po rabacie.',
    'VAT usług = zaokrąglony VAT od robocizny i transportu netto.',
  ] : [
    'Towary netto = suma zaokrąglonych pozycji w danej walucie. Pozycja netto = ilość × cena jednostkowa netto.',
    'Rabat netto = towary netto × rabat procentowy ÷ 100.',
    'VAT = razem netto × VAT procentowy ÷ 100.',
  ]
  formulas.push(
    'Razem netto = towary netto − rabat netto + robocizna netto + transport netto w danej walucie.',
    'Razem brutto = razem netto + VAT.',
    'Wartości zaokrąglamy handlowo do najmniejszej jednostki waluty.',
  )
  return { errors, totals, formulas }
}
