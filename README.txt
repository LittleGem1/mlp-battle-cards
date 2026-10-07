MLP BATTLE CARDS – KATEGORIE-LIMIT / EIN WERT PRO SYMBOL / GROSSE HAND

Ersetzen bzw. zusammenführen:
- server.js
- cards.js
- public/client.js
- public/style.css
- public/assets/cards/ (alle 60 Karten ersetzen)

GEÄNDERT:
1. Kategorien dürfen maximal 3-mal hintereinander gleich sein.
   Wenn z.B. 3x Magie kam, ist Magie in der direkt folgenden Runde ausgeschlossen.

2. Alle 60 normalen Karten liegen in dieser ZIP erneut korrigiert vor.
   Pro Symbol ist nur eine Zahl im Artwork sichtbar.
   Der Client zeichnet keine zweite Zahlenschicht mehr darüber.

3. Große Hand (>10 Karten):
   - Top-10 für die aktuelle Kategorie bleiben oben.
   - Mehr Abstand zwischen Banner und Karten.
   - Karten werden etwas tiefer platziert.
   - Hover hebt nur noch moderat an, damit die oberen Werte lesbar bleiben.
   - Restliche Karten bleiben darunter weiterhin scrollbar und spielbar.

Danach GitHub committen -> Render Deploy latest commit -> Strg+F5.
