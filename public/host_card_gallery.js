/* MLP Battle Cards: read-only host gallery (no gameplay changes).
   Data comes from the server's actual cards.js catalogue. */
(function () {
  'use strict';
  window.MLPHostCardGalleryInstall = function installHostCardGallery(socket, context) {
    if (window.__mlpHostCardGalleryInstalled) return;
    window.__mlpHostCardGalleryInstalled = true;
    const actionBar = document.querySelector('#lobby .lobby-actions');
    if (!actionBar) return;

    const openBtn = document.createElement('button');
    openBtn.id = 'hostCardGalleryBtn';
    openBtn.className = 'soft-btn';
    openBtn.type = 'button';
    openBtn.textContent = '🃏 Alle Karten ansehen';
    openBtn.hidden = true;
    openBtn.style.display = 'none';
    const accessoryButton = document.querySelector('#lobbyAccessoryBtn');
    actionBar.insertBefore(openBtn, accessoryButton || actionBar.firstChild);

    const dialog = document.createElement('dialog');
    dialog.id = 'hostCardGalleryDialog';
    dialog.className = 'hostcard-dialog';
    dialog.setAttribute('aria-label', 'Kartengalerie für den Host');
    dialog.innerHTML = `
      <div class="hostcard-panel">
        <div class="hostcard-heading">
          <div><span class="hostcard-eyebrow">👑 NUR FÜR DEN HOST</span><h2>🃏 Kartengalerie</h2>
            <p>Die Karten der laufenden Spielversion. Neue Bilder erscheinen nach dem GitHub-/Render-Deploy automatisch; nicht eingetragene Karten werden als Vorschau markiert.</p></div>
          <button id="hostcardClose" class="hostcard-close" type="button" aria-label="Galerie schließen">✕</button>
        </div>
        <div class="hostcard-toolbar">
          <div class="hostcard-filters" role="group" aria-label="Kartentyp auswählen">
            <button class="hostcard-filter is-active" data-kind="all" type="button">Alle</button>
            <button class="hostcard-filter" data-kind="normal" type="button">Normale</button>
            <button class="hostcard-filter" data-kind="special" type="button">Special</button>
            <button class="hostcard-filter" data-kind="artifact" type="button">Artefakte</button>
          </div>
          <label class="hostcard-search"><span class="hostcard-sr">Karte suchen</span><input id="hostcardSearch" type="search" placeholder="🔎 Karte suchen …" autocomplete="off" /></label>
          <span id="hostcardCount" class="hostcard-count" aria-live="polite">Lade Karten …</span>
        </div>
        <div class="hostcard-layout">
          <div id="hostcardGrid" class="hostcard-grid" aria-label="Kartenauswahl"></div>
          <aside id="hostcardDetails" class="hostcard-details" aria-live="polite">
            <div class="hostcard-detail-img"><img id="hostcardBigImage" alt="Kartenvorschau" /></div>
            <div class="hostcard-detail-info">
              <span id="hostcardKind" class="hostcard-type">Vorschau</span>
              <h3 id="hostcardName">Wähle links eine Karte aus</h3>
              <div id="hostcardStats" class="hostcard-stats"></div>
              <p id="hostcardEffect" class="hostcard-effect"></p>
              <button id="hostcardFlip" type="button" class="hostcard-flip">↺ Rückseite ansehen</button>
              <div class="hostcard-move"><button id="hostcardPrev" type="button">← Vorherige</button><button id="hostcardNext" type="button">Nächste →</button></div>
            </div>
          </aside>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const $ = selector => dialog.querySelector(selector);
    let cards = [], visible = [], selectedId = null, kind = 'all', showBack = false, loaded = false;
    const fallbackBack = '/assets/card_back.webp';
    function isHostInLobby() {
      const info = context();
      return !!info.state && info.myId === info.state.hostId
        && !!document.querySelector('#lobby.screen.active')
        && (info.state.phase === 'lobby' || (info.state.phase === 'gameover' && (info.state.postGameReady || []).includes(info.myId)));
    }
    function syncHost() {
      const authorized = isHostInLobby();
      openBtn.hidden = !authorized;
      openBtn.style.display = authorized ? 'inline-flex' : 'none';
      if (!authorized && dialog.open) dialog.close();
      if (!authorized) { cards = []; visible = []; loaded = false; selectedId = null; }
    }
    const backUrl = card => card.type === 'normal' ? '/assets/card_back.webp' : '/assets/special_back_gold.png';
    const titleType = type => type === 'normal' ? 'Normale Karte' : type === 'special' ? 'Special-Karte' : 'Artefakt';
    const clean = val => String(val == null ? '' : val).trim();
    const safeImage = val => /^\/assets\/[a-z0-9_./-]+(?:\?v=[a-z0-9_-]+)?$/i.test(clean(val)) ? val : fallbackBack;
    function makeImg(card, large) {
      const img = document.createElement('img');
      img.src = safeImage(card.image);
      img.alt = card.name;
      img.loading = large ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        if (img.dataset.failed) return;
        img.dataset.failed = 'yes';
        img.classList.add('hostcard-broken');
        img.alt = `Bild für ${card.name} fehlt`;
        img.removeAttribute('src');
      }, { once: true });
      return img;
    }
    function getMatches() {
      const search = $('#hostcardSearch').value.toLocaleLowerCase('de').trim();
      return cards.filter(c => (kind === 'all' || c.type === kind)
        && (!search || `${c.name} ${c.useLabel || ''} ${c.text || ''}`.toLocaleLowerCase('de').includes(search)));
    }
    function selectCard(card) {
      if (!card) return;
      selectedId = card.id;
      showBack = false;
      updateDetails();
      for (const el of dialog.querySelectorAll('.hostcard-thumb')) {
        const active = el.dataset.cardId === selectedId;
        el.classList.toggle('is-selected', active);
        el.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }
    function updateDetails() {
      const card = cards.find(c => c.id === selectedId);
      if (!card) return;
      const big = $('#hostcardBigImage');
      big.src = showBack ? backUrl(card) : safeImage(card.image);
      big.alt = (showBack ? 'Rückseite: ' : 'Vorderseite: ') + card.name;
      $('#hostcardKind').textContent = titleType(card.type) + (card.previewOnly ? ' · nur Bildvorschau' : '');
      $('#hostcardName').textContent = card.name;
      $('#hostcardStats').replaceChildren();
      if (card.type === 'normal') {
        [['🏋️','Stärke','strength'],['⚡','Schnelligkeit','speed'],['⭐','Magie','magic'],['🔋','Energie','energy']].forEach(([icon,label,key]) => {
          const stat = document.createElement('span');
          stat.className = 'hostcard-stat';
          stat.textContent = `${icon} ${label}: ${card[key]}`;
          $('#hostcardStats').appendChild(stat);
        });
      }
      $('#hostcardEffect').textContent = card.previewOnly ? 'Dieses Kartenbild ist bereits hochgeladen und erscheint automatisch hier. Um die Karte im Spiel ziehen zu können, müssen Name und Werte noch in cards.js eingetragen werden.' : card.type === 'special' ? `${card.useIcon || '✨'} ${card.useLabel || 'Spezialeffekt'}: ${card.text || ''}`
        : card.type === 'artifact' ? 'Sammelartefakt – eines von drei Artefakten für das Siegziel.' : 'Normale Kampfkarte';
      $('#hostcardFlip').textContent = showBack ? '↺ Vorderseite ansehen' : '↺ Rückseite ansehen';
      const current = visible.findIndex(c => c.id === selectedId);
      $('#hostcardPrev').disabled = current < 1;
      $('#hostcardNext').disabled = current < 0 || current >= visible.length - 1;
    }
    function renderGrid() {
      visible = getMatches();
      $('#hostcardCount').textContent = `${visible.length} / ${cards.length} Karten`;
      const grid = $('#hostcardGrid');
      grid.replaceChildren();
      if (!visible.length) {
        const empty = document.createElement('p');
        empty.className = 'hostcard-empty';
        empty.textContent = loaded ? 'Keine passenden Karten gefunden.' : 'Kartenliste wird geladen …';
        grid.appendChild(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const card of visible) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hostcard-thumb';
        btn.dataset.cardId = card.id;
        btn.setAttribute('aria-label', `${card.name} ansehen${card.previewOnly ? ' (nur Vorschau)' : ''}`);
        const img = makeImg(card, false);
        const label = document.createElement('span');
        label.textContent = card.name + (card.previewOnly ? ' · Vorschau' : '');
        btn.append(img, label);
        btn.addEventListener('click', () => selectCard(card));
        fragment.appendChild(btn);
      }
      grid.appendChild(fragment);
      selectCard(visible.find(c => c.id === selectedId) || visible[0]);
    }
    function requestGallery() {
      if (!isHostInLobby()) return;
      if (!dialog.open) dialog.showModal();
      loaded = false;
      $('#hostcardCount').textContent = 'Aktualisiere Karten aus dem Spiel …';
      socket.emit('hostCardGalleryRequest');
    }
    openBtn.addEventListener('click', requestGallery);
    $('#hostcardClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', event => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (event.key === 'ArrowLeft') { $('#hostcardPrev').click(); event.preventDefault(); }
      else if (event.key === 'ArrowRight') { $('#hostcardNext').click(); event.preventDefault(); }
    });
    dialog.querySelectorAll('.hostcard-filter').forEach(btn => btn.addEventListener('click', () => {
      kind = btn.dataset.kind;
      dialog.querySelectorAll('.hostcard-filter').forEach(b => b.classList.toggle('is-active', b === btn));
      renderGrid();
    }));
    $('#hostcardSearch').addEventListener('input', renderGrid);
    $('#hostcardFlip').addEventListener('click', () => { showBack = !showBack; updateDetails(); });
    $('#hostcardPrev').addEventListener('click', () => { const n = visible.findIndex(c => c.id === selectedId); if (n > 0) selectCard(visible[n - 1]); });
    $('#hostcardNext').addEventListener('click', () => { const n = visible.findIndex(c => c.id === selectedId); if (n >= 0 && n < visible.length - 1) selectCard(visible[n + 1]); });
    socket.on('hostCardGalleryData', payload => {
      if (!isHostInLobby()) return;
      cards = Array.isArray(payload?.cards) ? payload.cards.filter(c => c && ['normal', 'special', 'artifact'].includes(c.type) && c.id && c.name).slice(0, 1000) : [];
      loaded = true;
      renderGrid();
    });
    socket.on('roomState', () => setTimeout(syncHost, 0));
    socket.on('roomLeft', () => setTimeout(syncHost, 0));
    socket.on('disconnect', () => { if (dialog.open) dialog.close(); openBtn.hidden = true; openBtn.style.display = 'none'; cards = []; loaded = false; });
    syncHost();
  };
})();
