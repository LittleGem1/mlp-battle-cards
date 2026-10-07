MLP Battle Cards – Fix-Paket VOR dem neuen Relikt-Spielprinzip

Einfach diese Dateien in dein bestehendes Projekt kopieren und ersetzen:

- server.js
- public/client.js
- public/style.css

Enthaltene Änderungen:
1. Jeder Spieler startet garantiert mit 1 Spezialkarte + 6 normalen Karten.
   - Mit aktuell nur 6 Specials werden bei 7–8 Spielern vorübergehend einzelne Start-Specials doppelt verteilt.
   - Sobald wir mehr Specials erstellen, verschwindet diese Übergangslösung automatisch.

2. Spieleranordnung im Match:
   - Dein eigener Platz bleibt unten.
   - Alle Gegner werden kreisförmig um die Kampfmitte verteilt statt als Linie oben.

3. Handkarten:
   - Karten überlappen/stapeln sich nicht mehr.
   - Wenn die Breite nicht reicht, werden automatisch weitere Kartenreihen gebildet.
   - Auch bei großen Händen bleiben alle Karten sichtbar/erreichbar.

4. Aufgeben:
   - Neuer Button „🏳 Aufgeben“ während Countdown/Rundenintro/Kartenauswahl.
   - Erster Klick = Sicherheitsabfrage im Button, zweiter Klick bestätigt.
   - Spieler bleibt als Zuschauer im Match.
   - Er wird aus Timern und der laufenden Kartenauswahl entfernt.
   - Wenn dadurch nur noch ein aktiver Spieler übrig ist, gewinnt dieser.

5. Zur Lobby:
   - Nach dem Match gibt es zusätzlich oben im Match einen direkten „↩ Zur Lobby“-Button.
   - Der bereits gebaute Fix bleibt enthalten: Wer zurück in die Lobby geht, wird nicht mehr vom gameover-State zurück in die Arena gezogen.

6. Gleichstand/Würfeln:
   - Wird eine Runde durch Würfeln entschieden, wird für die nächste Runde garantiert ein ANDERER Begriff / eine andere Kategorie gezogen.

NICHT enthalten:
- Noch KEIN Relikt-System.
- Noch KEINE zwei Ziehstapel.
- Noch KEINE neuen Spezialkarten.
Das bauen wir als nächsten Schritt separat.
