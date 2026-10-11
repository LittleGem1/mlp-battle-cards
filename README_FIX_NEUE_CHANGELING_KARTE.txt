Fix für die neue Changeling-Karte

Problem:
Im Spiel wurde noch die alte Changeling-Karte angezeigt, weil zusätzlich die optimierte WebP-Datei verwendet wurde.

Enthaltene Dateien:
- cards.js
- public/cards.js
- public/assets/specials_new/74_Changeling.png
- public/optimized_assets/specials_new/74_Changeling.png.webp

Einbau:
Diese Dateien im Projekt an denselben Pfaden ersetzen und danach neu deployen.
Danach im Browser Strg + F5 drücken.
