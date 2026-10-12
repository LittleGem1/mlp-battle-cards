MLP Battle Cards – Host-Arenaauswahl fuer echte Mitspieler

Problem: Der Server kann die Arena bereits einstellen, aber public/arena_selector.js wurde nicht von index.html geladen.

Fix:
- Auswahlknopf in der Wartelobby fuer den Host eingebunden
- Jede Arena plus Zufall auswaehlbar
- Gewaehlte Arena wird als Raumstatus an alle Spieler uebermittelt
- Dieselbe Arena wird fuer das folgende Match benutzt
- Einstellung bleibt nach einem Match erhalten, bis der Host sie aendert

Einbau:
1. ZIP entpacken
2. server.js, public/index.html, public/arena_selector.js in genau denselben Pfaden auf GitHub ersetzen
3. Render neu deployen
4. Browser mit Strg+F5 neu laden
5. Zwei Browser mit unterschiedlichen Spielern verbinden. Host waehlt in der Lobby eine Arena aus. Beide gehen auf Bereit.

Hinweis: Bitte die aktuellen Dateien vor dem Ersetzen sichern, falls du seit diesem Stand weitere Spielaenderungen hast.
