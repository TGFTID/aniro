import assert from "node:assert/strict";
import { test } from "node:test";
import { createIntake } from "../src/intake.js";

const source = "Projekt, s. 1";
const makeQuick = (values) => ({
  kinds: ["compensator", "inverter"], billTotal: "", reactiveFee: "", acPowerKw: "",
  capacityKwh: "", siteInverters: "", inverterModel: "", ...values,
});

function setup() {
  const actions = new Map();
  const fields = {
    innerHTML: "",
    addEventListener(event, listener) { actions.set(event, listener); },
    querySelector() { return { focus() {} }; },
  };
  let backs = 0;
  const intake = createIntake({
    form: { addEventListener() {} },
    fields,
    onChange() {},
    onBack() { backs++; },
  });
  return {
    intake, fields, backs: () => backs,
    click: (intakeAction) => actions.get("click")({ target: { closest: () => ({ dataset: { intakeAction } }) } }),
  };
}

test("stare sprawy wracają do zapisanego pytania i zachowują dawne kroki kontekstu", () => {
  const { intake, click } = setup();
  intake.open("compensation", {}, { position: "inverters", invoice: { billTotal: "580 zł" }, siteInverters: "yes" });
  assert.equal(intake.snapshot().progress.position, "inverters");
  click("back");
  const { progress } = intake.snapshot();
  assert.equal(progress.position, "invoice");
  assert.equal(progress.invoice.billTotal, "580 zł");
  assert.equal(progress.quick, undefined);
});

test("dane ze źródłem pomijają pytanie tylko przy nowym starcie, a wznowienie zachowuje dostępne kroki", () => {
  const quick = makeQuick({ acPowerKw: "20", reactiveFee: "234,50", siteInverters: "yes" });
  const instance = setup();
  const { intake } = instance;
  intake.open("compensation-inverter", {
    reactivePowerKvar: { value: "25", source },
    acPowerKw: { value: "20", source },
  }, { quick });
  const draft = intake.snapshot();
  assert.equal(draft.progress.position, "reactiveDirection");
  assert.deepEqual(draft.progress.quick, quick);
  assert.equal(draft.progress.invoice.reactiveFee, quick.reactiveFee);
  intake.open("compensation-inverter", draft.inputs, { ...draft.progress, position: "gridConnection" });
  instance.click("back");
  assert.equal(intake.snapshot().progress.position, "reactiveDirection");
  instance.click("back");
  assert.equal(instance.backs(), 1);
});

test("wznowienie akceptuje zadeklarowane kWh i pomoc dotyczy dopiero brakujących danych", () => {
  const quick = makeQuick({ kinds: ["storage"], capacityKwh: "4,5", siteInverters: "yes", inverterModel: "ISUNA <test>" });
  const { intake, fields, click } = setup();
  intake.open("storage", { capacityKwh: {value:"4,5", source:""} }, { quick, requestHelp:true, position:"capacityKwh" });
  const { inputs, progress } = intake.snapshot();
  assert.equal(progress.missingQuestion, "capacityBasis");
  assert.equal(inputs.capacityKwh.source, "Deklaracja klienta");
  assert.match(fields.innerHTML, /Podana pojemność magazynu to 4,5 kWh/);
  intake.open("storage", inputs, progress);
  click("return");
  assert.equal(intake.snapshot().progress.position,"capacityBasis");
  assert.doesNotMatch(fields.innerHTML,/Skąd pochodzi/);
});

test("wiadomości dla dwóch klas proszą o właściwe pomiary i właściwe dane urządzenia", () => {
  const { intake, fields } = setup();
  const quick = makeQuick({});
  intake.open("compensation-inverter", {}, { quick, requestHelp: true });
  assert.match(fields.innerHTML, /profil mocy biernej/);
  assert.match(fields.innerHTML, /moc wyjściową AC jednego falownika/);
  assert.doesNotMatch(fields.innerHTML, /minimalną pojemność magazynu/);
  intake.open("compensation-storage", {}, { quick: { ...quick, kinds: ["compensator", "storage"] }, requestHelp: true });
  assert.match(fields.innerHTML, /profil mocy biernej/);
  assert.match(fields.innerHTML, /minimalną pojemność magazynu/);
  assert.doesNotMatch(fields.innerHTML, /moc wyjściową AC jednego falownika/);
});
