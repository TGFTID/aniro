# Reguły wstępnego doboru Aniro

Migawka katalogu pochodzi z 17.11.2026. Dokumentacja, strona i definicja pola są częścią każdej wykorzystywanej wartości. [Źródła, dokładne ID i wykaz rozbieżności](ANIRO-DATA-SOURCES.md).

## Wspólne zasady

1. Określ cel obiektu i potrzebne parametry. Wstępny filtr może porównać tylko tę samą wielkość fizyczną i warunki pracy. Oddziel energię nominalną baterii, użytkową energię baterii, znamionową moc po stronie DC, znamionową moc AC, moc pozorną oraz szczyty z czasem trwania.
2. Wyszukuj urządzenia według odpowiedniej kategorii, jednoznacznego ID i całego oznaczenia modelu z końcówką. Akcesoria stanowią osobne pozycje. Powiązanie katalogowe z akcesorium pomaga odnaleźć jego kartę.
3. Brak, sprzeczność, niejednoznaczna jednostka lub niewłaściwa definicja pola oznacza potrzebę ręcznej weryfikacji. Wartość PDF można wyświetlić obok katalogowej z nazwą i zakresem źródła.
4. Wynik filtra wymaga oceny konkretnej konfiguracji, warunków otoczenia, wymaganych zabezpieczeń i aktualności danych. Brak potwierdzonej pary magazyn–falownik pozostawia kwestię interoperacyjności otwartą.

## Kompensacja mocy biernej

