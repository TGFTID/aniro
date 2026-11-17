const isunaSheetPl = '2026 Sinexcel Isuna 5-20kW wersja PL8102026.pdf'
const isunaSheetEn = '2026 Sinexcel Isuna 5-20kW.pdf'
const isunaSheet = isunaSheetPl + ', s. 1; ' + isunaSheetEn + ', s. 1'
const isunaCertificate = 'Falowoniki Isuna 22-50 KW Certyfiakt.pdf'
const sunessSheet = 'Sunwoda-SunESS-H_karta_katalogowa PL8102026.pdf'
const oasis60Sheet = 'karta_katalogowa_OASIS_60.pdf'
const oasisA200Sheet = 'Brochure-OASIS A200.pdf'

const publicPdfPages = new Map([
  [isunaSheetPl, 1],
  [isunaSheetEn, 1],
  [isunaCertificate, 7],
  [sunessSheet, 2],
  [oasis60Sheet, 2],
  [oasisA200Sheet, 2],
])

export function sourcePdf(source) {
  if (typeof source !== 'string') return null
  const match = /^([^,]+), s\. ([1-9]\d*)(?=$|[–,;])/u.exec(source)
  if (!match) return null
  const [, file, pageText] = match
  const page = Number(pageText)
  return page > 0 && page <= publicPdfPages.get(file) ? { file, page } : null
}

function fact(label, value, source, field, status = 'confirmed') {
  return field ? { label, value, source, status, field } : { label, value, source, status }
}

// Each row is keyed to the exact model and public catalogue ID.
const isunaSmall = [
  { id: '6745763312e63a0012b3b8f7', power: 5, backupA: 7.5, gridOutA: 8, gridInA: 15, pvKwp: 10, fullLoadV: 125, peakKva: 10 },
  { id: '6745763312e63a0012b3b8f8', power: 6, backupA: 9, gridOutA: 10, gridInA: 18, pvKwp: 12, fullLoadV: 125, peakKva: 10 },
  { id: '6745763312e63a0012b3b8f9', power: 8, backupA: 12, gridOutA: 13, gridInA: 24, pvKwp: 16, fullLoadV: 160, peakKva: 10 },
  { id: '662a3c0459692e0012ad9e26', power: 10, backupA: 15, gridOutA: 16, gridInA: 29, pvKwp: 20, fullLoadV: 210, peakKva: 11 },
  { id: '662a3c0459692e0012ad9e27', power: 12, backupA: 18, gridOutA: 20, gridInA: 35, pvKwp: 24, fullLoadV: 250, peakKva: 13.2 },
  { id: '662a3c0459692e0012ad9e28', power: 15, backupA: 22.5, gridOutA: 24, gridInA: 44, pvKwp: 30, fullLoadV: 300, peakKva: 16.5 },
  { id: '662a3c0459692e0012ad9e29', power: 18, backupA: 27, gridOutA: 29, gridInA: 52, pvKwp: 30, fullLoadV: 360, peakKva: 19.8 },
  { id: '662a3c0459692e0012ad9e2a', power: 20, backupA: 30, gridOutA: 32, gridInA: 58, pvKwp: 30, fullLoadV: 400, peakKva: 22 },
]

const isunaLarge = [
  { id: '6a1d8193f6a77babe02f3ef5', power: 30, maxOutputA: 47.9, apparentKva: 33, pvInputA: '40 / 40 / 40', pvShortCircuitA: '60 / 60 / 60', dcPage: '2' },
  { id: '6a1d8193f6a77babe02f3ef6', power: 40, maxOutputA: 63.8, apparentKva: 44, pvInputA: '40 / 40 / 40 / 40', pvShortCircuitA: '60 / 60 / 60 / 60', dcPage: '3' },
  { id: '6a1d8193f6a77babe02f3ef7', power: 50, maxOutputA: 79.8, apparentKva: 55, pvInputA: '40 / 40 / 40 / 40', pvShortCircuitA: '60 / 60 / 60 / 60', dcPage: '3' },
]

const suness = [
  { id: '668cd86e59692e0012d57173', nominal: 5, usable: 4.5, ratedKw: 2.5, peakKw: 4.2, height: 553, weight: 65 },
  { id: '668cd86e59692e0012d57174', nominal: 10, usable: 9, ratedKw: 5, peakKw: 8.4, height: 868, weight: 117 },
  { id: '668cd86e59692e0012d57175', nominal: 15, usable: 13.5, ratedKw: 7.5, peakKw: 12.6, height: 1183, weight: 169 },
  { id: '668cd86e59692e0012d57176', nominal: 20, usable: 18, ratedKw: 10, peakKw: 16.8, height: 1498, weight: 221 },
]

