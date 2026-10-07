MLP Battle Cards – Kristallhöhlen-Lobby + Musiksteuerung

ERSETZEN:
- public/index.html
- public/client.js
- public/style.css

GEÄNDERT:
- In der Bereit-/Warte-Lobby ist der Mute-Button jetzt direkt sichtbar.
- Dort gibt es ebenfalls einen sichtbaren Lautstärkeregler inklusive Prozentanzeige.
- Home/Namensauswahl und Lobby verwenden ausschließlich die animierte Kristallhöhle.
- Schwebende/leuchtende Kristalle, Lichtpartikel und Tropfen bleiben aktiv.
- Vor Matchbeginn wird KEINE der drei Kampfarenen mehr vorzeitig angezeigt.
- Erst wenn alle bereit sind und das Match/der Countdown beginnt, wird die serverseitig zufällig gewählte Arena sichtbar.
- Im Match bleiben exakt die drei Arenen: Kristall-Kolosseum, Sturm-Tempel, Himmlische Schmiede.
- Lobby-Musik und Battle-Musik wechseln weiterhin automatisch passend zur Phase.

Danach GitHub committen -> Render Deploy latest commit -> Strg+F5.
