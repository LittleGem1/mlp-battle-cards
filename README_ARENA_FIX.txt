MLP Battle Cards – Arena/Kristall/Karten Fix

Diesen Patch NACH dem letzten Tutorial-Proberunden-Patch einfügen.

BEHOBEN:
1. Der Kategorie-Kristall:
   - Das benötigte Kristall-HTML hatte gefehlt.
   - Der echte violette 3D-Kristall ist wieder vorhanden.
   - Er dreht sich am Rundenanfang.
   - Symbol + Kategoriename erscheinen erst nach dem Stoppen.
   - client.js besitzt zusätzlich einen Fallback und baut den Kristall notfalls selbst wieder auf.

2. Kategorie im Match:
   - Die aktuelle Kategorie liegt jetzt immer sichtbar oben in der Arena-Mitte.
   - PonyBot/Gegner können sie nicht mehr verdecken.
   - Beim Rundenstart wird sie zusätzlich sichtbar eingeblendet.

3. Handkarten beim Hover:
   - Die Handbox schneidet vergrößerte Karten nicht mehr ab.
   - Normal große Hände bilden weiterhin mehrere Reihen.
   - Große Hände dürfen ebenfalls umbrechen.
   - Der Hover ist etwas kontrollierter, bleibt aber deutlich vergrößert.

4. Artefaktleiste:
   - Sie sitzt nun oberhalb der Hand und überdeckt die linken Karten nicht mehr.

An der eigentlichen Spielmechanik, den zwei Ziehstapeln, Artefakten,
Spezialkarten und PonyBot-Logik wurde in diesem Patch nichts verändert.
