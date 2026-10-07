MLP BATTLE CARDS – POP-ARENAS / MUSIK / COUNTDOWN / FINISHER V2

DIESE DATEIEN ERSETZEN:
- server.js
- public/index.html
- public/client.js
- public/style.css

WAS GEÄNDERT WURDE

1) Musik repariert – genau die ausgewählten Tracks
- Lobby / Namensauswahl / Wartezeit:
  YouTube-ID pWAP7fIwGnI
- Match / Kartenkampf:
  YouTube-ID 9gBTKiVqprE
- kein sichtbares YouTube-Video
- Player bleibt 1x1 Pixel außerhalb des sichtbaren Bereichs
- nach der ersten Nutzerinteraktion wird die Musik automatisch aktiviert
- beim Wechsel Lobby -> Match wird automatisch auf den Battle-Track gewechselt
- Lautstärke und Mute bleiben weiterhin benutzbar

Hinweis: Browser erlauben Ton normalerweise erst nach der ersten Nutzerinteraktion.
Da jeder Spieler ohnehin klickt (Raum, Beitreten, Bereit usw.), wird dieser Klick jetzt gezielt genutzt.

2) Countdown für ALLE Spieler / Host-Fix
- Countdown liegt jetzt direkt als globale Ebene auf dem Body
- dadurch kann er nicht mehr von Arena, Scrollposition oder anderen Elementen verdeckt werden
- Host und Gäste bekommen denselben Countdown
- 5, 4, 3, 2, 1 + kurzer LOS!-Moment
- Tick-Sounds bleiben enthalten
- kein hektisches Flackern

3) Lobby / Namensauswahl – 3 animierte Szenen
Die hochgeladenen Bilder wurden nur als Stimmung / Inspiration verwendet und NICHT kopiert.
Es gibt drei eigenständige CSS-Szenen, die zufällig wechseln:
- Magischer Dojo-Palast: Laternen, Licht, fallende Blütenblätter, Funken
- Leuchtende Kristallhöhle: Kristalle, Lichtportal, schwebende Partikel, Wassertropfen
- Kosmische Nebelwelt: Planet, Ring, Sterne, Nebel und Meteore

4) Match – Arenen deutlich epischer
- Kristall-Kolosseum: schwebende Kristallsplitter, rotierende Runenringe, Lichtstrahlen
- Sturm-Tempel: Regen, Wolken, Blitze, steinerner Arenaboden
- Himmlische Schmiede: kosmischer Kern, Funken, Runen und rotierende Energieringe
- alle Spieler sehen weiterhin dieselbe Arena pro Match

5) Finisher komplett größer und sichtbarer
Die Verliererkarten werden für den Finisher groß auf einer eigenen Bühne gezeigt.
Erst NACH dem Finisher fliegen alle ausgespielten Karten sichtbar zum Gewinnerdeck.
Dauer ca. 4,6 Sekunden – bewusst nicht zu schnell.

Vorhandene Finisher wurden stark überarbeitet:
- Magischer Drache + großer Feueratem
- Magische Auflösung
- Sternenregen / Sternenbeschuss
- Schuss-Finisher mit Mündungsblitzen und Einschusslöchern
- Blumen / Ranken verschlingen die Karte
- Kuchen wird Stück für Stück aufgegessen
- LOSER-Holzlatte + Hammer / Nägel
- Karte friert sichtbar zu einem Eisklotz ein
- Blitzsturm
- Portal-Sog
- Kristall-Burst
- Schattenketten

Neue Finisher:
- FARB-BOMBE: bunte Kugeln fliegen herein und kleistern die Karte mit Farbklecksen zu
- STICKER-STURM: Sterne, Herzen, Wolken, Blitze und Klebestreifen bedecken die Karte
- KOMETEN-CRASH: leuchtender Komet schlägt ein und sprengt die Karte auseinander
- MAGISCHES SIEGEL: Runenkreise schließen sich und stempeln die Karte mit DEFEATED

6) Sounds
- jeder Finisher besitzt eine eigene Soundabfolge
- Drache: tiefes Brüllen / Feuerrauschen
- Auflösen: abfallende Magietöne
- Sterne: helle Treffer
- Schüsse: kurze Impulse + Rauch/Impact
- Blumen: wachsende magische Tonfolge
- Kuchen: Biss-/Crunch-Impulse
- Holzlatte: harte Hammer-Treffer
- Eis: Kristallklänge + Bruch
- Blitz: elektrische Schläge
- Portal: absinkender Sog
- Kristall: helle Splitterklänge
- Schattenketten: tiefe Ketten-/Dunkelimpulse
- Farb-Bombe: Pop/Splat-Sounds
- Sticker: Pop-/Klickfolge
- Komet: schneller Anflug + großer Einschlag
- Siegel: magische Akkordfolge + Stamp-Impact

INSTALLATION
1. ZIP entpacken.
2. Die vier Dateien in dein bestehendes Projekt kopieren und ersetzen.
3. GitHub committen.
4. Render -> Manual Deploy -> Deploy latest commit.
5. Browser einmal mit Strg + F5 neu laden.
