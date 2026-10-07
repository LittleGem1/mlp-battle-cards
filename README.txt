MLP BATTLE CARDS – REPARATURPATCH

BITTE NUR DIESE DATEIEN ERSETZEN:
- cards.js
- server.js
- public/client.js
- public/style.css

(Die index.html muss für diesen Patch NICHT ersetzt werden.)

GEFIXT:
1. Musik-Mute
   - der fehlende updateMusicButtons()-Code war ein echter JavaScript-Fehler
   - dadurch wurden Teile der Spielanzeige abgebrochen
   - Musikbutton schaltet jetzt YouTube wirklich stumm/an
   - Spiel-Soundeffekte bleiben davon getrennt

2. Mitspieler im Spiel
   - Gegneranzeige wird nicht mehr durch den Musikfehler abgebrochen
   - Mitspieler erscheinen sichtbar oben mit Name, Kartenanzahl und Auswahlstatus

3. Karte gewählt, aber Runde hängt
   - Runden warten nur noch auf Spieler, die tatsächlich eine normale Karte spielen können
   - Spieler mit ausschließlich Spezialkarten blockieren die Runde nicht mehr
   - Server bestätigt deine Auswahl ausdrücklich
   - nach dem Legen steht sichtbar: "Karte gewählt – warte auf die anderen Spieler"

4. Countdown
   - Countdown ist jetzt serverseitig mit Endzeit gespeichert
   - falls das einzelne Countdown-Event verpasst wird, stellt roomState ihn trotzdem wieder her
   - 5–1 wird groß in der Mitte angezeigt

5. Spezialkarten
   - deutlich größere Spezialkarten
   - große Kategorie-Kennzeichnung direkt auf der Karte:
       ⚡ Nur Schnelligkeit
       🏋️ Nur Stärke
       ✦ Jede Kategorie
   - Effektbeschreibung wird zusätzlich groß lesbar eingeblendet
   - "Spezial einsetzen"-Button größer

Danach:
GitHub committen -> Render "Deploy latest commit" -> im Browser Strg+F5.
