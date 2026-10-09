MLP BATTLE CARDS – ARENA 1: SICHTBARE BLÄTTER-ANIMATION

Dies ist ein reiner Arena-1-Animationsfix. Der 4K-Jadepalast bleibt bestehen.

Auf GitHub hochladen und ersetzen:
1) public/style.css
2) public/assets/backgrounds/jadepalast_sichtbarer_blattwind.webp   (neu)

WICHTIG:
- Lade beide Dateien im angegebenen Ordner hoch.
- public/assets/backgrounds/arena_1_jade_palace.png BLEIBT unverändert.
- Keine client.js, keine server.js, keine index.html überschreiben.
- Die ZIP-style.css basiert auf deinem letzten Arena-1-Blätter-Fix.
  Wenn du dazwischen CSS von Hand verändert hast: Statt der gesamten Datei
  nur den letzten Block 'Arena 1, punktueller Blattwind-Fix' ans Ende deiner
  aktuellen public/style.css anhängen.
- Ein neues Match starten, bis der Jadepalast ausgewählt wird.
- Nach Deployment Strg + F5 oder Cache leeren.

WARUM DIESE VERSION ANDERS IST:
Die Animation wird direkt als oberste Arena-Hintergrundebene angezeigt.
Sie hängt nicht vom pseudo-Element #arenaVfx::after oder Spiel-JavaScript ab.
Die Blätter sind bewusst größer, leuchtender und sichtbarer.
Die Hintergrundanimation fängt keine Klicks ab.
