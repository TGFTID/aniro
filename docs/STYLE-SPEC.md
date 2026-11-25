# STYLE-SPEC — Pomarańcz i jasna szarość

Źródło — lokalny render wersji archiwalnej, opisany w raporcie porównania obok repozytorium.
Data ekstrakcji — 2026-11-25.

## 1. Charakter wizualny

Jasnoszara powłoka mieści białe powierzchnie o zaokrąglonych narożnikach.
Wąska kolumna ma gęste rzędy, cienkie podziały i małe odstępy. Większa powierzchnia
ma wyraźnie większy margines wewnętrzny. Nasycony pomarańcz prowadzi wzrok między
akcją główną, aktywnym wierszem i piktogramem. Niebieskoszare tła i tekst równoważą
ciepły akcent.

- Gęstość informacji — gęsta w panelu bocznym, średnia na dużej powierzchni.
- Temperatura — neutralna z ciepłym akcentem.
- Krawędzie — miękkie dla kart, zwarte dla pojedynczych wierszy.
- Dominujący zabieg — asymetria dwóch powierzchni i wyrazista akcja na szerokość panelu.

## 2. Paleta

| Rola | Zmienna | Jasny | Ciemny |
|---|---|---|---|
| tło strony | `--bg` | #F3F4F6 | #111827 |
| powierzchnia (karta) | `--surface` | #FFFFFF | #1F2937 |
| powierzchnia podniesiona | `--surface-2` | #F9FAFB | #374151 |
| tekst główny | `--text` | #1F2937 | #F3F4F6 |
| tekst drugorzędny | `--text-2` | #4B5563 | #D1D5DB |
| akcent | `--accent` | oklch(69.6% 0.204 43.5) | #FF8533 |
| tekst na akcencie | `--on-accent` | #111827 | #111827 |
| obramowanie | `--border` | #E5E7EB | #4B5563 |
| sukces | `--ok` | #15803D | #86EFAC |
| ostrzeżenie | `--warn` | #9A3412 | #FDBA74 |
| błąd | `--err` | #B91C1C | #FCA5A5 |
| pierścień focus | `--focus` | #B54200 | #FFB875 |
| przyciemnienie tła | `--scrim` | #11182799 | #00000099 |

Tekst główny do tła ma kontrast ok. 13,3:1 w jasnym motywie i 16,1:1 w ciemnym.
Pomarańcz źródłowy pozostaje kolorem powierzchni i detalu. Na intensywnym tle stosuj
ciemny tekst albo przy białym tekście pogłęb pomarańcz do #B54200. Ciemny pomarańcz
stosuj także w drobnym tekście na jasnym tle. Role komunikatów oraz obrys skupienia
uwzględniają podwyższenie kontrastu przy wdrożeniu.

## 3. Typografia

| Rola | Rozmiar | Waga | Interlinia | Odstęp liter |
|---|---|---|---|---|
| nagłówek 1 | 20–24 px | 700 | 28–32 px | −0,02 em |
| nagłówek 2 | 16–18 px | 600–700 | 24–28 px | 0 |
| tekst podstawowy | 14–16 px | 400 | 21–24 px | 0 |
| tekst pomocniczy | 13–14 px | 400–500 | 18–20 px | 0 |
| etykieta / mikrotekst | 12–13 px | 600–700 | 16–18 px | do +0,05 em |

- Rodzina fontów — Inter, „Segoe UI”, sans-serif.
- Referencja deklaruje ładowanie z sieci. Przy wdrożeniu font lokalny lub zapasowy krój platformy.
- Wzorzec ma etykiety 9–12 px, krótkie wersaliki i silniejszą wagę dla liczb. Docelowa
  skala podnosi małe rozmiary, zachowując tę hierarchię.

## 4. Odstępy

Skala obserwowana — 2, 4, 6, 8, 12, 16, 24, 32 px. Przy wdrożeniu 2 px pozostaw
dla detalów, a powtarzalne bloki oddzielaj 8–12 px.

- Wnętrze karty — zwarte bloki 8–16 px, duża powierzchnia 16 px na małym ekranie i 32 px na szerokim.
- Między kartami — 4–8 px w gęstej grupie, 12–16 px między samodzielnymi sekcjami.
- Margines boczny ekranu — 8 px poniżej 640 px, od 16 px na większym ekranie.
- Maksymalna szerokość treści — 1600 px.

## 5. Promienie

| Element | Wartość |
|---|---|
| karta | 12–16 px dla kompaktowej, 32 px dla dużej |
| przycisk | 16 px dla głównego, 8 px dla drugorzędnego |
| pole formularza | 12 px |
| element pełnookrągły | 9999 px |

## 6. Cienie i elewacja

| Poziom | Wartość |
|---|---|
| powierzchnia spoczynkowa | 0 1px 2px rgba(0, 0, 0, 0.05) albo subtelna ramka |
| element uniesiony (modal, menu) | 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025) |

