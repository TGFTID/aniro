import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { blockedFieldsById, compatibilityPairs, pdfFactsById, sourcePdf } from '../src/evidence.js'

const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'))
const productsById = new Map(catalog.products.map((product) => [product.id, product]))
const oasis60 = '662a3c0459692e0012ad9e81'
const oasisFlex = '667a62bb59692e00129f7eed'
const isuna20 = '662a3c0459692e0012ad9e2a'
const pwsEx = '67f8c504108c6300122baa37'
const isunaL30S = '6a1d8193f6a77babe02f3ef5'
const solinteg50 = '69aa8007f6a77babe0ba32c7'
const suness15 = '668cd86e59692e0012d57175'
const ciess160 = '6a7c2d9ad38ec2b6cc29f356'

function typedFacts(id) {
  return Object.fromEntries(pdfFactsById[id].filter((entry) => entry.field).map((entry) => [entry.field, entry.value]))
}

test('facts use known exact product IDs, cited PDF pages and serializable values', () => {
  assert.equal(Object.keys(pdfFactsById).length, 19)
  assert.deepEqual(JSON.parse(JSON.stringify(pdfFactsById)), pdfFactsById)
  for (const [id, facts] of Object.entries(pdfFactsById)) {
    assert.ok(productsById.has(id), id)
    for (const entry of facts) {
      assert.ok(entry.label && entry.value)
      assert.ok(['confirmed', 'requires-review'].includes(entry.status))
      assert.ok(sourcePdf(entry.source), entry.source)
    }
  }
  assert.ok(!pdfFactsById[oasisFlex])
})

test('a conflicting raw field must exist on the specified product', () => {
  for (const [id, fields] of Object.entries(blockedFieldsById)) {
    const product = productsById.get(id)
    assert.ok(product, id)
    for (const name of fields) {
      assert.ok(product.parameters.some((entry) => entry.name === name), id + ' ' + name)
    }
  }
  assert.deepEqual(blockedFieldsById['66b1c72d59692e0012397b2a'], ['HARMONICZNE KOMPENSOWANE'])
  assert.ok(blockedFieldsById[isunaL30S].includes('MAKS__DOT__ MOC WYJSCIOWA'))
  assert.ok(blockedFieldsById[oasis60].includes('ROZBUDOWA'))
})

test('facts keep Aniro battery capacity, power and formula conditions separate', () => {
  const suness = typedFacts(suness15)
  assert.deepEqual(suness, {
    nominalCapacityKwh: '15 kWh',
    usableCapacityKwh: '13.5 kWh',
    nominalChargeDischargePowerKw: '7.5 kW',
  })
  assert.ok(pdfFactsById[suness15].some((entry) => entry.value === '12.6 kW przez 20 s'))
  assert.deepEqual(typedFacts(ciess160), { nominalCapacityKwh: '160 kWh' })
  const calculation = pdfFactsById[ciess160].find((entry) => entry.label.startsWith('Obliczenie'))
  assert.match(calculation.value, /^8 pakietów × 20 kWh\/pakiet = 160 kWh/)
  assert.equal(sourcePdf(calculation.source).page, 1)
  assert.deepEqual(typedFacts(oasis60), { nominalCapacityKwh: '60 kWh' })
})

test('manufacturer lists certify only the 21 identified model pairs in their narrow scope', () => {
  assert.equal(compatibilityPairs.length, 21)
  const keys = new Set(compatibilityPairs.map((pair) => pair.ids.slice().sort().join('|')))
  assert.equal(keys.size, 21)
  for (const { ids, source, scope } of compatibilityPairs) {
    assert.equal(ids.length, 2)
    assert.ok(ids.every((id) => productsById.has(id)))
    assert.ok(sourcePdf(source))
    assert.ok(scope.trim())
  }
  const pairExists = (a, b) => keys.has([a, b].sort().join('|'))
  assert.ok(pairExists(oasis60, isuna20))
  assert.ok(pairExists(oasis60, solinteg50))
  assert.ok(pairExists(ciess160, solinteg50))
  assert.ok(!pairExists(oasis60, pwsEx))
  assert.ok(!pairExists(ciess160, isunaL30S))
  assert.ok(!pairExists(oasisFlex, isuna20))
  assert.ok(!pairExists(suness15, isuna20))
})

test('source links resolve only reviewed public PDFs and bounded pages', () => {
  assert.deepEqual(sourcePdf('karta_katalogowa_OASIS_60.pdf, s. 1–2'), {
    file: 'karta_katalogowa_OASIS_60.pdf',
    page: 1,
  })
  assert.equal(sourcePdf('karta_katalogowa_OASIS_60.pdf, s. 3'), null)
  assert.equal(sourcePdf('../../karta_katalogowa_OASIS_60.pdf, s. 2'), null)
  assert.equal(sourcePdf('Niezweryfikowany dokument.pdf, s. 1'), null)
  assert.equal(sourcePdf(undefined), null)
})