- Z surowych pól można porównać znamionową moc w kvar, liczbę faz i układ przewodów, sposób montażu, IP oraz zakres napięcia, jeśli jednostki i znaczenie są jednoznaczne. Wykorzystać deklarację kompensacji indukcyjnej lub pojemnościowej, symetryzacji i listę rzędów harmonicznych tylko dla odpowiedniego ID i bez rozbieżności. [Katalog ASVG i szaf](https://katalog.aniro.pl/products/kompensatory-i-jakosc-energii/kompensatory-aktywne).
- Zachować rozdział między mocą znamionową modułu, prądem kompensatora a przekładnikami. Wartość „XX/5A” opisuje nieuzupełnioną przekładnię, a „zintegrowane” opisuje konstrukcję. Metoda doboru przekładni, rezerwy, okna pomiarów, limitów dynamicznych i łączenia szaf wymaga dodatkowej dokumentacji. Brak kart ASVG w dostarczonym pakiecie.
- Dla `66b1c72d59692e0012397b2a` zakres harmonicznych zawiera rozbieżność 13/15. Parametr pozostaje dostępny z ostrzeżeniem, ale nie rozstrzyga wymaganego rzędu. [ASVG 100 CABINET](https://katalog.aniro.pl/product/66b1c72d59692e0012397b2a/).

## Falowniki

- S1/S2, s. 1. Znamionową moc AC i maksymalny pobór z sieci wiązać z konkretnym modelem. Wiersz zakresu MPPT 130–960 V, startu 200 V oraz maks. wejścia PV 1000 V opisuje osobne progi. Ograniczenia prądowe wynoszą 25 A i 30 A zwarciowo na MPPT. Maks. dwa łańcuchy na każdy z dwóch MPPT to ograniczenie wejść. Projekt stringów wymaga danych modułów i warunków pracy.
- S1/S2, s. 1. Pole napięcia AC dotyczy wyłącznie znamionowego napięcia międzyfazowego pracy sieciowej. Dla Isuna 5000T–20000T karta podaje tu 380/400/415 V. Wyjście rezerwowe ma 380/400 V, odrębne wartości znamionowe i szczyty 60 s. Tryb rezerwowy wymaga ręcznego sprawdzenia napięcia, mocy i przełączania. Moc wejściowa z sieci dla rodziny jest w tabeli dwukrotnością znamionowej mocy AC modelu. Piktogram 58 A dotyczy najwyższego modelu, a sześć urządzeń równolegle w karcie EN dotyczy trybu off-grid.
- S1/S2, s. 1. Dwa niezależne wejścia bateryjne 125–800 V mają po 25 A i szczyt 35 A na 60 s. Pełne obciążenie wymaga dolnej granicy zależnej od modelu: 125/125/160/210/250/300/360/400 V. Wspólne wartości napięcia i interfejsu są potrzebne do weryfikacji i same nie potwierdzają protokołu BMS dla pary urządzeń.
- S4, s. 1–3. Dla L30/L40/L50K-TH-S dane w certyfikacie obejmują znamionowe 30/40/50 kW i maks. 33/44/55 kVA w zakresie wskazanych wersji/nastaw. Parametry wejść baterii 140–800 V, prądy 80/80 A oraz dane AC służą do porównania z wymaganiami w tym zakresie. Dane o certyfikacji pokazywać z wersją V100, nastawami „PL: NC RFG”, typem A i statusem wymagającym weryfikacji u wystawcy. Wersja źródła i instrukcja wyznaczają użycie w konkretnym projekcie.

## Magazyny

| Rodzina | Udokumentowane dane do porównania | Wymagania i ograniczenia |
| --- | --- | --- |
| SunESS 5H/10H/15H/20H | Nominalnie 5/10/15/20 kWh. Użytkowo 4,5/9/13,5/18 kWh przy 90% DoD, 25°C i 0,2C. Znamionowo 2,5/5/7,5/10 kW, zależnie od SOC i temperatury. Szczyt wyjściowy 4,2/8,4/12,6/16,8 kW przez 20 s. | S6, s. 1–2. Zakres baterii 350–450 V. Maks. 3 wieże i 60 kWh nominalnych. Równoległa obsługa przez Data box zgodnie z instrukcją. Do pracy na mrozie falownik musi obsłużyć żądanie ogrzewania. Zdjęcia i schemat są przykładami instalacji, w tym realizacji 10 kW/15 kWh z marką Solinteg bez modelu falownika. |
| OASIS 60 | CIESS 60, 12 pakietów, 60 kWh nominalnie, 614,4 V nominalnie, 537,6–691,2 V i maks. 1C. | S5, s. 1–2. Szafa bateryjna wymaga zewnętrznego PCS. Maks. 6 szaf/360 kWh w PDF koliduje z limitem katalogu 180 kWh. Liczba szaf i parametry projektu do weryfikacji. |
| OASIS A200 | CIESS-120/160/200, 6/8/10 pakietów po 20 kWh, 384/512/640 V nominalnie, maks. 0,7C. Dla trzech SKU, kolejno, zakresy 348–432 V, 464–576 V i 580–720 V. | S3, s. 1–2. Zewnętrzny falownik/PCS, spadek mocy powyżej 45°C. Deklaracja rozbudowy bez kombinera DC do 6 szaf dotyczy wymogu kombinera, a maksymalna dopuszczalna konfiguracja wymaga sprawdzenia. |

Dla OASIS obie broszury podają pojemność nominalną, warunki testu cykli i wyróżnik DoD do 100%. Wartość użytkowa do filtra pozostaje nieznana. Prąd, C-rate i napięcie nie wystarczają do zadeklarowania mocy ładowania lub rozładowania AC systemu.

## Zgodność magazyn–falownik

Zatwierdzona lista w broszurze producenta stanowi podstawę 21 par katalogowych. Zakres dowodu to współpraca wymieniona przez producenta, z uwzględnieniem adnotacji oraz wariantu. Dobór zabezpieczeń, aktualnej wersji sprzętu, firmware, ustawień, liczby portów, trybu pracy i dopuszczalnego zakresu obciążenia jest osobnym sprawdzeniem.

- **OASIS 60 CIESS 60** ma wpis dla Isuna 20000T oraz Solinteg MHT-25K-100, MHT-30K-100, MHT-36K-100, MHT-40K-100 i MHT-50K-100. Wiersz Solinteg zawiera adnotację CEI 0-21/0-16. [S5, s. 2](../evidence/karta_katalogowa_OASIS_60.pdf#page=2).
- **OASIS A200 CIESS-120, CIESS-160 i CIESS-200** mają w tej samej broszurze wspólną listę A200 z wymienionymi modelami Solinteg MHT-25K-100, MHT-30K-100, MHT-36K-100, MHT-40K-100 i MHT-50K-100. [S3, s. 1](<../evidence/Brochure-OASIS A200.pdf#page=1>).
- **OASIS 60 i PWS2**. S5 wymienia PWS2-30P-CN, katalog zawiera PWS2-30P-EX. **A200 i Isuna L**. S3 wymienia `-TH`, katalog ma `-TH-S`. Obie sytuacje wymagają potwierdzenia dokładnych modeli. Wspólny certyfikat sieciowy dwóch odmian falownika dotyczy innego zakresu. OASIS Flex wymaga odrębnej listy.
- **SunESS H**. Przykłady Solinteg z S6 nie podają wersji modelu. Hasło współpracy z serią Sinexcel Isuna z katalogu pokazuje kierunek dalszego sprawdzenia. Do decyzji o parze potrzeba dokładnego SKU falownika i tabeli baterii lub innego jednoznacznego potwierdzenia producenta.
- Identyfikatory pięciu wariantów Solinteg MHT to [25K](https://katalog.aniro.pl/product/6a1d8193f6a77babe02f3efb/), [30K](https://katalog.aniro.pl/product/6a1d8193f6a77babe02f3efc/), [36K](https://katalog.aniro.pl/product/6a1d8193f6a77babe02f3efd/), [40K](https://katalog.aniro.pl/product/6a1d8193f6a77babe02f3efe/) i [50K](https://katalog.aniro.pl/product/69aa8007f6a77babe0ba32c7/).

## Przykłady kontroli wartości i obliczeń

| Scenariusz syntetyczny | Sprawdzenie |
| --- | --- |
| Wymagane 13 kWh użytkowe i 7 kW znamionowo po stronie DC | SunESS 15H ma 13,5 kWh i 7,5 kW. SunESS 10H ma odpowiednio 9 kWh i 5 kW. Kontrola 15 × 0,90 = 13,5 kWh odtwarza wiersz tabeli S6, s. 2, przy podanych warunkach. Wartości szczytowej 8,4 kW przez 20 s z 10H nie podstawiamy jako mocy znamionowej. |
| Wymagane 7,6 kW znamionowo po stronie DC | SunESS 15H wynosi 7,5 kW. SunESS 20H ma 10 kW. Obie wartości wymagają uwzględnienia SOC i temperatury z przypisu 2, S6, s. 2. |
| Kontrola składu CIESS-160 | 8 pakietów × 20 kWh = 160 kWh. Liczbę pakietów i wynik potwierdza osobno tabela S3, s. 1. To opis wnętrza gotowego SKU, którego nie rozbijamy automatycznie na pozycje zakupowe. |
| Kontrola pułapu rozbudowy OASIS 60 | 6 szaf × 60 kWh = 360 kWh nominalnych, zgodnie z S5, s. 1–2. Katalogowy limit 180 kWh pozostaje rozbieżnością. Obliczenie sprawdza spójność broszury i nie rozstrzyga, ile szaf można zamówić dla obiektu. |
| Isuna 20000T i źródło DC o zakresie 350–450 V | Zakres źródła mieści się w ogólnym 125–800 V, a odcinek 350–399 V leży poniżej wymaganego 400 V przy pełnym obciążeniu Isuna 20000T. To sprawdzenie zakresu, niezależne od potwierdzenia protokołu BMS lub pełnej dostępnej mocy. S1/S2, s. 1. |
| Isuna 5000T i 20000T | 5 kW × 2 = 10 kW, a 20 kW × 2 = 40 kW maks. wejścia z sieci. Tabela S1/S2, s. 1, potwierdza obie wartości i podaje różne prądy wejściowe 15 A i 58 A. Wzór nie opisuje mocy wejścia PV ani wyjścia rezerwowego. |

## Pozycje handlowe

Ceny i dostępność pochodzą z migawki z 17.11.2026. Przed rachunkiem użytkownik potwierdza ilość i dodatnią cenę każdej pozycji, źródła obu wartości, podstawę netto lub brutto, walutę, stawkę VAT, rabat, koszty i zakres. Pozycja z ceną zerową blokuje rachunek również wtedy, gdy migawka zawiera jej źródło. Jawne zero jest możliwe dla kosztów robocizny i transportu, VAT i rabatu. Sposób liczenia stanowi jawne założenie handlowe aplikacji. Reguły techniczne i warunki gwarancji pochodzą z odpowiednich dokumentów producenta.

- Rachunek wykonuje się osobno w każdej walucie. Wartość pozycji to ilość razy cena w potwierdzonej podstawie. Wartości pozycji, rabat, robociznę, transport i VAT zaokrągla się handlowo do najmniejszej jednostki waluty, czyli 0,01 dla PLN, EUR i USD.
- Przy cenach netto rabat liczy się od sumy towarów netto. Do kwoty po rabacie dolicza się robociznę i transport netto. VAT liczy się od całej wartości netto w danej walucie.
- Przy cenach brutto rabat liczy się od sumy kwot brutto. Kwoty towarów netto przed i po rabacie wynikają z podzielenia odpowiednich sum brutto przez `1 + VAT / 100` i zaokrąglenia. Wyświetlany rabat netto jest różnicą między tymi kwotami. VAT towarów stanowi różnicę między brutto a netto po rabacie. Usługi dodaje się w kwotach netto z osobno wyliczonym VAT. W ten sposób kwoty potwierdzone jako brutto zachowują dokładną wartość przy zerowym rabacie.
- W przykładzie z cenami netto 2 × 100,00 PLN daje 200,00 PLN towarów. Rabat 10% to 20,00 PLN. Robocizna 30,00 PLN i transport 10,00 PLN dają netto 220,00 PLN. VAT podany na wejściu 20% to 44,00 PLN, razem 264,00 PLN.
- W przykładzie z cenami brutto 3 × 19,99 EUR daje 59,97 EUR brutto. Rabat 5% wynosi 3,00 EUR brutto, więc za towary zostaje 56,97 EUR brutto. Przy VAT 20% kwoty netto przed i po rabacie wynoszą 49,98 i 47,48 EUR, a VAT towarów 9,49 EUR. Transport netto 2,00 EUR ma VAT 0,40 EUR. Suma wynosi netto 49,48 EUR, VAT 9,89 EUR i brutto 59,37 EUR.
