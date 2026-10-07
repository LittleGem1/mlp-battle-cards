MLP BATTLE CARDS – MUSIK + KUCHENBISS + FINISHER-NAMEN FIX

Enthalten:
- public/client.js
- public/style.css
- public/index.html
- server.js
- README_POP_ARENAS_MUSIC_FINISHERS.txt
- dieses README

ÄNDERUNGEN:
1. Verlierer-Finisher:
   - Spielername wird bei der Verliererkarte NICHT mehr eingeblendet.
   - Die Karte selbst bleibt natürlich sichtbar.

2. Kuchenbiss:
   - Die alte eckige Clip-Path-Animation wurde deaktiviert.
   - Die Karte wird jetzt auf einem Canvas Stück für Stück mit echten runden/scalloped
     Bissspuren vom Rand weggefressen.
   - Jeder Biss bekommt Krümel + eigenen Chomp-Sound.
   - Danach zerbröselt der kleine Rest und fliegt ins Gewinnerdeck.

3. Musik:
   - Es bleiben exakt die von dir ausgewählten Tracks:
     Lobby/Home: Sappheiros – Dawn (YouTube-ID pWAP7fIwGnI)
     Match: Makai Symphony – Dragon Castle (YouTube-ID 9gBTKiVqprE)
   - Der YouTube-Player wird bereits stumm vorgeladen und beim ersten echten Klick
     des Spielers freigeschaltet.
   - Raum erstellen, Beitreten und Bereit lösen die Musik-Freischaltung ebenfalls aus.
   - Ein Watchdog startet die Musik neu, falls Opera/Chrome sie nach einem Wechsel pausiert.
   - Der alte gespeicherte Aus-Zustand wird einmalig für diese Version auf "Musik an"
     zurückgesetzt; danach funktioniert Mute wieder normal.
   - Lautstärkeregler bleibt aktiv.

Installation:
ZIP entpacken -> Dateien ersetzen -> GitHub Commit -> Render neu deployen -> Strg+F5.
