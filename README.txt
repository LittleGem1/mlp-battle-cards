MLP Battle Cards – Postgame-Lobby Fix

Ersetzen:
- public/client.js
- public/style.css

Fix:
- Nach Klick auf "Zur Lobby" bleibt DIESER Spieler wirklich in der Lobby.
- Ein späteres roomState mit phase=gameover zieht ihn nicht wieder in die Arena.
- Kein Champion-Text, keine 0-Karten-Anzeige und kein Spielfeld mehr.
- Stattdessen sieht man in der Lobby:
  ✓ In der Lobby
  ⏳ Noch im Ergebnis
- Die anderen Spieler können Geschenk/Endscreen weiter ansehen.
- Sobald alle zurück sind, setzt der Server den Raum normal auf Lobby zurück und die nächste Runde kann starten.
