import { mountBenefits, mountSolarBenefits } from './benefits.js';
import { evaluateCompatibility } from './selection.js';

const categories = {
  inverter: {label:'Falownik PV', field:'nominalAcPowerKw', unit:'kW', input:'acPowerKw', image:'inverter'},
  storage: {label:'Magazyn energii', field:'nominalCapacityKwh', unit:'kWh znam.', input:'capacityKwh', image:'storage'},
  compensator: {label:'Kompensator mocy biernej', field:'ratedReactivePowerKvar', unit:'kvar', image:'compensator'},
};
function number(value) { return Number(String(value ?? '').replace(',','.')); }
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function unitPrice(product) {
  const price = product.priceSnapshot;
  return price?.value > 0 && price.currency ? new Intl.NumberFormat('pl-PL',{style:'currency',currency:price.currency}).format(price.value) : 'Cena do potwierdzenia';
}

export function alternatives(catalog, kind, data) {
  const category = categories[kind];
  const target = number(data[category.input]);
  const voltage = number(data.networkVoltage || 400);
  const choices = catalog.products.filter(p => {
    if (p.kind !== kind) return false;
    const fact = p.facts[category.field];
    if (!fact?.source || fact.status === 'conflict' || !Number.isFinite(fact.value) || fact.value < target) return false;
    if (kind === 'compensator') {
      const rated = p.facts.nominalCompVoltageV?.value;
      const range = p.facts.supplyVoltageV?.value;
      if (rated != null && rated !== voltage || range && (voltage < range.min || voltage > range.max)) return false;
      if (!data.networkVoltage && p.facts.gridConnection?.value === '1P/2W') return false;
    }
    if (kind === 'inverter') {
      const supported = p.facts.nominalAcVoltageV;
      return supported?.source && Array.isArray(supported.value) && supported.value.includes(voltage);
    }
    return true;
  });
  return choices.sort((a,b) => a.facts[category.field].value - b.facts[category.field].value || a.model.localeCompare(b.model,'pl'));
}

