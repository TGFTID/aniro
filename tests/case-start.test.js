import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarioKinds, scenarioFor, hasQuickData, startFromIntake, mergeStartInputs } from '../src/case-start.js';

test('every non-empty selection maps to one technical scope regardless of card order', () => {
  assert.equal(Object.keys(scenarioKinds).length, 7);
  for (const [scenario, kinds] of Object.entries(scenarioKinds)) {
    assert.equal(scenarioFor([...kinds].reverse()), scenario);
  }
  assert.equal(scenarioFor([]), null);
});

test('zero is an entered amount, an empty form has no draft', () => {
  assert.equal(hasQuickData({ kinds: [], billTotal: '', siteInverters: '' }), false);
  assert.equal(hasQuickData({ kinds: [], reactiveFee: '0' }), true);
});

test('earlier drafts populate current controls with precise technical values and invoice data', () => {
  const start = startFromIntake('inverter', {
    inputs: { acPowerKw: { value: 12.345, source: 'projekt' } },
    progress: { invoice: { billTotal: '125,60', reactiveFee: '0' }, siteInverters: 'yes' },
  });
  assert.deepEqual(start, { kinds:['inverter'], acPowerKw:'12.345', billTotal:'125,60',
    reactiveFee:'0', siteInverters:'yes', inverterModel:'' });
});

test('changing or clearing an active value invalidates only its source', () => {
  const previous = { acPowerKw:{value:'12.30',source:'projekt'}, capacityKwh:{value:'48',source:'projekt B'} };
  const continueWith = value => mergeStartInputs(previous, {kinds:['inverter'], acPowerKw:value});
  assert.equal(continueWith('12,3').acPowerKw.source, 'projekt');
  assert.equal(continueWith('12.45').acPowerKw.source, 'Deklaracja klienta');
  assert.equal(continueWith('').acPowerKw, undefined);
  assert.deepEqual(continueWith('').capacityKwh, previous.capacityKwh);
  assert.equal(previous.acPowerKw.value, '12.30');
});
