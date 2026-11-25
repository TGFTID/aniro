# Aniro · plan i kryteria odbioru

## Wariant 2 w aplikacji · 25.11.2026

Baza 48f9215 na main. Zaakceptowany wzór to widok Karty z lokalnego porównania. Pierwszy ekran gromadzi wybór dowolnego podzbioru trzech klas urządzeń, cztery opcjonalne wartości i dane istniejącego falownika. Wcześniejsza wersja zbierała kwoty dopiero podczas ankiety i obsługiwała pięć zestawów klas.

- Rozłączne moduły w posiadanym limicie Codex, GPT-6.2 Sol: szybki formularz (JS/CSS), pytania i scenariusze (JS/testy), odbiór Playwright (Python). Integrator odpowiada za zapis, wznowienie starszych spraw, wydruk i dokładny SHA. Brak zewnętrznego API w przepływie.
- Kwoty pozostają opisem faktury. Podane kW i kWh to wymagania dla szukanego urządzenia. Ankieta zbiera ich pochodzenie, bez ponownego przepisywania. Zmiana wartości usuwa wcześniejsze potwierdzenie. Dla niepotwierdzonego zestawu wycenia się osobne warianty.
- DONE: nowy start przy 390×844 i na komputerze, częściowe dane, zapis po edycji startu, stary format sprawy, dobór do wydruku i kontrola niezależna. Handoff w docs/STATE.md. Powrót do wcześniejszej wersji aplikacji przez osobny checkout 48f9215.

## Przebudowa ścieżki klienta · 25.11.2026

Punkt wyjścia to czysty `main` w TGFTID/aniro, d433367. Poprzedni formularz wymagał kompletu danych od razu, a pobranego szkicu nie można było wznowić w interfejsie. Rejestr z 09.11 poprzedza powstanie tej aplikacji. Własność i lokalizację potwierdzają przekazanie i sekcja 3 nadrzędnego STAN.md.

- Trzy rozłączne prace wykonują natywni GPT-6.2 Sol z własnym kontekstem, bez dodatkowego API. Jedna osoba porównuje działające kopie referencyjne i zapisuje specyfikację wizualną, druga implementuje pytania w `src/intake.js`, trzecia weryfikuje obie ścieżki w Chromium. Integrator odpowiada za wybór wzorca, zapis i wznowienie, kompletację, podgląd i ostateczny odbiór.
- Kwoty z faktury i obecność falownika opisują sytuację użytkownika. Do porównania urządzeń służą wyłącznie dotychczasowe pola techniczne ze źródłem. Zapis lokalny przechowuje wejścia, krok, wybrane identyfikatory i warunki. Wznowienie ponownie sprawdza modele oraz wymaga aktualnego zatwierdzenia przed wydrukiem.
- Odbiór obejmuje zapis, ponowne otwarcie, rzeczywistą treść schowka, pełne oferty dla dwóch dziedzin, niezgodności i wydruk w widoku telefonu i komputera. Zestawienie zrzutów z obu aplikacji pozostaje poza repozytorium. Lokalny adres odbioru to 127.0.0.1:4397, przyszły adres publiczny to www.aniro.gft.pl.
- Poprzedni interfejs można odtworzyć z d433367 w osobnym worktree. Zmiana korzysta z dotychczasowego katalogu i reguł, bez migracji usług.

Z dwóch uruchomionych wersji wybrano gotową paczkę pierwszego generatora. Obie miały edytor, wybór modeli, podgląd i wydruk. Z drugiej przyjęto czytelniejszą, większą typografię dokumentu. Osobny raport obok repo wskazuje dokładne ścieżki źródłowe i skróty, odtworzone zasoby oraz zakres próby z lokalną odpowiedzią demonstracyjną. W aplikacji Aniro dokument powstaje lokalnie z zatwierdzonych danych i kalkulacji.

## Cel i baza

Operator wprowadza dane techniczne z jednostką i pochodzeniem, porównuje udokumentowane parametry, wskazuje wariant i po akceptacji otwiera roboczą ofertę. Zakres obejmuje kompensację, magazyny, falowniki i ocenę rozwiązań łączonych.

17.11.2026, katalog wskazany przez właściciela. W rejestrze APKI brak wpisu, STAN §3 odnotowuje poprzedni blok danych. W drzewie projektu brak repozytorium Git, wyszukiwanie nazw na koncie TGFTID nie wskazało repozytorium Aniro. Nowe, odizolowane repo aniro-app, gałąź main, bez remote. Poziom wyżej pozostają materiały pierwotne i aplikacja referencyjna.

## Kontrakty i własność

