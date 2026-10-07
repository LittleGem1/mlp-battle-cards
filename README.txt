MLP BATTLE CARDS – FLOW / 10-SEKUNDEN-STRAFE / MUSIKSTEUERUNG

ERSETZEN:
- server.js
- public/index.html
- public/client.js
- public/style.css

MUSIK:
- Die beiden von dir gewählten YouTube-Tracks bleiben die Musikquelle.
- Es wird KEIN sichtbares YouTube-Video mehr angezeigt.
- Die Seite zeigt nur eigene Musiksteuerung: stumm/an + Lautstärkeregler.
- Mute bleibt gespeichert und wird NICHT durch Kartenlegen/Soundeffekte wieder aufgehoben.
- Soundeffekte und Hintergrundmusik sind technisch getrennt.

SPIEL:
- Jede Kartenrunde hat 10 Sekunden Auswahlzeit.
- Wenn ein Spieler keine Karte legt:
  1. die aktuelle Runde wird abgebrochen,
  2. bereits gelegte Karten gehen an ihre Spieler zurück,
  3. jeder zu langsame Spieler verliert zufällig 1 Karte als Strafkarte,
  4. danach wird automatisch eine NEUE Kategorie gezogen.
- Die Teilnehmerliste einer Runde wird zu Rundenbeginn festgehalten.
  Dadurch kann das Spiel nicht mehr wegen wechselnder Handgrößen hängen.
- Sobald alle nötigen Spieler gewählt haben, wird sofort ausgewertet.

BUTTONS:
- Host: Spiel abbrechen -> zurück in die Lobby.
- Nach Spielende: Zurück zur Lobby funktioniert für alle.
- Lobby-/Hauptmenüstatus wird clientseitig zusätzlich sofort aktualisiert.

WICHTIG:
Die Musik wird weiterhin über den offiziellen YouTube-IFrame-Player gestreamt.
Sie wird nicht heruntergeladen oder als MP3 aus YouTube extrahiert.

INSTALLATION:
ZIP entpacken -> diese Dateien ersetzen -> GitHub Commit ->
Render "Deploy latest commit" -> Browser Strg+F5.
