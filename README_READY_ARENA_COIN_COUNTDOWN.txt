MLP BATTLE CARDS – BEREIT-IN-ARENA + KATEGORIE-MÜNZE + COUNTDOWN-FIX

ERSETZEN:
- server.js
- public/index.html
- public/client.js
- public/style.css

GEÄNDERT:
1. Bereit-Knopf ist nicht mehr in der alten Lobby. Nach Raum erstellen/beitreten landet jeder direkt in der Arena-Vorbereitung.
2. Dort sieht jeder Raumcode, alle Spieler und deren Bereit-Status. Sobald alle bereit sind, beginnt der 5-Sekunden-Countdown.
3. Countdown wurde als eigene BODY-Ebene neu gebaut (z-index 2147483647). Er ist nicht mehr von Screen/Scroll/Host-Layout abhängig und wird zusätzlich aus roomState rekonstruiert.
4. Neue Kategorie hat jetzt GENAU EINE Animation: eine große 3D-Münze. Sie fliegt hoch, dreht sich mehrfach und landet mit der neuen Kategorie auf der Rückseite. Das passiert jede Runde – auch bei zweimal derselben Kategorie hintereinander.
5. Kategorie-Intro dauert jetzt 3 Sekunden, damit die Münze gut sichtbar ist.
6. Bestehende Musik, Finisher, Sounds und übrige Spiellogik bleiben erhalten.

GitHub -> Dateien ersetzen -> Commit -> Render Deploy latest commit -> Strg+F5.
