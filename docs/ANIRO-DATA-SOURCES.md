# Źródła danych Aniro

Przegląd z 17.11.2026 obejmuje wszystkie 15 stron sześciu publicznych PDF dostarczonych z katalogiem. Porównano tekst, tabele, przypisy, grafiki i schematy. Zweryfikowano SHA-256 dla 12/12 plików manifestu oraz identyczność bajtową 6/6 publicznych PDF z odpowiednimi plikami w ZIP.

## Pakiet wejściowy

- Surowy katalog `aniro-products-catalog.json` z 17.11.2026 zawiera 112 unikatowych ID, w tym 58 pozycji kompensacji z akcesoriami i 54 pozycje magazynów, falowników i akcesoriów.
- `aniro-ready/products.json` zachowuje ID, model, producenta, EAN, kategorię, cenę, dostępność, wymiary, wagę, oryginalny opis, parametry i linki wszystkich 112 pozycji. Test porównania ze źródłem sprawdził też zmianę nazwy `title` → `name` oraz normalizację akcesoriów do tablicy. Status przeglądu technicznego jest otwarty przy wszystkich 112 pozycjach.
- Flaga `pdf_contents_read: false` w manifestie i zapis w `HANDOFF.md` opisują stan przygotowania wejścia. Ten przegląd uzupełnia te źródła bez zmiany ich treści.
- ID `675703c76e8d310013284e9f` i `675703c76e8d310013284e9e` mają pusty opis. `63a1642bdc00d2001a99d71c` jest akcesorium SVG HMI 7″ bez parametrów.
- Lokalnie przejrzano dwie wiadomości, w tym tekst, HTML i obrazy za pomocą OCR, dwie strony formularza PPE oraz PDF z załącznika. Dokumenty obiektowe pozostają poza katalogiem, regułami i wartościami domyślnymi.

## Dokumenty i zakres stron

