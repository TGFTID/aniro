const zl = new Intl.NumberFormat('pl-PL', {style:'currency', currency:'PLN', minimumFractionDigits:0, maximumFractionDigits:2});
const money = cents => zl.format(cents / 100);

export function cents(raw) {
  const value = String(raw ?? '').trim().replace(/\s/g,'').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(amount) && Number.isSafeInteger(amount * 1200) ? amount : null;
}

export function estimate(bill, fee, invoicePeriod, percent, displayPeriod) {
  if (bill === null || fee === null || fee > bill || percent < 0 || percent > 100) return null;
  const savings = Math.floor((fee * percent + 50) / 100);
  const scale = (displayPeriod === 'year' ? 12 : 1) / (invoicePeriod === 'year' ? 12 : 1);
  const before = Math.round(bill * scale);
  const saved = Math.round(savings * scale);
  return {before, after:before-saved, saved, annual:savings * (invoicePeriod === 'year' ? 1 : 12)};
}

export function mountBenefits(host, context, saved = {}) {
  host.innerHTML = `<details class="benefit"><summary>Ile mogę zaoszczędzić?</summary>
    <div class="benefit-body">
      <div class="benefit-top"><div><h3>Twój rachunek po zmianie</h3><p data-info></p></div>
      <div class="benefit-period" role="group" aria-label="Pokaż wynik"><button type="button" data-view="month">Miesiąc</button><button type="button" data-view="year">Rok</button></div></div>
      <div data-empty><p></p><button type="button" data-example>Pokaż przykład</button></div>
      <div data-results>
        <label class="benefit-range">Zakładany spadek opłaty za energię bierną <output data-percent></output><input type="range" min="0" max="100" step="1" value="100"></label>
        <div class="benefit-hero"><strong data-saving></strong><span data-for></span></div>
        <div class="benefit-bars"><div><span>Rachunek dziś</span><b data-before></b></div><div class="benefit-track"><i></i></div>
        <div><span>Po zmianie</span><b data-after></b></div><div class="benefit-track benefit-after"><i></i></div></div>
        <p class="benefit-small">Cel symulacji dotyczy opłaty za energię bierną. Pozostałe opłaty są stałe. Koszty eksploatacji pominięto.</p>
        <label class="benefit-cost">Koszt inwestycji w kompensację brutto (zł)<input type="text" inputmode="decimal" placeholder="Opcjonalnie, z oferty"></label>
        <p class="benefit-small" data-cost-error hidden>Wpisz koszt w złotych, do dwóch miejsc po przecinku.</p>
        <div class="benefit-trend"><div><h4 data-trend-title></h4><strong data-end></strong></div>
          <canvas height="108" aria-hidden="true"></canvas><div class="benefit-axis"><span>Start</span><span>6 mies.</span><span>12 mies.</span></div>
          <p data-return></p></div><p class="benefit-small" data-assumption></p>
      </div>
    </div></details>`;
  const q = key => host.querySelector(key);
  const range = q('[type=range]'), cost = q('.benefit-cost input'), panel = q('details');
  const renderText = (selector, value) => { q(selector).textContent = value; };
  const inputPeriod = context.billingPeriod === 'year' ? 'year' : 'month';
  let period = saved.period === 'year' || saved.period === 'month' ? saved.period : inputPeriod;
  let example = false;
  range.value = saved.percent ?? 100;
  cost.value = saved.cost ?? '';
  const currency = n => money(Math.round(n));
  const prefs = () => ({percent:Number(range.value), cost:cost.value, period});
  function drawTrend(annual, investment) {
    const canvas = q('canvas');
    const width = canvas.clientWidth, height = 108;
    if (!width) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d'); ctx.scale(ratio,ratio);
    const start = -(investment ?? 0), end = start + annual;
    const top = Math.max(0,end), bottom = Math.min(0,start);
    const y = value => height - 12 - (value - bottom) / (top-bottom || 1) * (height-24);
    const x1 = 6, x2 = width-6;
    const shade = ctx.createLinearGradient(0,0,0,height);
    shade.addColorStop(0,'rgba(44,145,112,.32)'); shade.addColorStop(1,'rgba(44,145,112,.03)');
    ctx.fillStyle=shade; ctx.beginPath(); ctx.moveTo(x1,y(start)); ctx.lineTo(x2,y(end)); ctx.lineTo(x2,height); ctx.lineTo(x1,height); ctx.fill();
    ctx.strokeStyle='#9aa6a0'; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.moveTo(x1,y(0)); ctx.lineTo(x2,y(0)); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle='#247b60'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x1,y(start)); ctx.lineTo(x2,y(end)); ctx.stroke();
    for (const [x, value] of [[x1,start],[x2,end]]) { ctx.beginPath(); ctx.arc(x,y(value),4,0,2*Math.PI); ctx.fillStyle='#247b60'; ctx.fill(); }
    if (investment > 0 && investment < annual) {
      ctx.beginPath(); ctx.arc(x1+(x2-x1)*investment/annual,y(0),5,0,2*Math.PI); ctx.fillStyle='#b62a20'; ctx.fill();
    }
  }
  function render() {
    const bill = example ? 400000 : cents(context.billTotal), fee = example ? 60000 : cents(context.reactiveFee);
    const sourcePeriod = example ? 'month' : inputPeriod;
    const result = estimate(bill,fee,sourcePeriod,Number(range.value),period);
    for (const tab of host.querySelectorAll('[data-view]')) tab.setAttribute('aria-pressed', String(tab.dataset.view === period));
    q('[data-empty]').hidden = !!result; q('[data-results]').hidden = !result;
    renderText('[data-info]', (example ? 'Przykład · ' : '') + (sourcePeriod === 'year' ? 'Podstawa: faktura roczna brutto' : 'Podstawa: faktura miesięczna brutto'));
    if (!result) {
      const wrong = bill !== null && fee !== null && fee > bill;
      renderText('[data-empty] p', wrong ? 'Kwota energii biernej przekracza całą fakturę. Popraw kwoty na pierwszej stronie.' : 'Do wykresu potrzebne są dwie kwoty brutto z tej samej faktury: całość i opłata za energię bierną.');
      q('[data-example]').hidden = bill !== null || fee !== null;
      return;
    }
    const investment = cents(cost.value);
    q('[data-cost-error]').hidden = !cost.value.trim() || investment !== null;
    renderText('[data-percent]',range.value+'%');
    renderText('[data-saving]',currency(result.saved));
    renderText('[data-for]',period === 'month' ? 'mniej na miesiąc' : 'mniej na rok');
    renderText('[data-before]',currency(result.before)); renderText('[data-after]',currency(result.after));
    q('.benefit-track i').style.width = result.before > 0 ? '100%' : '0';
    q('.benefit-after i').style.width = (result.before ? 100 * result.after / result.before : 0)+'%';
    renderText('[data-trend-title]',investment === null ? 'Oszczędności po 12 miesiącach' : 'Saldo po 12 miesiącach od zakupu');
    renderText('[data-end]',currency(result.annual - (investment ?? 0)));
    const monthsExact = investment !== null && result.annual ? investment * 12 / result.annual : null;
    renderText('[data-return]',investment === null ? 'Wpisz koszt zakupu, aby zobaczyć okres zwrotu.' :
      investment === 0 ? 'Wpisany koszt zakupu wynosi 0 zł.' : monthsExact === null ? 'Przy tym celu inwestycja się nie zwraca.' :
      'Prosty zwrot po ok. ' + new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(monthsExact) + ' mies.');
    renderText('[data-assumption]',sourcePeriod === 'month' ? 'Rok zakłada 12 miesięcy takich jak na tej fakturze.' : 'Wynik miesięczny jest średnią z rocznej faktury.');
    drawTrend(result.annual,investment);
  }
  for (const tab of host.querySelectorAll('[data-view]')) tab.onclick = () => { period = tab.dataset.view; render(); };
  q('[data-example]').onclick = () => { example = true; render(); };
  range.oninput = cost.oninput = render;
  panel.ontoggle = render;
  const observer = new ResizeObserver(render); observer.observe(host);
  render();
  return {prefs, destroy:() => observer.disconnect(), open:() => { panel.open=true; render(); }};
}