const oasis60Id = '662a3c0459692e0012ad9e81'
const isuna20000TId = '662a3c0459692e0012ad9e2a'
const oasisA200 = [
  { id: '6a7c2d9ad38ec2b6cc29f355', nominal: 120, packs: 6, voltage: 384, range: '348–432 V' },
  { id: '6a7c2d9ad38ec2b6cc29f356', nominal: 160, packs: 8, voltage: 512, range: '464–576 V' },
  { id: '6a7c2d9ad38ec2b6cc29f357', nominal: 200, packs: 10, voltage: 640, range: '580–720 V' },
]

const solintegMht100Ids = [
  '6a1d8193f6a77babe02f3efb', // MHT-25K-100
  '6a1d8193f6a77babe02f3efc', // MHT-30K-100
  '6a1d8193f6a77babe02f3efd', // MHT-36K-100
  '6a1d8193f6a77babe02f3efe', // MHT-40K-100
  '69aa8007f6a77babe0ba32c7', // MHT-50K-100
]

function smallIsunaFacts(model) {
  return [
    fact('Znamionowa moc wyjściowa on-grid i off-grid', model.power + ' kW', isunaSheet, 'nominalAcPowerKw'),
    fact('Znamionowe napięcia międzyfazowe on-grid', '380 / 400 / 415 V AC', isunaSheet, 'nominalAcVoltageV'),
    fact('Wyjście off-grid', 'Trójfazowe 3/N/PE, 220/380 lub 230/400 V, 50/60 Hz; prąd znamionowy ' + model.backupA + ' A; szczyt ' + model.peakKva + ' kVA przez 60 s; THDu <3%', isunaSheet),
    fact('On-grid: maksymalne prądy i moc wejściowa z sieci', 'Wyjście ' + model.gridOutA + ' A; wejście ' + model.gridInA + ' A i ' + (model.power * 2) + ' kW', isunaSheet),
    fact('Maksymalna moc wejścia PV', model.pvKwp + ' kWp', isunaSheet),
    fact('Napięcia wejścia PV', 'Maks. 1000 V; MPPT 130–960 V; znamionowe 600 V; start 200 V', isunaSheet),
    fact('Prądy wejścia PV', 'Maks. 25 A na MPPT; zwarciowy 30 A na MPPT; 2 MPPT po maks. 2 łańcuchy', isunaSheet),
    fact('Zakres napięcia baterii na wejściu falownika', '125–800 V', isunaSheet),
    fact('Napięcie baterii wymagane przy pełnym obciążeniu', model.fullLoadV + '–800 V', isunaSheet),
    fact('Wejścia i prądy baterii', '2 niezależne wejścia; 25 A na wejście; 35 A na wejście przez 60 s; typy: Li-ion, kwasowo-ołowiowy, sodowo-jonowy', isunaSheet),
    fact('Praca równoległa falowników i przełączenie', 'Do 6 jednostek w trybie off-grid (doprecyzowanie EN); przełączenie on/off-grid <10 ms', isunaSheet),
    fact('Obudowa i warunki pracy', 'IP65; −25 do +60°C; do 5000 m n.p.m., redukcja mocy powyżej 3000 m; 573 × 509 × 219 mm (szer. × wys. × gł.), 35 kg', isunaSheet),
  ]
}

function largeIsunaFacts(model) {
  const dcSource = isunaCertificate + ', s. ' + model.dcPage + ', A.2'
  const acSource = isunaCertificate + ', s. 3, A.2'
  return [
    fact('Znamionowa moc czynna AC', model.power + ' kW', acSource, 'nominalAcPowerKw'),
    fact('Napięcie międzyfazowe wyjścia AC przy nastawach dla Polski, 50 Hz', '400 V AC', acSource, 'nominalAcVoltageV'),
    fact('Wyjście AC objęte certyfikatem', '230/400 V, 3L + N + PE, 50 Hz; maks. ' + model.maxOutputA + ' A i ' + model.apparentKva + ' kVA', acSource),
    fact('Wejście PV objęte certyfikatem', 'Maks. 1000 V; MPPT 150–850 V; maks. prądy wejścia ' + model.pvInputA + ' A; maks. prądy zwarciowe ' + model.pvShortCircuitA + ' A', dcSource),
    fact('Wejście baterii objęte certyfikatem', '140–800 V; maks. ładowanie 80 / 80 A; maks. rozładowanie 80 / 80 A; litowa, kwasowo-ołowiowa lub sodowa', dcSource),
    fact('Warunki i budowa badanych jednostek', 'IP66; −25 do +60°C; klasa I; kategoria przepięciowa AC III / DC II; bez separacji galwanicznej', acSource),
    fact('Zakres dokumentu zgodności sieciowej', 'LS260247GCC-0, 23.09.2026–22.09.2031 według dokumentu; PPM typu A, V100 i PL: NC RFG. Status wydania i ważność wymagają sprawdzenia u wystawcy', isunaCertificate + ', s. 1–2, 4–7', undefined, 'requires-review'),
  ]
}

