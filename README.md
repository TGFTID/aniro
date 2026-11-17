# Pracownia doboru Aniro

Lokalna aplikacja do analizy potrzeb, porównania katalogu i przygotowania roboczej oferty. Wymaga Node.js 22+ i Pythona 3. Uruchom w katalogu repozytorium:

```sh
npm test
npm run build
npm start
```

Otwórz <http://127.0.0.1:4397/>. Aplikacja i sześć kart producentów są serwowane z katalogu `dist`. Budowa nie pobiera pakietów. Przy czystym drzewie Git interfejs odczytuje SHA commita z pliku `version.json`. Wersja z lokalnymi zmianami nosi oznaczenie „wersja robocza”.

Wybierz cel, podaj pomiary i ich pochodzenie. Porównaj wskazane parametry i otwórz źródła. Do oferty wybierz pozycje z uzasadnieniem ilości, uzupełnij warunki cenowe i zatwierdź dane. Ceny i dostępność pochodzą z migawki 17.11.2026. Zestaw urządzeń wymaga udokumentowanej zgodności. Szczegóły relacji, rozbieżności i zakresy reguł opisują [źródła](docs/ANIRO-DATA-SOURCES.md) i [reguły](docs/ANIRO-SELECTION-RULES.md).

Sesja działa w przeglądarce. Dokumenty prywatne pozostają poza repozytorium i katalogiem serwowanym przez aplikację.

## Powtórzenie odbioru

Przy działającym serwerze uruchom `python scripts/acceptance.py` w środowisku z Playwright dla Pythona i Chromium. Skrypt sprawdza SHA z interfejsu, przechodzi formularze na danych syntetycznych, pobiera szkic i otwiera źródło PDF. Wyniki i zrzuty zapisuje w `output/acceptance/`. Tryb `--preview` służy do sprawdzania lokalnych zmian przed commitem. Stany formularza są przechowywane w pamięci karty. Użyj przycisku „Pobierz dane robocze”, aby zachować kopię na dysku.
