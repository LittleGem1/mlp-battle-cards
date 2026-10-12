MLP BATTLE CARDS – ZWEI SPECIAL KARTEN, PUBLIC-VERSION
======================================================
SWEETIE BOT + HELEMENTS OF ARMORY

WICHTIG: Die originalen Spielquellen sind hier NICHT vorhanden. Diese ZIP ist KEINE
bereits in deinem Multiplayer-Spiel installierte Version. Sie ist ein vorbereiteter
PUBLIC-Ordner mit lauffähigen visuellen Modulen + einzubindenden Server-Helfern.

ORDNER KOPIEREN
  public/assets/*             -> in DEIN Repo nach public/assets/
  public/special-cards/*      -> in DEIN Repo nach public/special-cards/
  public/specials-test.html   -> in DEIN Repo nach public/ (optional zum Testen)
  server/special-cards.cjs    -> in DEIN Repo z.B. server/special-cards.cjs

Wenn dein Express-Server bereits app.use(express.static('public')) nutzt, sind die
Dateien damit unter /assets/* und /special-cards/* erreichbar. Falls nicht, im
bestehenden Server statische Assets konfigurieren:
  const path = require('node:path');
  app.use(express.static(path.join(__dirname, 'public')));
Das Pfadargument ggf. abhängig von deinem tatsächlichen server.js-Standort anpassen.

CLIENT EINBINDEN (HTML)
  <link rel="stylesheet" href="/special-cards/sweetie-bot.css">
  <link rel="stylesheet" href="/special-cards/helements-of-armory.css">
  <script type="module">
    import { showSpecialEffect, specialCardDefinitions } from '/special-cards/register-specials.js';
    // specialCardDefinitions in das BESTEHENDE Kartenregister integrieren;
    // NICHT die bisherigen Karten ersetzen!
    // Bei bestätigter Nachricht des Servers showSpecialEffect(event, elements, options) aufrufen.
  </script>

SERVER EINBINDEN (Node/CommonJS)
  const {definitions,sweetieEffect,helementsEffect} = require('./server/special-cards.cjs');
  // ids: sweetie_bot, helements_of_armory

SWEETIE BOT – VALIDIERUNGEN IM SERVER
  1) Nur tatsächliche ausgespielte Special-Karte, aktive Runde/Spieler.
  2) Gegner-Ziel muss bereits eine Karte gespielt haben; aktive Kategorie prüfen.
  3) Effekt nur einmal auslösen, temporären neuen Wert bis Rundenende speichern.
  4) An alle Spieler serverbestätigtes Event senden mit:
     {cardId:'sweetie_bot',previousValue,newValue,targetPlayerId,...}
  5) Browser animiert erst komplette Voiceline, danach Schuss und Wertwechsel.

HELEMENTS – VALIDIERUNGEN IM SERVER
  1) Spielzeit, Eigentum, Special-Einsatz prüfen.
  2) allArtifactIds / ownedArtifactIds aus LIVE-SERVERZUSTAND lesen.
  3) helementsEffect(...).grantedArtifactId atomar dem Spieler geben, oder null wenn voll.
  4) Event an alle clients: {cardId:'helements_of_armory',
     grantedArtifactName,grantedArtifactImageUrl,deckCountBefore,deckCountAfter,...}
  5) Browser spielt Erdbeben, herabfallende Steine, Furz, Wolke und Kartentransfer.
  Beim Nullfall im echten Spiel keine zusätzlich erfundene Karte anzeigen.

AUDIO
  /assets/sweetie-bot-voice.mp3
  /assets/helements-rumble.mp3
  /assets/helements-fart.mp3
  Alle Originaldateien werden aus public/assets geladen.

TESTEN
  Im vorhandenen Server http://localhost:DEINPORT/specials-test.html öffnen.
  Ohne vorhandenen Express-Server nur für die Demo:
    npm install express
    node server/example-express.cjs
  Dann http://localhost:3000/specials-test.html öffnen.
  Es werden ausdrücklich keine Multiplayer-Events dadurch automatisch registriert.

TEST DER SERVER-REGELN
  node tests/rules-test.cjs

Für einen tatsächlich spielfertigen Repo-Patch brauche ich den aktuellen Repo-ZIP-
Stand (z.B. GitHub: Code -> Download ZIP), damit deine echten Eventnamen,
Round-State-Daten, Goldkarten/Artefakte und Special-Auswahl angeschlossen werden.
