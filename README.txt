MLP BATTLE CARDS – BALANCE / LOBBY / MUSIK PATCH

Enthalten sind NUR:
- cards.js
- server.js
- public/index.html
- public/client.js
- public/style.css

Änderungen:
1. Kartenwerte:
   - Alle Basiswerte sind hart auf maximal 9 begrenzt.
   - Kontrollierter höchster Basiswert in cards.js: 9
   - Auch Spezial-Boni können den Rundenwert nicht mehr über 9 drücken.
     Bei 9 gegen 9 entsteht ein Gleichstand -> Würfeln.

2. Accessoire in der Lobby:
   - Neuer Button "✨ Accessoire wählen".
   - Auswahl wird sofort an alle Spieler synchronisiert und im Lobby-Namensschild aktualisiert.

3. Gerade gespielte Karte:
   - Eine Karte, die du in der letzten Runde gespielt und zurückgewonnen hast,
     kann in der direkt folgenden Runde NICHT erneut gespielt werden.
   - Sie ist sichtbar abgedunkelt mit "⏳ Gerade gespielt".
   - Der Server blockiert sie zusätzlich, also nicht nur optisch.

4. Musik:
   - Lobby bleibt ruhiger.
   - Im Kartenduell läuft jetzt ein schnelleres, selbst erzeugtes Battle-Thema
     mit Moll-Puls, Bass und Schlag-Impulsen.
   - Keine externe Musikdatei notwendig.

Installation:
1. ZIP entpacken.
2. Genau diese 5 Dateien im Projekt ersetzen.
3. Bei GitHub nur diese Dateien hochladen/committen.
4. Render -> Manual Deploy -> Deploy latest commit.
5. Browser -> Strg + F5.

Hinweis:
Die korrigierten Bilder von Photo Finish und Sapphire Shores sind ein separater
2-Karten-Patch und werden von diesem Code-Patch nicht überschrieben.