function sunessFacts(model) {
  const spec = sunessSheet + ', s. 2'
  const module = sunessSheet + ', s. 1'
  return [
    fact('Pojemność nominalna', model.nominal + ' kWh', spec, 'nominalCapacityKwh'),
    fact('Pojemność użytkowa w teście 90% DoD, 25°C, 0,2C', model.usable + ' kWh', spec + ', przypis 1', 'usableCapacityKwh'),
    fact('Znamionowa moc ładowania/rozładowania (zależna od temperatury i SOC)', model.ratedKw + ' kW', spec + ', przypis 2', 'nominalChargeDischargePowerKw'),
    fact('Szczytowa moc wyjściowa baterii', model.peakKw + ' kW przez 20 s', spec),
    fact('Napięcie baterii', '400 V nominalnie; zakres 350–450 V', spec),
    fact('Rozbudowa', 'Do 3 wież i 60 kWh nominalnych; opcjonalny Data box obsługuje pracę równoległą; wymagania według instrukcji', spec + ', przypis 3'),
    fact('Warunki pracy i obudowa', 'Wewnątrz i na zewnątrz; IP65; −20 do +50°C; 5–95% bez kondensacji; <4000 m n.p.m.; konwekcja naturalna', spec),
    fact('Ogrzewanie w niskiej temperaturze', 'Falownik musi obsługiwać sygnał żądania podgrzewania baterii', spec + ', przypis 4'),
    fact('Gabaryty i masa', '653 × ' + model.height + ' × 189 wg tabeli; ' + model.weight + ' kg', spec),
    fact('Komunikacja i wyłącznik DC', 'CAN 2.0 / RS485; wyłącznik nadprądowy 50 A, klasa 1000 V', spec),
    fact('Konstrukcja modułu 5 kWh', 'Ogniwa LFP, optymalizator DC/DC, aktywne równoważenie, grzałka i czujniki temperatury', module),
    fact('Gwarancja według karty', '10 lat zgodnie z warunkami gwarancji', spec + ', przypis 5'),
  ]
}

const oasis60Spec = oasis60Sheet + ', s. 2, tabela CIESS 60'
const oasis60Facts = [
  fact('Pojemność nominalna CIESS 60', '60 kWh', oasis60Spec, 'nominalCapacityKwh'),
  fact('Budowa i napięcie baterii', '12 pakietów; 614,4 V nominalnie; 537,6–691,2 V', oasis60Spec),
  fact('Maksymalny C-rate', '1C', oasis60Spec),
  fact('Rozbudowa wg karty', 'Do 6 szaf równolegle, łącznie do 360 kWh nominalnych; katalog wskazuje do 180 kWh', oasis60Sheet + ', s. 1–2', undefined, 'requires-review'),
  fact('Warunki pracy i obudowa', 'IP55; −20 do +55°C; 10–95% RH bez kondensacji; maks. 2000 m n.p.m.; klimatyzacja', oasis60Spec),
  fact('Gabaryty i masa', '731 × 767 × 2116 mm (dł. × szer. × wys.); 807 kg', oasis60Spec),
  fact('Warunki deklaracji cykli', '6000 cykli (25°C, 0,5C/0,5C, 90% DoD, EOL 60%); odrębna deklaracja do 100% DoD nie określa energii użytkowej', oasis60Sheet + ', s. 1–2'),
  fact('Architektura', 'Osobny PCS; CAN do EMS lub PCS; tabela CAN/RS485/Wi-Fi; BMS, klimatyzacja, czujnik dymu i aerozolowy system gaszenia', oasis60Sheet + ', s. 1–2'),
  fact('Gwarancja według karty', '5 lat zgodnie z warunkami gwarancji', oasis60Spec),
]

