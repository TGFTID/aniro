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

## Faktura i powrót do sprawy

Na pierwszym ekranie wybierz „Mam na fakturze opłatę za energię bierną”. Obie kwoty można wpisać albo ustawić suwakiem. Jeśli brakuje pomiaru, przycisk „Nie wiem” przygotuje tekst do skopiowania. „Zapisz i wyjdź” zachowuje pytanie i wpisane odpowiedzi. Po powrocie otwórz zapisaną sprawę na stronie startowej w tej samej przeglądarce pod tym samym adresem.

Po wprowadzeniu pomiarów ze źródłami wybierz urządzenia, ilości i warunki. Dokument po zatwierdzeniu można wydrukować lub zapisać do PDF. Kwoty faktury i obecność falowników opisują obiekt. Moc i ceny urządzeń wynikają z osobnych danych. „Pobierz dane robocze” zapisuje dodatkową kopię JSON do odczytu.

Projekt przygotowano do serwowania plików statycznych pod docelowym adresem www.aniro.gft.pl. Odbiór opisany poniżej odbywa się lokalnie. Znak w nagłówku i ofercie pochodzi z [serwisu Aniro](https://aniro.pl/wp-content/uploads/2026/03/7d339c7b9925eabdda941a1528b23cddf229824f.jpg).

## Powtórzenie odbioru

Przy działającym serwerze uruchom `python scripts/acceptance.py` w środowisku z Playwright dla Pythona, Chromium i PyMuPDF. Skrypt sprawdza SHA z interfejsu, przechodzi formularze na danych syntetycznych, pobiera szkic, otwiera źródło PDF i weryfikuje wydruk oferty. Wyniki i zrzuty zapisuje w `output/acceptance/`. Tryb `--preview` służy do sprawdzania lokalnych zmian przed commitem.