| Blok | Pliki | Odpowiedzialność |
|---|---|---|
| Źródła | evidence/, docs/ANIRO-DATA-SOURCES.md, docs/ANIRO-SELECTION-RULES.md, src/evidence.js | Weryfikacja stron PDF, zgodności, rozbieżności oraz źródeł poszczególnych reguł |
| Dane i dobór | data/catalog.json, src/catalog.js, src/selection.js | 112 źródłowych ID, oddzielne modele produktów, surowe pole, jednostka, zakres i status, osobne filtry i jawne ograniczenia |
| Interfejs | index.html, src/ui*.js, src/*.css | Cel, dane i ich pochodzenie, braki, porównanie, kompletacja, warunki i oferta. Zmiana wejść unieważnia akceptację |
| Wycena | src/pricing.js | Wejścia użytkownika dla ilości, podstawy ceny, VAT, rabatu, robocizny, transportu i zakresu. Podsumowania w walutach źródłowych |
| Integracja | scripts/, package.json, tests/, goal.md, README.md | Testy regresji, build, uruchomienie i odbiór w rzeczywistej przeglądarce |

Dowody techniczne pochodzą z migawki Aniro i dostarczonych publicznych kart. EML i formularz PPE odczytywane lokalnie. Ich treść i identyfikatory nie trafiają do repo ani do aplikacji. Akcesorium potrzebuje powiązania o udokumentowanym znaczeniu. Dokument zgodności sieciowej ma zakres opisany w certyfikacie. Gdy brakuje reguły lub źródła, pozostaje porównanie ręczne. Katalog, PDF i aplikacja działają lokalnie. Odnośnik do karty online otwiera się na życzenie użytkownika.

## Kolejność i wykonawcy

1. Inwentaryzacja, odczyt STAN i manifestu, rozpoznanie Git i odizolowanie nowej aplikacji.
2. Równolegle przegląd dowodów, model/filtry i interfejs. Natywni wykonawcy GPT-6.2 Sol mają świeże konteksty i rozłączne pliki. Wybór z 17.11.2026 odpowiada preferencji oszczędnego modelu. Większy wysiłek rozumowania przy odczycie wielojęzycznych tabel. Bez płatnego API. Po dwóch nieudanych próbach diagnoza i zmiana metody.
3. Integracja dowodów w filtrach i UI, osobna kalkulacja handlowa, weryfikacja niezależnymi przykładami. Migawka z 17.11.2026 nie przesądza o aktualnym stanie handlowym.
4. Testy, kontrola plików, niezależny przegląd. Commit tylko sprawdzonych plików.
5. Świeży build, identyfikacja SHA w interfejsie, scenariusze w przeglądarce, audyt ekranów. Lokalnie uruchomiony serwer na adresie pętli zwrotnej.

## Testy i DONE

- Kontrola 112 unikalnych rekordów, 12 skrótów manifestu, sześciu kopii PDF w ZIP i stron użytych w regułach.
- Parser dla jednostek, zakresów, braków, znaczników i tekstu. Konflikty wyłączają odpowiedni filtr. Brak opisu i brak parametrów zachowują swoje znaczenie.
- Dobór dla pomiarów granicznych, braku źródła, niezgodności i różnych wariantów oznaczenia. Niedokumentowana para lub ilość nie staje się kompletem.
- Przykłady z niezależnym wynikiem dla obliczeń. Odrębne waluty i jawna podstawa cen. Brak potwierdzenia blokuje ofertę.
- Rzeczywiste kliknięcia w scenariuszach kompensacji, falownika/magazynu, braków i konfliktu. Kontrola kompletacji i wyjściowej oferty. Audyt responsywności, obu motywów, dostępności i błędów.
- Przeszukanie nowego repo i świeżego buildu pod kątem dawnej marki. Dokładny hash w odebranym UI. Zgodnie ze zleceniem wynik jest lokalny.

## Rollback

Zatrzymanie serwera uruchomionego dla tego repo kończy sesję aplikacji. Poprzednią zatwierdzoną wersję można otworzyć w osobnym worktree, odbudować i uruchomić lokalnie. Starsza kopia referencyjna i pakiet źródłowy są niezależne od nowego repo.

## Wynik integracji

Model obejmuje 55 kompensatorów, 35 falowników, 17 magazynów i 5 akcesoriów. Porównano 112 ID i 1792 pola ze źródłowym JSON, odczytano 15 stron publicznych PDF oraz sprawdzono 12 sum manifestu. Dziesięć wykrytych konfliktów harmonicznych kieruje porównanie spornego pola do ręcznej oceny. Lista 21 par dotyczy konkretnych modeli magazynów i falowników. Ręczna adnotacja operatora pozostawia brakujący parametr otwarty w wycenie częściowej i wydruku.

Wycena operuje oddzielnie w walutach źródłowych. Każda z 99 dodatnich cen przechodzi sprawdzenie odtworzenia ceny brutto przy braku rabatu i kosztów. Pozostałe 13 pozycji wymaga potwierdzonej dodatniej ceny. Weryfikację techniczną i handlową pokrywa 29 testów jednostkowych. Odbiór przeglądarkowy zapisuje faktyczny SHA i listę wykonanych scenariuszy w `output/acceptance/report.json`.
