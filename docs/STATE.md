# HANDOFF · Aniro · 25 listopada 2026

## Cel

Zachować wybrany wygląd „2 · Karty”. Osoba z fakturą przechodzi ze startu wprost do edytowalnej oferty i korzyści. Pomoc elektryka, zapis i pełny wydruk to dostępne dalsze czynności.

## PARAMETRY

- Repo TGFTID/aniro, gałąź main. Commit funkcjonalny 1f2855f2a35dc62d53cc21f3bfea0268139aa986. Po nim następuje commit tego dokumentu. Dokładne SHA uruchomionego wydania podaje lokalny /version.json i raport UI.
- Aplikacja http://127.0.0.1:4397/ • porównanie ekranów http://127.0.0.1:4398/comparison-cards.html • zatwierdzony wzór http://127.0.0.1:4398/aniro-looks.html#cards.
- Katalog Aniro ma 112 rekordów z 17.11.2026 i sześć lokalnych PDF. Ceny mają walutę i datę. Materiały demonstracyjne i obrazy dawcy mieszczą się w ../donor-comparison, poza buildem.
- Obiekt domyślnie ma sieć trójfazową 400 V. Własne napięcie przyjmuje pole w sekcji Sieć. Ustawienie nie określa liczby przewodów ani mocy kompensacji.
- localStorage pod kluczem aniro.cases.v1.<id>. Aplikacja czyta wcześniejszy format zapisu. Dane klienta pozostają w jego przeglądarce, lokalna prognoza i dobór działają bez usług AI.
- Dwa odrębne okresy: okres faktury i okres prezentacji wyniku. Start przyjmuje miesiąc, cel redukcji opłaty biernej wynosi początkowo 100%. Przeliczenie roku z pojedynczego miesiąca zakłada 12 jednakowych miesięcy.
- Kompensacja: w przyjętym okresie oszczędność = opłata bierna × wybrany procent. Koszt inwestycji brutto w PLN uzupełnia użytkownik. PV i magazyn: uniknięty zakup kWh × stawka brutto − utracony przychód ze sprzedaży; użytkownik podaje ilość po uwzględnieniu strat. Porównanie PV i magazynu liczy wspólny efekt raz.

## DECYZJE

- 2026-11-25 · Jako wzorzec dalszej pracy z pozycjami i podglądem przyjęto sprawdzony w przeglądarce gotowy pakiet referencyjny. Pochodzenie, SHA-256 i różnice względem v3 opisano w ../donor-comparison/README.md.
- 2026-11-25 · Wybrano wariant 2. Na pierwszym ekranie pozostają trzy fotokarty, cztery opcjonalne wartości, okres rachunku i odpowiedź o obecnym falowniku. Pusta wartość i 0 są różnymi danymi.
- 2026-11-25 · Deklaracja mocy lub pojemności wystarcza do wstępnej oferty. Pochodzenie dokumentowe można dopisać w opcjonalnej ścieżce technicznej. Automatyczna propozycja opiera się na katalogu i wskazanych parametrach. Model przykładowy bez pomiaru ma jawne oznaczenie.
- 2026-11-25 · Klient może zmienić lub pominąć pozycję. Sprawa zapisuje model, koszt i okres symulacji. Braki można przekazać elektrykowi i wrócić do pytania. Udokumentowana zgodność i warunki handlowe są sprawdzane w ścieżce do wydruku.

## ODRZUCONE

- 2026-11-25 · Dodatkowy ekran pytający o źródło podanych kW lub kWh oraz ponowne pytanie o standardowe napięcie. Właściciel wybrał najpierw ofertę.
- 2026-11-25 · Oddzielny wygląd demonstratora prognozy. Wykres i przełącznik osadzono w kartach wybranego wariantu.
- 2026-11-25 · Ułamkowy mnożnik przed zaokrągleniem opłaty do grosza, mieszanie danych przykładowych i wpisanych przez użytkownika. Obecny model używa groszy, przykład jest oddzielny od rzeczywistych kwot.
- 2026-11-25 · Przysłanianie aktualnego zapisu starszą kopią w karcie, reset formularza po asynchronicznym ładowaniu, limit dwóch miejsc dla mocy technicznej, ostatnia strona wydruku z pojedynczym wierszem. Każdy przypadek poprawiono.
- 2026-11-25 · Domyślny silnik audytu nie miał wymaganej binarki headless-shell. Audyt wykonano dostępnym Chromium. Testy scenariuszowe mają własne środowisko Playwright.

## ODBIÓR I WZNOWIENIE

- npm.cmd test, npm.cmd run build, npm.cmd start. Build odczytuje SHA przy czystym Git. Działający serwer na 4397 czyta dist; po kolejnym commicie należy zbudować ponownie.
- Przy uruchomionej aplikacji: python scripts/acceptance.py --sha PEŁNE_SHA. Test obejmuje 1440×900 i 390×844 (emulacja dotyku), zgłoszenie brakującego pomiaru, schowek, powrót do sprawy, oferty, zmiany okresu, zmianę modelu, kompletację i rzeczywiste PDF. Dowody: output/acceptance/report.json oraz PNG i PDF w tym katalogu.
- Źródła zmian: src/quick-start.js i .css (pierwsza strona), src/initial-offer.js (warianty i ceny), src/benefits.js i .css (symulacja), src/intake.js (ankieta), src/ui.js (zapis i dokument), scripts/acceptance.py (odbiór). Interfejs przeglądarkowy po polsku.
- Odzyskanie wcześniejszej wersji: osobny worktree na 48f9215 (przed wprowadzeniem kart) lub ac306a2 (karty przed skróceniem ścieżki). Nie resetować aktywnego checkoutu ani zapisów przeglądarki.

## OTWARTE

- Produkcyjne www.aniro.gft.pl wymaga osobnej decyzji właściciela. Instrukcje lokalnego uruchomienia są w README.md.
