# Crystal Clash – Multiplayer-Prototyp

Ein spielbarer Web-Prototyp für das Pony-Kartenspiel mit 2–8 Spielern.

## Enthalten

- Raum erstellen / per 5-stelligem Code beitreten
- 2–8 Spieler
- pro Spieler 7 zufällige Karten
- **keine Karte doppelt am Tisch**
- 5-Sekunden-Countdown mit Sound
- gegnerische Hände nur als Kartenrückseiten
- zufällige Kategorien: Stärke, Schnelligkeit, Energie, Magie
- Karten fliegen in die Mitte und werden verglichen
- Gewinner nimmt alle ausgespielten Karten
- Spieler mit 0 Karten scheiden aus
- Gleichstand: Würfel-Button + Würfelanimation, höchste Zahl gewinnt; bei erneutem Gleichstand wird erneut gewürfelt
- Name wird im Browser gespeichert
- Namens-Accessoires; Startauswahl: Changeling-Flügel, Ballon, Süßigkeiten
- Sieger bekommt ein Geschenk mit einem zufälligen neuen Accessoire
- 60 normale Karten + 6 Mane-6-Spezialkarten
- Kristall-Look und die erstellte Kristall-Kartenrückseite

## Spezialkarten

Die 6 Mane-6-Spezialkarten sind bereits spielbar:

- Twilight Sparkle: 2 neue Karten ziehen
- Rainbow Dash / Sonic Rainboom: +2 Schnelligkeit in einer Schnelligkeitsrunde
- Applejack: +1 Stärke in einer Stärkerunde
- Pinkie Pie: 1 neue Karte ziehen
- Fluttershy: 2 neue Karten ansehen, 1 behalten
- Rarity: 1 Handkarte gegen 1 neue Karte tauschen

Spezialkarten werden **zusätzlich** während der Kartenauswahl eingesetzt und sind danach verbraucht. Zum eigentlichen Wertevergleich wird weiterhin eine normale Karte gewählt.

## Lokal starten

1. Node.js 18 oder neuer installieren.
2. Im Projektordner ein Terminal öffnen.
3. `npm install`
4. `npm start`
5. Im Browser `http://localhost:3000` öffnen.

Zum Testen mehrerer Spieler einfach mehrere Browserfenster oder Geräte im selben Netzwerk benutzen. Für Geräte im LAN statt `localhost` die lokale IP des Server-PCs verwenden.

## Online stellen

Da echtes Multiplayer über Socket.IO einen laufenden Server benötigt, reicht **GitHub Pages allein nicht**. Das Projekt kann aber ganz normal auf GitHub liegen und anschließend z. B. als Node-Webservice bei einem Hosting-Anbieter bereitgestellt werden.

### Render

Im Projekt liegt bereits `render.yaml`. Repository auf GitHub hochladen, bei Render als Web Service verbinden und deployen. Build: `npm install`, Start: `npm start`.

## Dateien

- `server.js` – Raum- und Spiellogik
- `cards.js` – Kartenwerte + Spezialeffekte
- `public/index.html` – Oberfläche
- `public/style.css` – Kristall-Arena und Layout
- `public/client.js` – Browser-Logik, Animationen und Sound
- `public/assets/cards` – 60 optimierte Wertkarten
- `public/assets/specials` – 6 Spezialkarten
- `public/assets/card_back.webp` – Kartenrückseite

## Nächste sinnvolle Ausbaustufen

- richtige Account-/Cloud-Speicherung für freigeschaltete Accessoires (aktuell im jeweiligen Browser gespeichert)
- Reconnect bei Verbindungsabbruch
- private Räume mit Passwort
- eigene Sounds/Musikdateien
- weitere Animationen für Kartenwurf, Flip und Sieg
- Spectator-Modus