export function renderInitialOffer(host, catalog, data, prefs, handlers) {
  const groups = Object.keys(categories).filter(kind => data.kinds.includes(kind)).map(kind => ({kind, ...categories[kind], products:alternatives(catalog,kind,data)}));
  const controls = groups.map(({kind,label,unit,field,products}) => {
    const options = products.map(p => '<option value="'+escape(p.id)+'">'+escape(p.model)+' · '+escape(p.facts[field].value)+' '+unit+'</option>').join('');
    return '<section class="offer-row"><img src="./src/quick-'+kind+'.png" alt=""><div class="offer-heading">'+
      '<label for="offer-'+kind+'">'+label+'</label><strong data-price="'+kind+'"></strong></div>'+
      '<select id="offer-'+kind+'" data-model="'+kind+'"><option value="">Pomiń tę pozycję</option>'+options+'</select></section>';
  }).join('');
  const remaining = Object.keys(categories).filter(kind => !data.kinds.includes(kind));
  const addNames = {inverter:'falownik',storage:'magazyn',compensator:'kompensator'};
  const extra = remaining.map(kind => '<button type="button" data-add-kind="'+kind+'">+ Dodaj '+addNames[kind]+'</button>').join('');
  const notes = groups.map(({kind,label,unit,input}) => {
    const target = number(data[input]);
    const reason = kind === 'compensator' ? 'Wymaganą moc w kvar ustali pomiar.' : target ? 'Podana wartość: '+escape(target)+' '+unit+'.' : 'Przykładowy model do porównania cen.';
    return '<p><strong>'+label+'</strong> · '+reason+' <span data-source="'+kind+'"></span></p>';
  }).join('');
  host.innerHTML='<div class="early-head"><h2 tabindex="-1">Twoja oferta wstępna</h2><p>Przykładowe modele Aniro. Zmień model lub pomiń pozycję.</p></div>'+
    '<div class="offer-list">'+controls+'</div>'+(extra ? '<div class="offer-add">'+extra+'</div>' : '')+
    '<div class="early-actions"><button type="button" class="primary" data-benefits>Zobacz korzyści ↓</button><button type="button" data-edit>Zmień dane</button></div>'+
    '<div class="offer-benefits" hidden><div class="benefit-tabs" role="group" aria-label="Korzyści urządzeń"><button type="button" data-benefit-tab="fee">Kompensator</button><button type="button" data-benefit-tab="solar">Falownik i magazyn</button></div><div data-fee-box></div><div data-solar-box></div></div>'+
    '<details class="offer-notes"><summary>Ceny, dobór i karty katalogowe</summary><p>Ceny za sztukę z '+escape(catalog.snapshotDate)+'. Podstawa VAT i dostępność do potwierdzenia przed zakupem.</p>'+notes+'<p data-pair-note></p></details>'+
    '<div class="early-actions supplemental"><button type="button" data-details>Doprecyzuj dobór i przygotuj wydruk</button><button type="button" data-help>Nie wiem · poproś elektryka</button></div>';
  for (const button of host.querySelectorAll('[data-add-kind]')) button.onclick = () => handlers.addKind(button.dataset.addKind);
  const choices = {...prefs.choices};
  function refresh() {
    for (const {kind,products} of groups) {
      const product = products.find(p => p.id === choices[kind]);
      const box = host.querySelector('[data-price="'+kind+'"]');
      box.textContent = product ? unitPrice(product)+' / szt.' : products.length ? 'Pominięto' : 'Brak modelu o potwierdzonych parametrach';
      const source = host.querySelector('[data-source="'+kind+'"]');
      source.replaceChildren();
      if (product) {
        const link = document.createElement('a'); link.textContent='Karta Aniro ↗';
        link.href='https://katalog.aniro.pl/product/'+encodeURIComponent(product.id)+'/'; link.target='_blank'; link.rel='noopener'; source.append(link);
      }
    }
    const a=catalog.byId[choices.storage], b=catalog.byId[choices.inverter];
    host.querySelector('[data-pair-note]').textContent = a && b ? 'Współpraca falownika i magazynu: '+evaluateCompatibility(a,b,catalog).reason : '';
  }
  for (const {kind,products} of groups) {
    const select = host.querySelector('[data-model="'+kind+'"]');
    const proposed = products.find(p => p.priceSnapshot?.value > 0 && p.availabilitySnapshot !== false) ?? products[0];
    select.value = choices[kind] === '' || products.some(p=>p.id===choices[kind]) ? choices[kind] : proposed?.id ?? '';
    choices[kind]=select.value; select.onchange=()=>{choices[kind]=select.value;refresh();};
  }
  refresh();
  const region = host.querySelector('.offer-benefits');
  const feeHost = region.querySelector('[data-fee-box]'), solarHost = region.querySelector('[data-solar-box]');
  const benefits = mountBenefits(feeHost,data,prefs.benefits);
  const solar = mountSolarBenefits(solarHost,data,prefs.solar);
  const feeTab = region.querySelector('[data-benefit-tab="fee"]'), solarTab = region.querySelector('[data-benefit-tab="solar"]');
  let active = prefs.benefitTab === 'solar' ? 'solar' : 'fee';
  function applyBenefitsScope() {
    feeTab.hidden = !choices.compensator;
    solarTab.hidden = !choices.inverter && !choices.storage;
    solarTab.textContent = choices.inverter && choices.storage ? 'Falownik i magazyn' : choices.inverter ? 'Falownik' : 'Magazyn';
    if (feeTab.hidden) active='solar';
    if (solarTab.hidden) active='fee';
    feeHost.hidden = active !== 'fee' || feeTab.hidden;
    solarHost.hidden = active !== 'solar' || solarTab.hidden;
    feeTab.setAttribute('aria-pressed',String(!feeHost.hidden)); solarTab.setAttribute('aria-pressed',String(!solarHost.hidden));
    const empty = feeTab.hidden && solarTab.hidden;
    if (empty) region.hidden = true;
    host.querySelector('[data-benefits]').disabled = empty;
    if (!region.hidden && !empty) (active === 'fee' ? benefits : solar).open();
  }
  for (const tab of [feeTab,solarTab]) tab.onclick = () => {active=tab.dataset.benefitTab;applyBenefitsScope();};
  host.addEventListener('change',applyBenefitsScope,{signal:handlers.signal}); applyBenefitsScope();
  host.querySelector('[data-benefits]').onclick=()=>{region.hidden=false;applyBenefitsScope();region.scrollIntoView({block:'start'});};
  host.querySelector('[data-edit]').onclick=handlers.edit;
  host.querySelector('[data-details]').onclick=handlers.details;
  host.querySelector('[data-help]').onclick=handlers.help;
  return {snapshot:()=>({choices:{...choices},benefits:benefits.prefs(),solar:solar.prefs(),benefitTab:active}), destroy:()=>benefits.destroy()};
}