export function mountSolarBenefits(host, data, saved = {}) {
  const invoiceYear = data.billingPeriod === 'year';
  host.innerHTML = `<details class="benefit"><summary>Korzyści z magazynu i falownika</summary><div class="benefit-body">
    <div class="benefit-top"><div><h3>Wykorzystanie własnego prądu</h3><p>Podaj dane dla okresu faktury: ${invoiceYear ? 'rok' : 'miesiąc'}. Moc urządzenia nie określa oszczędności.</p></div>
    <div class="benefit-period" role="group" aria-label="Okres wyniku PV"><button type="button" data-solar-period="month">Miesiąc</button><button type="button" data-solar-period="year">Rok</button></div></div>
    <label class="benefit-cost">Ile mniej energii kupisz z sieci? (kWh)<input name="avoided" inputmode="decimal"></label>
    <label class="benefit-cost">Cena zakupu zaoszczędzonej kWh brutto (zł)<input name="tariff" inputmode="decimal"></label>
    <label class="benefit-cost">O ile spadnie przychód ze sprzedaży energii w tym okresie? (zł)<input name="lostRevenue" inputmode="decimal"></label>
    <p class="benefit-small">Wykorzystaj profil zużycia i produkcji PV oraz swoją taryfę. W ilości energii uwzględnij straty magazynu. Gdy nie sprzedajesz energii, wpisz 0 zł.</p>
    <div class="benefit-hero"><strong data-solar-total>—</strong><span></span></div><p class="benefit-small" data-solar-hint></p></div></details>`;
  const get = key => host.querySelector(key);
  let period = saved.period || (invoiceYear?'year':'month');
  const fields = [...host.querySelectorAll('input')];
  for (const input of fields) input.value=saved[input.name] ?? '';
  function render() {
    const [energy,tariff,lost]=fields.map(input=>cents(input.value));
    for (const tab of host.querySelectorAll('[data-solar-period]')) tab.setAttribute('aria-pressed',String(period===tab.dataset.solarPeriod));
    const valid = energy !== null && tariff !== null && lost !== null && Number.isSafeInteger(energy * tariff);
    const gain = valid ? (Math.round(energy*tariff/100)-lost) * (period==='year'?12:1) / (invoiceYear?12:1) : null;
    get('[data-solar-total]').textContent = valid ? money(Math.round(gain)) : '—';
    get('.benefit-hero span').textContent = valid ? (period==='month'?'bilans na miesiąc':'bilans na rok') : '';
    get('[data-solar-hint]').textContent = valid ? 'Uniknięty koszt zakupu pomniejszony o utracony przychód. '+(invoiceYear?'Miesiąc to średnia roczna.':'Wynik roczny zakłada 12 identycznych miesięcy.') : 'Wpisz trzy wartości, aby obliczyć zmianę kosztu. Ten wariant obejmuje wspólny efekt PV i magazynu.';
  }
  for (const input of fields) input.oninput=render;
  for (const tab of host.querySelectorAll('[data-solar-period]')) tab.onclick=()=>{period=tab.dataset.solarPeriod;render();};
  render();
  return {open:()=>{get('details').open=true;},prefs:()=>({period,...Object.fromEntries(fields.map(input=>[input.name,input.value]))})};
}
