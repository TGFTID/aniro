import assert from 'node:assert/strict'
import test from 'node:test'

import { quote } from '../src/pricing.js'

const line = {
  sku: 'fixture',
  name: 'Urządzenie testowe',
  quantity: '2',
  quantitySource: 'Ilość scenariusza testowego',
  unitPrice: '100,00',
  currency: 'PLN',
  priceSource: 'Cennik scenariusza testowego',
}
const terms = {
  priceBasis: 'net',
  commercialSource: 'Warunki scenariusza testowego',
  vatRate: '20',
  discountRate: 10,
  labour: '30,00',
  transport: 10,
  extrasCurrency: 'PLN',
  scope: 'Dostawa i montaż urządzenia testowego',
}

test('net prices, discount on goods only and VAT on discounted goods and services', () => {
  const result = quote([line], terms)
  assert.deepEqual(result.errors, [])
  // 200 - 20 + 30 + 10 = 220. One fifth of 220 is 44, giving 264.
  assert.deepEqual(result.totals, [{
    currency: 'PLN',
    goodsNet: 200,
    discount: 20,
    labour: 30,
    transport: 10,
    net: 220,
    vat: 44,
    gross: 264,
  }])
  assert.match(result.formulas[0], /cena jednostkowa netto/)
})

test('gross prices retain their basis when discount, VAT and services are applied', () => {
  const result = quote(
    [{ ...line, quantity: 3, unitPrice: 19.99, currency: 'EUR' }],
    { ...terms, priceBasis: 'gross', discountRate: '5', labour: 0, transport: 2, extrasCurrency: 'EUR' },
  )
  assert.deepEqual(result.errors, [])
  // 59.97 gross minus a 3.00 gross discount is 56.97.
  // Goods net after VAT removal = 47.48, VAT = 9.49. Services add 2.00 net and 0.40 VAT.
  assert.deepEqual(result.totals, [{
    currency: 'EUR',
    goodsNet: 49.98,
    discount: 2.5,
    labour: 0,
    transport: 2,
    net: 49.48,
    vat: 9.89,
    gross: 59.37,
  }])
  assert.match(result.formulas[0], /cena jednostkowa brutto/)
})

test('a confirmed gross catalogue price stays exact with no discount or service costs', () => {
  const result = quote(
    [{ ...line, quantity: 1, unitPrice: 5600, currency: 'USD' }],
    { ...terms, priceBasis: 'gross', vatRate: 23, discountRate: 0, labour: 0, transport: 0, extrasCurrency: 'USD' },
  )
  assert.deepEqual(result.errors, [])
  // 5600/1.23 = 4552.8455… net, leaving 1047.15 VAT in the source amount.
  assert.deepEqual(result.totals, [{
    currency: 'USD',
    goodsNet: 4552.85,
    discount: 0,
    labour: 0,
    transport: 0,
    net: 4552.85,
    vat: 1047.15,
    gross: 5600,
  }])
})

test('currencies stay separate and zero extras do not introduce a new row', () => {
  const lines = [line, { ...line, currency: 'EUR', unitPrice: '41.50', quantity: 1 }]
  const conditions = { ...terms, vatRate: 0, discountRate: 0, labour: 0, transport: '0', extrasCurrency: 'USD' }
  const zero = quote(lines, conditions)
  assert.deepEqual(zero.errors, [])
  assert.deepEqual(zero.totals.map((row) => [row.currency, row.gross]), [['PLN', 200], ['EUR', 41.5]])

  const positive = quote(lines, { ...conditions, labour: 12.5 })
  assert.deepEqual(positive.errors, [])
  assert.deepEqual(positive.totals.map((row) => [row.currency, row.gross]), [
    ['PLN', 200],
    ['EUR', 41.5],
    ['USD', 12.5],
  ])
})

test('each position is rounded before summing', () => {
  const lines = [
    { ...line, quantity: '1', unitPrice: '1.005' },
    { ...line, quantity: '1', unitPrice: '1,005' },
  ]
  const result = quote(lines, { ...terms, labour: 0, transport: 0, discountRate: 0, vatRate: 0 })
  assert.deepEqual(result.errors, [])
  assert.equal(result.totals[0].goodsNet, 2.02)
  assert.equal(result.totals[0].gross, 2.02)
})

test('invalid line inputs block the whole quote', () => {
  for (const patch of [
    { currency: 'ZZZ' }, { currency: '' }, { quantity: 0 }, { quantity: -1 }, { quantity: '2.5' },
    { quantity: ' ' }, { quantity: Infinity }, { quantity: Number.MAX_SAFE_INTEGER + 1 },
    { quantitySource: ' ' }, { unitPrice: -10 }, { unitPrice: null }, { unitPrice: NaN },
    { unitPrice: '99 USD' }, { unitPrice: '1,234.56' }, { unitPrice: '0', priceSource: '' },
    { unitPrice: 0, priceSource: 'https://katalog.aniro.pl/product/fixture/ / 2026-11-17' },
    { unitPrice: '0,00', priceSource: 'Potwierdzenie handlowe w scenariuszu testowym' },
    { unitPrice: true }, { unitPrice: ' ' }, { sku: '' }, { name: undefined },
  ]) {
    const result = quote([line, { ...line, ...patch }], terms)
    assert.ok(result.errors.length > 0, Object.keys(patch).join(', '))
    assert.deepEqual(result.totals, [])
  }
  assert.ok(quote([], terms).errors.length > 0)
  assert.ok(quote(null, terms).errors.length > 0)
  assert.ok(quote(Array(1), terms).errors.length > 0)
})

test('unknown price basis, commercial terms and missing source information do not default', () => {
  for (const patch of [
    { priceBasis: '' }, { priceBasis: 'unknown' }, { commercialSource: '' }, { scope: ' ' },
    { vatRate: '' }, { vatRate: false }, { vatRate: -1 }, { vatRate: 101 }, { vatRate: '20%' },
    { discountRate: undefined }, { discountRate: '' }, { discountRate: '101' }, { discountRate: NaN },
    { labour: null }, { labour: -1 }, { labour: '' }, { transport: '' }, { transport: '1abc' },
    { extrasCurrency: '' }, { extrasCurrency: 'PL' },
  ]) {
    const result = quote([line], { ...terms, ...patch })
    assert.ok(result.errors.length > 0, Object.keys(patch).join(', '))
    assert.deepEqual(result.totals, [])
  }
  assert.ok(quote([line], undefined).errors.length > 0)
})

test('oversized valid decimals cannot produce a rounded-looking inaccurate total', () => {
  const result = quote([{ ...line, unitPrice: '98765432123456789.12' }], terms)
  assert.ok(result.errors.some((error) => /dokładnego zapisu/.test(error)))
  assert.deepEqual(result.totals, [])
})
