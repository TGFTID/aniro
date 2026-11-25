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
  const groups = data.kinds.filter(kind => categories[kind]).map(kind => ({kind, ...categories[kind], products:alternatives(catalog,kind,data)}));
  const controls = groups.map(({kind,label,unit,field,input,products}) => {
    const requested = number(data[input]);
    const options = products.map(p => '<option value="'+escape(p.id)+'">'+escape(p.model)+' · '+escape(p.facts[field].value)+' '+unit+'</option>').join('');
    const reason = kind === 'compensator' ? 'Model przykładowy. Wymaganą moc w kvar ustali pomiar.' : requested ?
      'Na podstawie podanych '+escape(requested)+' '+unit+'.' : 'Model przykładowy do porównania cen.';
    return '<section class="offer-row"><img src="./src/quick-'+kind+'.png" alt=""><div><label>'+label+
      '<select data-model="'+kind+'"><option value="">Pomiń tę pozycję</option>'+options+'</select></label><small>'+reason+'</small></div><div class="offer-price" data-price="'+kind+'"></div></section>';
  }).join('');
  host.innerHTML='<div class="early-head"><h2 tabindex="-1">Twoja oferta wstępna</h2><p>Możesz zmienić model lub pominąć pozycję. Ceny jednostkowe z katalogu Aniro z '+escape(catalog.snapshotDate)+'.</p></div>'+
    controls+'<p data-pair-note class="muted"></p><p class="muted">Podstawa VAT i dostępność do potwierdzenia przed zakupem.</p>'+
    '<div class="early-actions"><button type="button" class="primary" data-benefits>Zobacz korzyści ↓</button><button type="button" data-edit>Zmień dane</button></div>'+
    '<div class="offer-benefits"></div><div class="early-actions"><button type="button" data-details>Doprecyzuj dobór i przygotuj wydruk</button><button type="button" data-help>Nie wiem · poproś elektryka</button></div>';
  const choices = {...prefs.choices};
  function refresh() {
    for (const {kind,products} of groups) {
      const product = products.find(p => p.id === choices[kind]);
      const box = host.querySelector('[data-price="'+kind+'"]');
      box.textContent = product ? unitPrice(product)+' / szt.' : products.length ? 'Pominięto' : 'Brak modelu o potwierdzonych parametrach';
      if (product) {
        const link = document.createElement('a'); link.textContent='Karta Aniro ↗';
        link.href='https://katalog.aniro.pl/product/'+encodeURIComponent(product.id)+'/'; link.target='_blank'; link.rel='noopener'; box.append(link);
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
  const benefits = mountBenefits(host.querySelector('.offer-benefits'),data,prefs.benefits);
  const benefitPanel = host.querySelector('.benefit');
  const solarHost = document.createElement('div');
  host.querySelector('.offer-benefits').append(solarHost);
  const solar = mountSolarBenefits(solarHost,data,prefs.solar);
  function applyBenefitsScope() {
    benefitPanel.hidden = !Boolean(choices.compensator) && !groups.some(row => row.kind === 'compensator' && !row.products.length);
    solarHost.hidden = !choices.inverter && !choices.storage;
    host.querySelector('[data-benefits]').disabled = solarHost.hidden && benefitPanel.hidden;
  }
  host.addEventListener('change',applyBenefitsScope,{signal:handlers.signal}); applyBenefitsScope();
  host.querySelector('[data-benefits]').onclick=()=>{if(!benefitPanel.hidden)benefits.open(); else if(!solarHost.hidden)solar.open(); host.querySelector('.offer-benefits').scrollIntoView({block:'start'});};
  host.querySelector('[data-edit]').onclick=handlers.edit;
  host.querySelector('[data-details]').onclick=handlers.details;
  host.querySelector('[data-help]').onclick=handlers.help;
  return {snapshot:()=>({choices:{...choices},benefits:benefits.prefs(),solar:solar.prefs()}), destroy:()=>benefits.destroy()};
}
