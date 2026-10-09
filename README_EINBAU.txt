MLP Battle Cards – ARENA 1 JADEPALAST – HOCHAUFLÖSUNG (4K)

Dieses Paket behebt NUR die verpixelte chinesische Arena.
Es ändert KEINE Karten, KEINE Spielmechanik, KEINE Spielfeldgröße und
KEINE anderen drei Arenen. Die Blätter-/Wind-Effekte bleiben wie vorher.

WARUM ES VORHER NICHT GEKLAPPT HAT
Die zuletzt verwendete Arena-CSS enthielt ein altes Mini-Bild direkt
als eingebettete Base64-Grafik. Diese CSS-Regel hat die neue PNG-Datei
überlagert. Nur das Bild zu ersetzen konnte darum nichts ändern.

DATEIEN ZUM HOCHLADEN (beide!):
  public/style.css
  public/assets/backgrounds/arena_1_jade_palace.png

EINBAU
1. ZIP entpacken.
2. In deinem GitHub-Repository public/style.css durch DIESE Datei ersetzen.
3. public/assets/backgrounds/arena_1_jade_palace.png hochladen/ersetzen.
4. An anderen Dateien NICHTS ändern.
5. Render-Deployment abwarten, dann im Browser Strg + F5 drücken.
6. Eine neue Partie starten, bis die Arena Jadepalast ausgewählt wird.

WICHTIG
Die style.css baut auf dem zuletzt gelieferten Paket
MLP_BATTLE_CARDS_PUNKT2_ARENEN_ROBUST.zip auf.
Nur so bleibt der bestehende Aufbau identisch; falls du inzwischen
andere Änderungen an style.css gemacht hast, ersetze sie nicht blind.
Dann sollte der Eingriff stattdessen gezielt in deiner aktuellen
style.css erfolgen.

Bilddatei: 3840 x 2160 Pixel (PNG, hochskaliert/geschärft von einer
kleineren Vorlage; keine neue Illustration).
Animation: bisherige CSS-Blätterbewegung aus deinem Spiel (kein GIF,
kein neues Script nötig).