function oasisA200Facts(model) {
  const spec = oasisA200Sheet + ', s. 1, tabela CIESS'
  return [
    fact('Pojemność nominalna CIESS-' + model.nominal, model.nominal + ' kWh', spec, 'nominalCapacityKwh'),
    fact('Obliczenie pojemności nominalnej gotowej szafy', model.packs + ' pakietów × 20 kWh/pakiet = ' + (model.packs * 20) + ' kWh. Wynik potwierdza wiersz „Rated Capacity” dla tej szafy.', spec),
    fact('Budowa i napięcie baterii', model.packs + ' pakietów po 20 kWh; LFP 3,2 V / 314 Ah; ' + model.voltage + ' V nominalnie; zakres ' + model.range, spec),
    fact('Maksymalny C-rate ładowania/rozładowania', '0,7C', spec),
    fact('Praca na zewnątrz, warunki i obudowa', 'IP55; −30 do +55°C, obniżenie mocy powyżej 45°C; 0–95% bez kondensacji; karta podaje 3000 m n.p.m., katalog <2000 m', spec, undefined, 'requires-review'),
    fact('Gabaryty i masa', '1150 × 2200 × 1375 mm (szer. × wys. × gł.); <2300 kg', spec),
    fact('Warunki deklaracji cykli ogniw', '9000 cykli (25°C, 0,5C/0,5C, 90% DoD, EOL 70%); odrębna deklaracja do 100% DoD nie określa energii użytkowej', oasisA200Sheet + ', s. 1–2'),
    fact('Rozbudowa', 'Karta wskazuje równoległą rozbudowę i brak konieczności stosowania DC combiner do 6 szaf; maksymalna liczba szaf w konkretnej konfiguracji wymaga instrukcji', oasisA200Sheet + ', s. 2', undefined, 'requires-review'),
    fact('Architektura', 'Zewnętrzny falownik/PCS; CAN/RS485/Ethernet; LCU, sterownik i BMS, klimatyzacja; schemat pokazuje czujniki, zdjęcie system gaszenia i interfejs wodny', oasisA200Sheet + ', s. 1–2'),
  ]
}

export const pdfFactsById = {
  ...Object.fromEntries(isunaSmall.map((model) => [model.id, smallIsunaFacts(model)])),
  ...Object.fromEntries(isunaLarge.map((model) => [model.id, largeIsunaFacts(model)])),
  ...Object.fromEntries(suness.map((model) => [model.id, sunessFacts(model)])),
  [oasis60Id]: oasis60Facts,
  ...Object.fromEntries(oasisA200.map((model) => [model.id, oasisA200Facts(model)])),
}

export const blockedFieldsById = {
  '66b1c72d59692e0012397b2a': ['HARMONICZNE KOMPENSOWANE'],
  ...Object.fromEntries(isunaSmall.map((model) => [
    model.id,
    [
      'ZNAMIONOWY PRAD WYJSCIOWY',
      ...(model.power <= 8 ? ['NAPIECIE ROZRUCHOWE'] : ['ZAKRES NAPIECIA REGULATORA MPPT', 'ZNAMIONOWE NAPIECIE FOTOWOLTAIKI']),
    ],
  ])),
  '6a1d8193f6a77babe02f3ef5': ['MAKS__DOT__ NATEZENIE WEJSCIOWE FOTOWOLTAIKI', 'MAKS__DOT__ MOC WYJSCIOWA'],
  ...Object.fromEntries(suness.map((model) => [
    model.id,
    ['ZNAMIONOWE NAPIECIE BATERII', 'MAX PRAD LADOWANIA/ROZLADOWANIA', 'TEMPERATURA PRACY', 'WILGOTNOSC', 'WYSOKOSC N__DOT__P__DOT__M__DOT__'],
  ])),
  [oasis60Id]: ['ZAKRES NAPIECIA BATERII', 'CYKL ZYCIA BATERII', 'ROZBUDOWA', 'TEMPERATURA PRACY'],
  ...Object.fromEntries(oasisA200.map((model) => [model.id, ['WYSOKOSC N__DOT__P__DOT__M__DOT__']])),
}

export const compatibilityPairs = [
  {
    ids: [oasis60Id, isuna20000TId],
    source: oasis60Sheet + ', s. 2, Approved Compatibility List of Inverter Brands',
    scope: 'CIESS 60 i Isuna 20000T wymienione na liście. Weryfikacja projektu obejmuje tryb pracy, wersje sprzętu i oprogramowania oraz limity mocy i komunikacji.',
  },
  ...solintegMht100Ids.map((id) => ({
    ids: [oasis60Id, id],
    source: oasis60Sheet + ', s. 2, Approved Compatibility List of Inverter Brands',
    scope: 'CIESS 60 i Solinteg MHT zakończony -100; lista podaje CEI 0-21/0-16. Wymagania dla konkretnej konfiguracji i rynku podlegają weryfikacji.',
  })),
  ...oasisA200.flatMap((model) => solintegMht100Ids.map((id) => ({
    ids: [model.id, id],
    source: oasisA200Sheet + ', s. 1, Approved Compatibility List of Inverter Brands',
    scope: 'Lista serii OASIS A200 obejmuje wariant CIESS-' + model.nominal + ' oraz wymienia dokładny model Solinteg MHT zakończony -100. Wymagania dla danej konfiguracji podlegają weryfikacji.',
  }))),
]
