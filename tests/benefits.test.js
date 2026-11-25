import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cents,estimate} from '../src/benefits.js';
test('periods, zero, blanks and rounding to grosze',()=>{
  assert.equal(cents(''),null);
  assert.equal(cents('0,00'),0);
  assert.equal(estimate(100,50,'month',29,'month').saved,15);
  assert.deepEqual(estimate(4800000,720000,'year',50,'month'),{before:400000,after:370000,saved:30000,annual:360000});
  assert.equal(estimate(400000,60000,'month',50,'year').saved,360000);
  assert.equal(estimate(4800000,720000,'year',100,'year').annual,720000);
  assert.equal(estimate(10,11,'month',100,'year'),null);
});
