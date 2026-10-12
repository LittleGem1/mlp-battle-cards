SWEETIE BOT – MLP BATTLE CARDS – EINBAUPAKET
==============================================

INHALT
- assets/sweetie-bot.png                 fertige Special-Kartengrafik
- assets/sweetie-bot-voice.mp3           hochgeladene vollständige Voiceline
- sweetie-bot/sweetie-bot.css            visuelle Schüsse, Risse, Einschusslöcher
- sweetie-bot/sweetie-bot.js             abspielbare Animation als JS-ES-Modul
- sweetie-bot/sweetie-bot-rules.cjs       Server-Hilfsfunktion für Halbierung
- VORSCHAU.html                         bisherige getestete Ansicht
- BEISPIEL_EINBINDUNG.html              separat startbares Beispiel (per Webserver)

WICHTIG
Das Paket ist zum Einbau vorbereitet, aber NOCH NICHT mit dem echten GitHub-Spiel
verbunden. Ohne die aktuellen Game-Dateien lassen sich die konkreten Imports,
Kartenregister, Server-Events und Zustandsdaten nicht zuverlässig patchen.

EINBAU IN EINE TYPISCHE NODE-/BROWSER-APP
1. Die Dateien in assets/ in den öffentlich ausgelieferten assets-Ordner kopieren.
   Bei Express/Render ist das z.B. public/assets/ (abhängig von deiner Projektstruktur).
2. sweetie-bot.css und sweetie-bot.js in den öffentlich ausgelieferten Clientcode
   legen oder in den bestehenden Frontend-Build importieren.
3. Im Spiel die Special-Karte mit der Kennung `sweetie_bot` und dem Bildpfad
   `/assets/sweetie-bot.png` registrieren. Sweetie Bot hat KEINE normalen Werte.
4. Im Server bei dieser Karte eine Auswahl des GEGNERS ermöglichen, dessen
   Karte in dieser Runde bereits ausgespielt wurde.
   Nur vom Server prüfen: gewählte Karte bereits gelegt, Ziel erlaubt,
   Kategorie die gerade aktiv ist, Effekt nicht doppelt ausgelöst.
5. Die Serverlogik mit `getSweetieBotEffect({category, playedCard,
   targetPlayerId, alreadyApplied})` verwenden. Das Ergebnis als temporären
   Modifier NUR für die gewählte Karte und aktive Kategorie dieser Runde
   ablegen. Keine dauerhafte Mutation von Basiswerten in der Datenbank!
   Falls das Spiel bereits Modifiers verwendet: dort integrieren und Doppel-
   Anwendung / Konflikte mit anderen Specials anhand der bestehenden Regeln
   behandeln. Bei Rundenende temporäre Modifiers entfernen.
6. Ein Serverereignis nach bestätigter Aktivierung an ALLE relevanten
   Match-Clients senden, z.B. `sweetie_bot_activated` mit:
   {targetPlayerId, targetCardId, category, previousValue, newValue}
   (Eventname und Transport müssen zur bestehenden App passen.)
7. Im Client nach Empfang des Events auf der betroffenen gespielten Karte
   `playSweetieBotAnimation` aufrufen, mit echter Quelle/Ziel.
   Der Server hat den halbierten Wert vorgegeben, die Animation ändert selbst
   ausdrücklich KEINE serverseitigen Punkte oder Kartenwerte.
8. Während der Voiceline/Animation muss die bestehende Rundensteuerung
   synchron pausieren bzw. auf das serverseitige Ereignis abgestimmt sein.
   Sonst kann die nächste Runde starten, bevor Spieler die Animation sehen.
9. SOUND: Der Ton wird vollständig abgespielt, DANACH starten die Schüsse.
   Browser lassen Audio ggf. erst nach einer Nutzeraktion zu; das Beispiel
   zeigt eine Anforderung durch Button. Bei Mute überspringt das Modul den Ton.

BEISPIEL IMPORT (BROWSER, ES-MODUL)
----------------------------------
<link rel="stylesheet" href="/sweetie-bot/sweetie-bot.css">
<script type="module">
import {playSweetieBotAnimation} from '/sweetie-bot/sweetie-bot.js';
// Innerhalb des Events für die bestätigte Server-Aktivierung:
await playSweetieBotAnimation({
 sourceElement: document.querySelector('[data-card-id="sweetie_bot"]'),
 targetElement: document.querySelector('[data-player-id="TARGET"] .played-card'),
 voiceUrl: '/assets/sweetie-bot-voice.mp3',
 muted: false,
 oldValue: 8,
 newValue: 4,
 onValueReveal: () => { /* UI mit serverbestätigtem Wert updaten */ }
});
</script>

SPIELREGEL
- Nur Special-Karte, KEINE Geschwindigkeit/Stärke/Energie/Magie-Werte.
- Gegner mit bereits gelegter Karte auswählen.
- Halbiert AUSSCHLIESSLICH den Wert in der AKTIVEN Kategorie.
- Gilt ausschließlich für diese Runde.
- Bei ungeraden Werten wird AUFGERUNDET (z.B. 9→5, 7→4, 1→1).
- Von Server abgesichert, damit keine Manipulation über Clients entsteht.

WICHTIG ZUR VORSCHAU
VORSCHAU.html ist die vorherige stand-alone Vorschau, die Bild und MP3
bereits enthält. Die eigentlichen Integrationsdateien verwenden externe Assets.

Wenn du mir deine aktuelle ZIP vom MLP Battle Cards Projekt schickst, kann ich
Kartenregister, Multiplayer-Events, Zielauswahl und tatsächliche Spiellogik
passgenau patchen und dir eine direkt austauschbare ZIP machen.