Większa powierzchnia ma miękki cień poniżej krawędzi. Gęsta kolumna opiera podział
głównie na różnicy jasności tła i ramkach.

## 7. Obramowania

- Grubość — 1 px na kartach i wierszach, 2 px dla silnego zaznaczenia z odstępem od krawędzi.
- Kolor — `--border` w spoczynku, `--accent` dla zaznaczenia, `--focus` dla klawiatury.
- Proste pole na lekko przygaszonym tle ma gładką krawędź. Cienka linia wiąże
  górny pasek z resztą układu i porządkuje nagłówki grup.

## 8. Ikonografia

- Rodzina — liniowe piktogramy o prostych kształtach.
- Grubość kreski — 1,5–2 px przy piktogramie 20 px.
- Rozmiary — 12–16 px przy tekście, 20–24 px przy głównych akcjach.
- Ikony akcji łączą się z podpisem. Samodzielne ikony mieszczą się w okrągłym
  przycisku o celu dotykowym min. 44×44 px i mają dostępną nazwę.

## 9. Układ i nawigacja

- Typ powłoki — górny pasek o pełnej szerokości z niewielką grupą akcji po prawej.
- Nawigacja — bez stałych zakładek w referencji. Dwie okrągłe akcje
  narzędziowe po prawej, identyfikacja po lewej.
- Wyróżniona akcja główna — pełna szerokość swojej kolumny, jednolite wypełnienie,
  czytelny podpis i wysokość ok. 52 px.
- Zachowanie na szerokim ekranie — panel boczny ok. 400 px i elastyczna większa
  powierzchnia, ułożone od wspólnej górnej krawędzi. Margines między panelami 8–16 px.
- Punkty łamania — 640 px dla marginesów i oszczędniejszego nagłówka, 1024 px dla
  przejścia z pionowej kolejności do dwóch kolumn. W wąskim oknie akcje
  powierzchni pomocniczej zawijają się. Gęste grupy otrzymują dodatkowy wiersz,
  dla zachowania 44-pikselowego celu dotykowego.

## 10. Inwentarz komponentów

| Element | Wygląd |
|---|---|
| przycisk główny | Pełne pomarańczowe tło, mocna waga, środek, zaokrąglone 16 px. |
| przycisk drugorzędny | Subtelne tło lub transparentna powierzchnia z ramką 1 px, promień 8 px. |
| przycisk destrukcyjny | Neutralna powierzchnia, ciemnoczerwony tekst i obrys widoczny po skupieniu. |
| pole tekstowe | Jasnoszare wypełnienie, promień 12 px, tekst wyrównany w lewo. |
| karta | Zaokrąglone powierzchnie z delikatną ramką lub cieniem, krótki nagłówek i czytelny podział. |
| element listy | Krótki tytuł z lewej, wartość z prawej, drugi wiersz na opis. Zaznaczenie wypełnia lub obrysowuje całe pole wyboru. |
| kafelek statusu | Okrąg z ikoną, oszczędny podpis i wyraźna wartość lub skrót. |
| odznaka / etykieta stanu | Krótka forma o promieniu 4–6 px, subtelne tło i kontrastowy tekst. |
| okno modalne | Jasna lub ciemna karta na przyciemnionej powłoce, zwarty nagłówek i obrys. |
| pasek nawigacji | Jasna powierzchnia w motywie jasnym, ciemna w ciemnym. Niski cień i szeroki rozstaw elementów. |
| komunikat (toast) | Zwarty prostokąt z czytelną ikoną, kontrastowym tekstem i delikatnym cieniem. |

## 11. Ruch

| Przejście | Czas | Krzywa |
|---|---|---|
| zmiana ekranu | 200–300 ms | łagodne wejście przez przezroczystość |
| otwarcie modalu / szuflady | 200–300 ms | łagodne wyhamowanie |
| mikrointerakcja (najechanie, naciśnięcie) | 100–200 ms | cubic-bezier(0.4, 0, 0.2, 1) |

Przy wdrożeniu `prefers-reduced-motion` wyłącza przesunięcia i skalowanie.
Zachowanie wszystkich animacji wzorca w tym ustawieniu pozostaje niezweryfikowane.

## 12. Stany wizualne

| Stan | Jak wygląda |
|---|---|
| najechanie | Ledwo zabarwione tło lub pogłębiony akcent, zależnie od typu kontrolki. |
| focus (klawiatura) | Widoczny obrys 2 px z odsunięciem 2 px od krawędzi, także na ikonach. |
| naciśnięty | Głębszy odcień tła lub małe skalowanie z zachowaniem czytelnej etykiety. |
| nieaktywny | Wyszarzone wypełnienie i spokojniejsza etykieta. |
| ładowanie | Zwarty wskaźnik w obrębie nieruchomej kontrolki lub karty. |
| pusty (brak danych) | Duży jednolity panel i prosty piktogram nad krótkim podpisem. |
| błąd | Jasnoczerwone tło, czytelny tekst i dyskretna ramka w kolorze stanu. |
