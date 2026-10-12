MLP Battle Cards – Animations-Testzentrum: Vordergrund-Fix

PROBLEM:
Das Bedienfenster verdeckt die Effekte, wenn eine Vorschau gestartet wird.

LÖSUNG:
Bei Klick auf "Ansehen" blendet sich das Bedienfenster vorübergehend aus.
Die tatsächliche Vollbildanimation ist dadurch sichtbar und der Sound läuft weiter.
Nach ungefähr 5–6 Sekunden erscheint das Bedienfenster wieder.
Es werden weiterhin keine Spielkarten verbraucht oder Runden verändert.

EINBAU:
1. ZIP entpacken.
2. Diese zwei Dateien im bestehenden Projekt ersetzen:
   public/mlp_animation_center.js
   public/mlp_animation_center.css
3. GitHub-Änderungen speichern und Render deployen lassen.
4. Browser mit Strg+F5 neu laden.

WICHTIG: Das Animations-Testzentrum aus dem vorherigen Patch muss bereits eingebaut sein.
