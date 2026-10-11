MLP Battle Cards – Animations-Testzentrum

Nach Einbau stehen zwei zusätzliche Schaltflächen bereit:
- Lobby: „✨ Animationen ansehen“, neben den Karten-Optionen
- Arena: „✨ Animationen ansehen“ oben rechts

Im Fenster kannst du sechs derzeit einzeln aufrufbare Effekte testen:
Diabolo, Zauberklau, Zauberkopierer, Changeling, Windchaos, Cockatrice.

„Skript geladen“ bedeutet, dass das Effektmodul im Browser vorhanden ist. Das ist KEIN Beleg dafür, dass ein echter Multiplayer-Socket-Auslöser klappt. Teste den Effekt mit „Ansehen“ und anschließend im Match.

SO INSTALLIEREN:
1) ZIP entpacken.
2) Dateien in gleichnamige Pfade im GitHub-Repository übernehmen.
3) Render deployen lassen; Browser Strg+F5.
4) Lobby und Arena öffnen und Testbuttons ausprobieren.

Enthaltenes index.html basiert auf dem letzten lokal vorliegenden Projektstand. Achtung: Falls du das HTML danach online verändert hast, übernimm nur die beiden neuen Zeilen direkt vor </body>, statt deine aktuellere index.html zu ersetzen:
<link rel="stylesheet" href="/mlp_animation_center.css?v=20261011-1">
<script src="/mlp_animation_center.js?v=20261011-1"></script>

Der Patch ändert keine Server-Regeln und keine Kartenbilder.
