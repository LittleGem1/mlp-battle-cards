DIESER PATCH ENTHÄLT NUR DIE ACCESSOIRE-BILDER.

Warum:
Dein Server liefert jetzt ausschließlich den Ordner /public aus.
Die Bilder lagen vorher außerhalb davon, deshalb kam das kaputte Bildsymbol.

So anwenden:
1. ZIP entpacken.
2. Den enthaltenen Ordner "public" in deinen Projektordner ziehen.
3. "Dateien im Ziel ersetzen/zusammenführen" bestätigen.
4. Bei GitHub nur den Ordner:
   public/assets/accessories/
   hochladen bzw. ergänzen.
5. Committen.
6. Render -> Manual Deploy -> Deploy latest commit.
7. Website mit Strg+F5 neu laden.

Es müssen danach 24 PNG-Dateien unter
public/assets/accessories/
liegen.
