HELEMENTS OF ARMORY – MLP BATTLE CARDS – EINBAUPAKET
===================================================

INHALT
- assets/helements-of-armory.png         fertige Special-Kartengrafik (lila/schwarz/rot)
- assets/helements-fart.mp3              Furz-Soundeffekt
- assets/helements-rumble.mp3            Erdbeben / Steinbröckeln / Landslide-SFX
- helements-of-armory/helements-of-armory.css   visuelle Erdbeben-/Spawn-Effekte
- helements-of-armory/helements-of-armory.js    Client-Animation als ES-Modul
- helements-of-armory/helements-of-armory-rules.cjs  Server-Hilfsfunktion für zufälliges fehlendes Artefakt
- VORSCHAU.html                          einfache Startansicht zum lokalen Test
- BEISPIEL_EINBINDUNG.html               kleines Integrationsbeispiel mit Testdeck

WICHTIG
Das Paket ist GitHub-fertig vorbereitet, aber NICHT direkt in dein echtes aktuelles Repo
gepatcht, weil ich den laufenden Projektcode hier nicht direkt öffnen kann.
Die Dateien müssen an deine bestehenden Eventnamen, Deck-/Artefakt-Daten und Imports angepasst werden.

SPIELREGEL
Helements of Armory ist eine Special-Karte ohne normale Werte.
Beim Ausspielen erhält der Spieler genau EIN zufälliges Artefakt, das ihm aktuell noch fehlt.
Wenn keine Artefakte mehr fehlen, sollte serverseitig KEIN neues Artefakt vergeben werden.

EMPFOHLENER SERVERABLAUF
1. Prüfen: Karte wirklich ausgespielt? Spieler darf Effekt auslösen?
2. Mit getHelementsOfArmoryEffect({ allArtifactIds, ownedArtifactIds }) die Liste fehlender Artefakte bestimmen.
3. grantedArtifactId speichern und dem Spielerinventar hinzufügen.
4. Danach an die Match-Clients ein Event senden, z.B.:
   helements_of_armory_activated
   {
     playerId,
     grantedArtifactId,
     grantedArtifactName,
     grantedArtifactImageUrl,
     deckCountBefore,
     deckCountAfter
   }
5. Im Client NACH Bestätigung des Servers playHelementsOfArmoryAnimation(...) aufrufen.
   Die Animation selbst entscheidet NICHT, welches Artefakt gewährt wird – das bleibt Serversache.

EMPFOHLENER CLIENT-EINBAU
- CSS einbinden:
  <link rel="stylesheet" href="/helements-of-armory/helements-of-armory.css">

- Modul importieren:
  import { playHelementsOfArmoryAnimation } from '/helements-of-armory/helements-of-armory.js';

- Animation auf bestätigtes Server-Event:
  await playHelementsOfArmoryAnimation({
    sourceElement: document.querySelector('[data-card-id="helements_of_armory"]'),
    deckElement: document.querySelector('[data-player-id="ME"] .deck'),
    arenaElement: document.querySelector('.arena'),
    rumbleUrl: '/assets/helements-rumble.mp3',
    fartUrl: '/assets/helements-fart.mp3',
    artifactName: grantedArtifactName,
    artifactImageUrl: grantedArtifactImageUrl,
    deckCountBefore,
    deckCountAfter,
    onArtifactGranted: () => {
      // Hier erst die echte UI anhand der serverbestätigten Daten updaten.
    }
  });

ANIMATIONSABLAUF
- Arena bebt heftig wie bei einem Erdbeben.
- Mehrere Steine / Schuttstücke bröseln und fallen durch das Bild.
- Danach als Pointe Furz-Sound.
- In einer Furzwolke erscheint das neue Artefakt.
- Das Artefakt fliegt in das Deck des betroffenen Spielers.
- Optionaler Deckzähler springt z.B. 6 → 7.

DATEISTRUKTUR-TIPP
- assets/ in deinen öffentlichen Asset-Ordner kopieren.
- helements-of-armory/ in deinen Frontend-/Clientbereich kopieren oder dort importieren.

Wenn du mir später wieder die echte Projekt-ZIP gibst, kann ich das direkt in deine aktuelle Spielversion verdrahten.
