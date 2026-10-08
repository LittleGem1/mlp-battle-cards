MLP Battle Cards – Kristall / Artefakte / Specials / Goldwahl Fix

Diesen Patch NACH dem letzten Arena-Kristall-Fix einfügen und vorhandene Dateien ersetzen.

BEHOBEN / GEÄNDERT:

1. KATEGORIE-KRISTALL
- Der Kristall wird nicht mehr von der Arena abhängig gerendert.
- Er wird als eigener Portal-Layer direkt am Browserfenster erzeugt.
- Dadurch kann ihn weder PonyBot noch ein Arena-Element verdecken.
- Großer violetter facettierter Kristall.
- Keine Symbole auf dem Kristall.
- Deutliche Drehung über mehrere Achsen.
- Erst nach dem Stoppen erscheint Symbol + Kategorie.
- Die Rundeneinleitung wurde serverseitig auf 4 Sekunden verlängert, damit die Animation vollständig sichtbar ist.
- Doppelte roundIntro-Events starten die Animation nicht mehr neu.

2. ARTEFAKTE
- Die Artefaktanzeige sitzt jetzt RECHTS MITTIG.
- Sie liegt nicht mehr über den Handkarten.
- Die drei Artefaktplätze stehen kompakt untereinander.

3. SPEZIALKARTEN
- Spezialkarten werden nicht mehr durch große Textflächen verdeckt.
- Ein Klick auf eine Spezialkarte öffnet sofort die große Leseansicht.
- Über jeder Spezialkarte stehen sichtbar:
  „🔍 Lesen“ und „✨ Einsetzen“.
- Beim Darüberfahren erscheint zusätzlich die Fähigkeit als Tooltip.
- Spezialkarten sind etwas breiter und werden beim Hover nicht abgeschnitten.

4. GOLDSTAPEL – NEUE REGEL
- Der Rundensieger zieht jetzt 2 Goldkarten.
- Beide werden offen angezeigt.
- Der Sieger wählt genau 1 Karte.
- Die gewählte Karte kann eine Spezialkarte ODER ein Artefakt sein.
- Die nicht gewählte Karte wird zurück in den Goldstapel gemischt.
- Das Match pausiert während der Auswahl.
- 18 Sekunden Auswahlzeit; danach automatische Auswahl.
- PonyBot wählt automatisch und bevorzugt ein ihm noch fehlendes Artefakt.
- Iron Will verhindert weiterhin Artefakte in der Goldauswahl.
- Bereits gesammelte Artefakte werden dem Spieler nicht als nutzlose Auswahl angeboten.

5. PROBERUNDE / SPIELREGELN
- Die Proberunde erklärt nun ebenfalls korrekt:
  2 Goldkarten ziehen -> 1 auswählen.
- Zum Test werden Kristall Herz und eine Spezialkarte angeboten.
