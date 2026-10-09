ARENA 1 – CHINESISCHER JADEPALAST

Enthalten:
- public/assets/backgrounds/arena_1_jade_palace.png   -> hochwertiger Hintergrund
- public/assets/backgrounds/arena_1_leaf.png          -> transparentes Blatt für die Wind-Animation
- public/assets/arena_fx/arena_1_jade_palace.css      -> CSS für Hintergrund und Blätter
- public/assets/arena_fx/arena_1_jade_palace.js       -> JS zum Erzeugen der Blätter
- DEMO_ARENA1.html                                    -> kleine Vorschau zum Testen

So fügst du es ein:
1. arena_1_jade_palace.png und arena_1_leaf.png in deinen Ordner public/assets/backgrounds/ kopieren.
2. Den Inhalt von arena_1_jade_palace.css in deine style.css übernehmen ODER die Datei separat einbinden.
3. Den Inhalt von arena_1_jade_palace.js in deine client.js übernehmen ODER die Datei separat einbinden.
4. Stelle sicher, dass deine Arena das HTML enthält:
   <div class="arena arena-jade_palace">
     <div id="arenaVfx" class="arena-vfx"></div>
   </div>
5. Beim Laden der Arena 1 aufrufen:
   buildJadePalaceArenaVfx(document.getElementById('arenaVfx'));

Wichtig:
- Dieses Paket ändert nicht dein ganzes Spiel.
- Es liefert nur Arena 1 als einsetzbares Paket mit Animation.
- Keine Sounddatei enthalten.