| Źródło | Strony i odczyt |
| --- | --- |
| [S1 · Isuna 5–20 kW PL](<../evidence/2026 Sinexcel Isuna 5-20kW wersja PL8102026.pdf#page=1>) | 1. Fotografia i cechy serii, tabela modeli, wyjście off-grid, parametry on-grid, wejścia PV i baterii, sprawność, warunki, ochrona i wykaz norm. |
| [S2 · Isuna 5–20 kW EN](<../evidence/2026 Sinexcel Isuna 5-20kW.pdf#page=1>) | 1. Te same wartości tabelaryczne. Piktogram sześciu urządzeń równolegle ogranicza deklarację do trybu off-grid. |
| [S3 · OASIS A200 EN 2026 V1](<../evidence/Brochure-OASIS A200.pdf#page=1>) | 1. Schemat DC z zewnętrznym PCS, tabela CIESS-120/160/200 i lista falowników. 2. Rozmieszczenie sprzętu w szafie, gaszenie, chłodzenie, interfejs wodny, deklaracje DoD i rozbudowy. |
| [S4 · Isuna · LS260247GCC-0](<../evidence/Falowoniki Isuna 22-50 KW Certyfiakt.pdf#page=1>) | 1. Modele, zakres typu A, V100, nastawy i daty. 2–3. Ograniczenia certyfikacji, historia zmian, tabele A.2. 4. Normy, dokumenty i odniesienia do badań. 5. SunSpec i raporty badań typu. 6–7. Matryce oceny, nastawy, uwagi instalacyjne i komunikacja. |
| [S5 · OASIS 60 EN 202511 V3.0](../evidence/karta_katalogowa_OASIS_60.pdf#page=1) | 1. Przekrój szafy i deklaracje C-rate, DoD, rozbudowy. 2. Tabela CIESS 60, schemat połączeń do PCS/EMS, opisane realizacje i lista falowników. |
| [S6 · SunESS H PL, EN-2026 V1](<../evidence/Sunwoda-SunESS-H_karta_katalogowa PL8102026.pdf#page=1>) | 1. Przekrój modułu, LFP, optymalizacja DC/DC, czujniki i ogrzewanie. 2. Schemat instalacji, zdjęcia realizacji, tabela 5H/10H/15H/20H i przypisy. |

## Powiązania modeli z katalogiem

| Źródła | Dokładny model na karcie i karta katalogu według ID |
| --- | --- |
| S1–S2, s. 1 | [Isuna 5000T](https://katalog.aniro.pl/product/6745763312e63a0012b3b8f7/), [6000T](https://katalog.aniro.pl/product/6745763312e63a0012b3b8f8/), [8000T](https://katalog.aniro.pl/product/6745763312e63a0012b3b8f9/), [10000T](https://katalog.aniro.pl/product/662a3c0459692e0012ad9e26/), [12000T](https://katalog.aniro.pl/product/662a3c0459692e0012ad9e27/), [15000T](https://katalog.aniro.pl/product/662a3c0459692e0012ad9e28/), [18000T](https://katalog.aniro.pl/product/662a3c0459692e0012ad9e29/), [20000T](https://katalog.aniro.pl/product/662a3c0459692e0012ad9e2a/). |
| S4, s. 1–3 | [Isuna L30K-TH-S](https://katalog.aniro.pl/product/6a1d8193f6a77babe02f3ef5/), [L40K-TH-S](https://katalog.aniro.pl/product/6a1d8193f6a77babe02f3ef6/), [L50K-TH-S](https://katalog.aniro.pl/product/6a1d8193f6a77babe02f3ef7/). Pozostałe warianty z dokumentu, w tym 22/25/29,9/42,5 kW i wersje bez końcowego `-S`, nie mają odpowiedników w migawce. |
| S6, s. 2 | SunESS [5H](https://katalog.aniro.pl/product/668cd86e59692e0012d57173/), [10H](https://katalog.aniro.pl/product/668cd86e59692e0012d57174/), [15H](https://katalog.aniro.pl/product/668cd86e59692e0012d57175/), [20H](https://katalog.aniro.pl/product/668cd86e59692e0012d57176/). |
| S5, s. 2 | CIESS 60 to [OASIS 60 kWh](https://katalog.aniro.pl/product/662a3c0459692e0012ad9e81/). [OASIS FLEX 60 kWh](https://katalog.aniro.pl/product/667a62bb59692e00129f7eed/) to odrębny wariant, w katalogu ma m.in. IP20 i chłodzenie naturalne. |
| S3, s. 1 | CIESS-120 → [OASIS A200 120 kWh](https://katalog.aniro.pl/product/6a7c2d9ad38ec2b6cc29f355/), CIESS-160 → [160 kWh](https://katalog.aniro.pl/product/6a7c2d9ad38ec2b6cc29f356/), CIESS-200 → [200 kWh](https://katalog.aniro.pl/product/6a7c2d9ad38ec2b6cc29f357/). |

## Rozbieżności i różne definicje pól

| Zakres | Katalog i PDF | Decyzja |
| --- | --- | --- |
| Isuna 5000T–20000T | `ZNAMIONOWY PRAD WYJSCIOWY` katalogu 8/10/13/16/20/24/29/32 A pokrywa się z wartościami **maksymalnymi on-grid** z S1/S2. Wartości znamionowe off-grid to 7,5/9/12/15/18/22,5/27/30 A. | Zablokować interpretację tego pola jako prąd znamionowy. Trzymać osobno tryb pracy, kierunek i rodzaj prądu oraz THDu. |
| Isuna 5000T/6000T/8000T | `NAPIECIE ROZRUCHOWE` 130 V w katalogu, 200 V w S1/S2; 130 V to dolna granica MPPT w PDF. | Pole rozruchowe do uzgodnienia. |
| Isuna 10000T–20000T | `ZAKRES NAPIECIA REGULATORA MPPT` 250/290/350/410/450–850 V w katalogu, 130–960 V w S1/S2. `ZNAMIONOWE NAPIECIE FOTOWOLTAIKI` 180–960 V w katalogu, 600 V w S1/S2. | Oba pola do uzgodnienia. |
| Isuna 5000T–20000T | Katalogowe `REKOMENDOWANA MAX MOC WEJSCIOWA PV` to 7,5/9/12/15/18/22,5/27/30 kWp. S1/S2 podają **maksimum wejścia PV** 10/12/16/20/24/30/30/30 kWp. `MAKS__DOT__ MOC WYJSCIOWA` w katalogu nie podaje trybu ani czasu, a S1/S2 podają wyraźnie szczyt off-grid 60 s. | Nie podstawiać wartości maksymalnej za rekomendowaną ani mocy szczytowej za znamionową, nawet przy identycznej liczbie. |
| Isuna L30K-TH-S | `MAKS__DOT__ NATEZENIE WEJSCIOWE FOTOWOLTAIKI` 40/40/40/40 A w katalogu, 40/40/40 A w S4 s. 2. `MAKS__DOT__ MOC WYJSCIOWA` 30,3 kVA w katalogu, 33 kVA w S4 s. 3. | Zablokować oba pola. Katalogowy zapis MPPT 4 i łańcuchów 4/8 wymaga odrębnej instrukcji. Nie wyliczać liczby MPPT z listy prądów w certyfikacie. |
| Isuna L30/L40/L50K-TH-S | S4 s. 2–3 dotyczy nastaw polskiej sieci przy 50 Hz. Katalog wymienia 50/60 Hz i inne normy, a prąd znamionowy 43,5/58/72,5 A jest inną wielkością od maks. 47,9/63,8/79,8 A w certyfikacie. | Zachować zakres zastosowania każdego źródła. |
| SunESS H, cztery warianty | Katalogowe 409,6 V, −10…+50°C, 10–95% RH i <2000 m wobec 400 V, −20…+50°C z warunkiem grzania, 5–95% bez kondensacji i <4000 m z S6 s. 2. Pole `MAX PRAD LADOWANIA/ROZLADOWANIA` zawiera 2,5/5/7,5/10 kW, które S6 nazywa znamionową mocą. | Blokada użycia surowych pól. Potwierdzoną moc znamionową i użytkową energię brać z osobnych wierszy PDF, z warunkami testu. |
| SunESS H | S6 s. 2 podaje wymiary 653 × 553/868/1183/1498 × 189 i masy 65/117/169/221 kg. Katalog ma inne szerokości, wysokości i wagi. Tabela S6 wymienia CAN 2.0 / RS485, a schemat Wi-Fi wskazuje przy falowniku. Katalogowy napis Wi-Fi i LAN pozostaje bez potwierdzenia jako interfejs baterii. | Źródło wymiarów i jednostki zweryfikować przed montażem. Weryfikować osobno porty sprzętowe i monitorowanie na poziomie systemu. |
| OASIS 60 | S5 s. 1–2 podaje 537,6–691,2 V, do 6 szaf/360 kWh, −20…+55°C, 6000 cykli przy EOL 60%. Katalog podaje 556,8–662,4 V, do 180 kWh, 0…+50°C i EOL 70%. Masa źródłowa 840 wobec 807 kg w PDF. Katalogowe osie wys./szer./gł. mają wartości 767/731/2116, a PDF ma dł./szer./wys. 731/767/2116 mm. | Pola elektryczne, rozbudowę, temperaturę i cykle zablokować w automatycznym doborze. Gabaryty zweryfikować przed montażem. Wilgotność i wysokość stosować z warunkami PDF. |
| OASIS 60 | Katalog podaje 100 A oraz CAN/RS485, S5 w tabeli 1C i CAN/RS485/Wi-Fi. Przykłady instalacji pokazują różne moce i układy związane z PCS. | 100 A i 1C niosą informację o innych wielkościach. Nie wyznaczać z nich gwarantowanej mocy AC. |
| OASIS A200 | S3 s. 1 podaje 3000 m, katalog <2000 m. Katalog ma puste pole rozbudowy, S3 s. 2 dopuszcza rozbudowę i mówi o braku wymogu stosowania kombinera DC do sześciu szaf. Gwarancja 5 lat występuje w katalogu, PDF odsyła do warunków bez podania czasu. | Blokada wysokości. Kompletacja równoległa i warunki gwarancji wymagają osobnych dokumentów. |
| ASVG 100 CABINET | Opis podaje harmoniczne 3/5/7/9/11/**13**, tabela 3/5/7/9/11/**15**. Pakiet sześciu PDF nie obejmuje tej szafy. | Zablokować `HARMONICZNE KOMPENSOWANE` dla [tego ID](https://katalog.aniro.pl/product/66b1c72d59692e0012397b2a/). |

Silnik wykrył łącznie 10 różnic między listami harmonicznych w opisie i w tabeli. W sześciu urządzeniach ASVG 10 i ASVG Ultra 15–100 rząd 9 występuje wyłącznie w tabeli. W ASVG 75 CABINET i ASVG BUD 75 CABINET opis podaje rząd 13, a tabela 14. W ASVG 100 CABINET i ASVG BUD 100 CABINET opis podaje rząd 13, a tabela 15. Każdy z tych parametrów wymaga potwierdzenia przed użyciem w doborze według rzędów.

## Certyfikat LS260247GCC-0

Strona 1 obejmuje 14 modeli L22/L25/L29.9/L30/L40/L42.5/L50 w odmianach `-TH` i `-TH-S`, PPM typu A, oprogramowanie V100, zestaw „PL: NC RFG”. Dokument podaje daty 23.09.2026 oraz 22.09.2031. Tabela A.1 na s. 2 zapisuje „Do wydania / Pending issue”, a uwagi na tej stronie uzależniają ważność od weryfikacji u wystawcy. Sam plik służy do stwierdzenia zakresu dokumentu. Aktualny status u wystawcy wymaga sprawdzenia przed użyciem.

Załącznik wskazuje badania typu, NC RfG, WOS 2025-05, WiPWC 1.3 i Bank Nastaw 1.1. Na s. 4 przyłącze SN jest poza zakresem. Wykaz częściowej certyfikacji SunSpec na s. 5 wymienia modele informacyjne 1, 703 i 704. Na s. 6 wyniki pozytywne typu A obejmują zakres częstotliwości, odporność RoCoF, zdalne zaprzestanie generacji i LFSM-O. Na s. 7 wskazano bank nastaw, rejestr co najmniej 500 wpisów, RS-485/Modbus RTU i wymagania weryfikacji na poziomie projektu. Schemat zabezpieczeń instalacji jest poza zakresem oceny. Wpis certyfikacyjny nie przesądza o interoperacyjności z baterią ani o odbiorze przyłącza. S4, s. 1–7.
