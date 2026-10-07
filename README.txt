MLP BATTLE CARDS – STABLE REBUILD

Diese Version baut die Spiellogik bewusst wieder auf der letzten stabilen Multiplayer-Version auf.
Der kaputte YouTube-IFrame-Code ist komplett entfernt.

ERSETZEN:
- server.js
- cards.js
- public/index.html
- public/client.js
- public/style.css
- public/assets/music/

REPARIERT:
- 5-Sekunden-Countdown 5–1 vor dem ersten Zug.
- 10-Sekunden-Timer in jeder Kartenrunde.
- Wer nicht rechtzeitig legt, verliert eine zufällige Strafkarte.
- Danach wird die Runde verworfen und eine neue Kategorie gezogen.
- Beide Spieler sind sichtbar.
- Sobald jemand legt, fliegt eine verdeckte Karte in die Mitte.
- Wenn alle gelegt haben, drehen die Karten gleichzeitig auf.
- Danach fliegen die Karten sichtbar zum Gewinner.
- Würfelanimation ist wieder für beide Seiten sichtbar.
- Kartenwahl wertet wieder aus und hängt nicht mehr.
- Spiel abbrechen (Host) -> zurück in Lobby.
- Nach Spielende: Lobby / Hauptmenü / Schließen.
- Lobby-Accessoire-Auswahl funktioniert.
- Spezialkarten zeigen Kategorie + Effekt groß lesbar.
- Karten sind größer.
- alle normalen Werte maximal 9.

MUSIK:
- lokale Hintergrundmusik ohne Video / iframe.
- Mute bleibt aus und wird durch Soundeffekte NICHT wieder eingeschaltet.
- Lautstärkeregler ist in Lobby und Spiel vorhanden.
- Lobby- und Kampfmusik sind getrennt.

Die exakten YouTube-Songs sind in dieser stabilen Version absichtlich nicht eingebettet,
weil genau der unsichtbare YouTube-Player mehrfach die Musiksteuerung und Teile des Clients kaputt gemacht hat.
Wenn du die Audiodateien selbst legal besitzt und hochlädst, können sie später 1:1 ausgetauscht werden.

Installation:
ZIP entpacken -> Dateien ersetzen -> GitHub committen -> Render neu deployen -> Strg+F5.
