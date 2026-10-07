MLP Battle Cards – Endgame / Countdown / 30s / Kartenwerte Fix

Enthalten:
- server.js
- cards.js
- public/index.html
- public/client.js
- public/style.css
- public/assets/cards/ (alle 60 normalen Karten neu gespeichert)

Änderungen:
1) Spielende:
- Jeder Spieler entscheidet selbst, wann er „Zur Lobby“ wählt.
- Der Host kann am Spielende NICHT mehr alle anderen sofort in die Lobby ziehen.
- Geschenk/Belohnung eines anderen Spielers bleibt dadurch offen.
- Erst wenn alle Spieler selbst fertig sind, wird der gemeinsame Raum wieder Lobby.

2) Start-Countdown:
- 5–1 ist für JEDEN Spieler als Fullscreen-Overlay sichtbar – unabhängig vom Scrollen.
- großer bunter Countdown + Tick-Sound; kein Flackern.

3) Kartenwerte:
- Alle 60 normalen Kartenbilder wurden mit den aktuellen Werten aus cards.js neu ausgegeben.
- Maximalwert bleibt 9.
- Die zusätzliche HTML-Zahlenschicht wurde entfernt: pro Symbol steht wirklich nur EIN Wert auf der Karte.
- Photo Finish und Sapphire Shores basieren weiterhin auf den korrigierten Versionen.

4) Strafkarten-Timer:
- jetzt 30 Sekunden statt 10 Sekunden.
- Tutorialtext ebenfalls auf 30 Sekunden geändert.

Installation:
ZIP entpacken -> Inhalt in Projektordner kopieren und ersetzen -> GitHub committen -> Render neu deployen -> Strg+F5.
