// ── SOCIAL ─── P2P Social Network (PeerJS / WebRTC) ──────────────

// ── Global Social State ──────────────────────────────────────────
const SOCIAL = (() => {
  const LS_POSTS   = 'huebit-social-posts-v1';
  const LS_PROFILE = 'huebit-social-profile-v1';
  const LS_PEERID  = 'huebit-social-peerid-v1';

  const FAKE_RAM_PER_CONN = 12;   // MB per active P2P connection
  const FAKE_RAM_PER_POST = 0.5;  // MB per post loaded in memory
  const MAX_POSTS_LOADED  = 20;   // posts kept in JS memory at once
  const POSTS_PER_PAGE    = 5;    // posts revealed per lazy-load tick
  const MAX_CONNECTIONS   = 20;   // hard cap (fake RAM limit: 240MB)

  let peer = null;
  let connections = new Map();  // connId -> DataConnection
  let loadedPosts = [];         // posts currently rendered (up to MAX_POSTS_LOADED)
  let renderedCount = 0;        // how many posts are visible in the feed
  let profile = { name: '', color: '#5b8af5', emoji: '🌐' };
  let myPeerId = null;
  let feedEl = null, feedCountEl = null, connListEl = null;
  let ramBarEl = null, ramTextEl = null;

  /* ── Persistence helpers ──────────────────────────────────────── */
  function loadStoredPosts() {
    try { return JSON.parse(localStorage.getItem(LS_POSTS) || '[]'); }
    catch(e) { return []; }
  }
  function savePosts(posts) {
    try { localStorage.setItem(LS_POSTS, JSON.stringify(posts)); } catch(e) {}
  }
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(LS_PROFILE) || 'null'); } catch(e) { return null; }
  }
  function saveProfile(p) {
    try { localStorage.setItem(LS_PROFILE, JSON.stringify(p)); } catch(e) {}
  }
  function loadStoredPeerId() {
    return localStorage.getItem(LS_PEERID) || null;
  }
  function savePeerId(id) {
    try { localStorage.setItem(LS_PEERID, id); } catch(e) {}
  }

  /* ── Fake-RAM update ───────────────────────────────────────────── */
  function updateFakeRam() {
    const connMB  = connections.size * FAKE_RAM_PER_CONN;
    const postMB  = loadedPosts.length * FAKE_RAM_PER_POST;
    if (window.RESMON) window.RESMON.setSocialUsage(connMB + postMB);
    // update mini-bar in social window
    if (ramBarEl && ramTextEl) {
      const total = MAX_CONNECTIONS * FAKE_RAM_PER_CONN;
      const used  = connMB + postMB;
      const pct   = Math.min(100, (used / total) * 100);
      const pctStr = pct.toFixed(1);
      ramBarEl.style.width = pctStr + '%';
      ramBarEl.style.background = pct > 80 ? '#ff5f5f' : pct > 60 ? '#ffbd2e' : '#5b8af5';
      ramTextEl.textContent = `Net RAM: ${used.toFixed(1)} MB / ${total} MB (${connections.size} conn)`;
    }
  }

  /* ── Post management ───────────────────────────────────────────── */
  function mergePost(post) {
    // Returns true if the post was NEW (not already stored)
    const stored = loadStoredPosts();
    if (stored.find(p => p.id === post.id)) return false;
    stored.unshift(post);
    // Keep max 500 posts in storage
    if (stored.length > 500) stored.splice(500);
    savePosts(stored);
    // Also add to loadedPosts in memory if under cap
    if (loadedPosts.length < MAX_POSTS_LOADED) {
      loadedPosts.unshift(post);
      updateFakeRam();
    }
    return true;
  }

  function makePost(content, imageUrl) {
    return {
      id:          crypto.randomUUID(),
      authorId:    myPeerId,
      authorName:  profile.name || 'Anonymous',
      authorColor: profile.color,
      authorEmoji: profile.emoji,
      content,
      imageUrl:    imageUrl || null,
      timestamp:   Date.now(),
      hops:        0,   // propagation count
    };
  }

  /* ── Rendering ────────────────────────────────────────────────── */
  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000)       return 'just now';
    if (diff < 3600000)     return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000)    return Math.floor(diff / 3600000) + 'h ago';
    return new Date(ts).toLocaleDateString();
  }

  function renderPostEl(post) {
    const el = document.createElement('div');
    el.className = 'soc-post';
    el.dataset.postId = post.id;
    const isMine = post.authorId === myPeerId;
    const img = post.imageUrl
      ? `<img src="${post.imageUrl}" class="soc-post-img" alt="" onerror="this.style.display='none'">`
      : '';
    const hopBadge = post.hops > 0
      ? `<span class="soc-hop-badge">${SI.shareIcon || '↗'} ${post.hops} hop${post.hops > 1 ? 's' : ''}</span>`
      : '';
    el.innerHTML = `
      <div class="soc-post-header">
        <div class="soc-avatar" style="background:${post.authorColor}">${post.authorEmoji || '🌐'}</div>
        <div class="soc-post-meta">
          <span class="soc-author${isMine ? ' is-mine' : ''}">${escHtml(post.authorName)}</span>
          ${hopBadge}
          <span class="soc-time">${timeAgo(post.timestamp)}</span>
        </div>
      </div>
      <div class="soc-post-content">${escHtml(post.content)}</div>
      ${img}
    `;
    return el;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderFeed() {
    if (!feedEl) return;
    const toShow = loadedPosts.slice(0, renderedCount);
    feedEl.innerHTML = '';
    if (toShow.length === 0) {
      feedEl.innerHTML = '<div class="soc-empty">No posts yet. Create one or connect to peers!</div>';
      return;
    }
    toShow.forEach(post => feedEl.appendChild(renderPostEl(post)));
    if (feedCountEl) {
      const total = loadStoredPosts().length;
      feedCountEl.textContent = `${toShow.length} shown · ${total} cached · ${loadedPosts.length} in memory`;
    }
  }

  function loadMorePosts() {
    const stored = loadStoredPosts();
    const nextBatch = stored.slice(loadedPosts.length, loadedPosts.length + POSTS_PER_PAGE);
    if (nextBatch.length === 0) return false;
    // Evict oldest posts from memory if over cap
    if (loadedPosts.length + nextBatch.length > MAX_POSTS_LOADED) {
      const evict = (loadedPosts.length + nextBatch.length) - MAX_POSTS_LOADED;
      loadedPosts.splice(loadedPosts.length - evict, evict);
    }
    loadedPosts.push(...nextBatch);
    renderedCount = Math.min(renderedCount + POSTS_PER_PAGE, loadedPosts.length);
    updateFakeRam();
    renderFeed();
    return true;
  }

  function initFeed(el, countEl, ramBar, ramTxt) {
    feedEl      = el;
    feedCountEl = countEl;
    ramBarEl    = ramBar;
    ramTextEl   = ramTxt;
    // Init loadedPosts from storage
    const stored = loadStoredPosts();
    loadedPosts  = stored.slice(0, MAX_POSTS_LOADED);
    renderedCount = Math.min(POSTS_PER_PAGE, loadedPosts.length);
    renderFeed();
    updateFakeRam();
  }

  function initConnList(el) {
    connListEl = el;
    renderConnList();
  }

  function renderConnList() {
    if (!connListEl) return;
    if (connections.size === 0) {
      connListEl.innerHTML = '<div class="soc-no-conn">No connections</div>';
      return;
    }
    connListEl.innerHTML = '';
    connections.forEach((conn, id) => {
      const el = document.createElement('div');
      el.className = 'soc-conn-item';
      el.innerHTML = `
        <span class="soc-conn-dot"></span>
        <span class="soc-conn-id">${id.slice(0,8)}…</span>
        <button class="soc-conn-disc" data-id="${id}">✕</button>
      `;
      el.querySelector('.soc-conn-disc').onclick = () => disconnect(id);
      connListEl.appendChild(el);
    });
  }

  /* ── Peer.js / WebRTC ─────────────────────────────────────────── */
  function broadcast(data, excludeId = null) {
    connections.forEach((conn, id) => {
      if (id !== excludeId && conn.open) {
        try { conn.send(data); } catch(e) {}
      }
    });
  }

  function handleData(conn, data) {
    if (!data || !data.type) return;
    switch (data.type) {
      case 'post': {
        const post = { ...data.post, hops: (data.post.hops || 0) + 1 };
        const isNew = mergePost(post);
        if (isNew) {
          // Propagate to other peers (limit hops to avoid infinite loops)
          if (post.hops < 8) broadcast({ type: 'post', post }, conn.peer);
          renderedCount = Math.min(renderedCount + 1, loadedPosts.length);
          renderFeed();
        }
        break;
      }
      case 'sync_req': {
        // Peer asked for our recent posts
        const myPosts = loadStoredPosts().slice(0, 50);
        conn.send({ type: 'sync_res', posts: myPosts });
        break;
      }
      case 'sync_res': {
        // Receive posts from a peer
        const posts = data.posts || [];
        let newCount = 0;
        posts.forEach(p => { if (mergePost(p)) newCount++; });
        if (newCount > 0) renderFeed();
        break;
      }
    }
  }

  function setupConn(conn) {
    conn.on('open', () => {
      connections.set(conn.peer, conn);
      renderConnList();
      updateFakeRam();
      // Exchange posts
      conn.send({ type: 'sync_req' });
      toast('', 'Social', `Connected to ${conn.peer.slice(0,8)}…`);
    });
    conn.on('data', data => handleData(conn, data));
    conn.on('close', () => {
      connections.delete(conn.peer);
      renderConnList();
      updateFakeRam();
      toast('', 'Social', `Peer ${conn.peer.slice(0,8)} disconnected`);
    });
    conn.on('error', () => {
      connections.delete(conn.peer);
      renderConnList();
      updateFakeRam();
    });
  }

  function connectToPeer(peerId) {
    if (!peer || !peerId) return;
    if (connections.has(peerId)) { toast('','Social','Already connected to this peer'); return; }
    if (connections.size >= MAX_CONNECTIONS) { toast('','Social','Max connections reached (RAM limit)'); return; }
    const conn = peer.connect(peerId, { reliable: true });
    setupConn(conn);
  }

  function disconnect(peerId) {
    const conn = connections.get(peerId);
    if (conn) { try { conn.close(); } catch(e) {} }
    connections.delete(peerId);
    renderConnList();
    updateFakeRam();
  }

  function initPeer(statusEl, peerIdEl) {
    // Check if PeerJS is loaded
    if (typeof Peer === 'undefined') {
      if (statusEl) statusEl.textContent = 'PeerJS not loaded. Check network.';
      return;
    }

    const storedId = loadStoredPeerId();
    peer = storedId ? new Peer(storedId) : new Peer();

    peer.on('open', id => {
      myPeerId = id;
      savePeerId(id);
      if (peerIdEl) peerIdEl.textContent = id;
      if (statusEl) { statusEl.textContent = 'Online'; statusEl.style.color = '#28c840'; }
    });
    peer.on('connection', conn => {
      if (connections.size >= MAX_CONNECTIONS) { conn.close(); return; }
      setupConn(conn);
    });
    peer.on('error', err => {
      if (statusEl) { statusEl.textContent = 'Error: ' + err.type; statusEl.style.color = '#ff5f57'; }
      // If ID already taken (previous session), generate new ID
      if (err.type === 'unavailable-id') {
        peer = new Peer();
        peer.on('open', id => {
          myPeerId = id; savePeerId(id);
          if (peerIdEl) peerIdEl.textContent = id;
          if (statusEl) { statusEl.textContent = 'Online'; statusEl.style.color = '#28c840'; }
        });
      }
    });
    peer.on('disconnected', () => {
      if (statusEl) { statusEl.textContent = 'Disconnected'; statusEl.style.color = '#ffbd2e'; }
    });
  }

  function publishPost(content, imageUrl) {
    if (!content.trim()) return false;
    const post = makePost(content.trim(), imageUrl);
    mergePost(post);
    broadcast({ type: 'post', post });
    renderedCount = Math.min(renderedCount + 1, loadedPosts.length);
    renderFeed();
    return true;
  }

  return {
    init(opts) {
      profile = loadProfile() || { name: OS.username || 'User', color: OS.accent || '#5b8af5', emoji: '🌐' };
      return this;
    },
    initPeer, initFeed, initConnList,
    connectToPeer, disconnect, publishPost, loadMorePosts,
    getMyId() { return myPeerId; },
    getProfile() { return profile; },
    saveProfile(p) { profile = p; saveProfile(p); },
    getConnCount() { return connections.size; },
  };
})();

// ── App builder ───────────────────────────────────────────────────
function buildSocial(opts) {
  SOCIAL.init();
  const prof = SOCIAL.getProfile();

  const content = `
<div class="soc-wrap">

  <!-- LEFT: Feed -->
  <div class="soc-feed-col">
    <!-- Compose -->
    <div class="soc-compose">
      <div class="soc-compose-avatar" id="soc-my-av" style="background:${prof.color}">${prof.emoji}</div>
      <div class="soc-compose-inner">
        <textarea class="soc-compose-ta" id="soc-compose-ta" placeholder="What's happening on the network?…" maxlength="500" rows="3"></textarea>
        <div class="soc-compose-toolbar">
          <input class="soc-img-url" id="soc-img-url" placeholder="Image URL (optional)" />
          <div class="soc-char-count" id="soc-char-count">0/500</div>
          <button class="soc-post-btn" id="soc-post-btn">Post</button>
        </div>
      </div>
    </div>

    <!-- RAM bar -->
    <div class="soc-ram-bar-wrap">
      <div class="soc-ram-track"><div class="soc-ram-fill" id="soc-ram-fill" style="width:0%"></div></div>
      <span class="soc-ram-txt" id="soc-ram-txt">Net RAM: 0 MB</span>
    </div>

    <!-- Feed header -->
    <div class="soc-feed-hd">
      <span>Feed</span>
      <span class="soc-feed-count" id="soc-feed-count"></span>
    </div>

    <!-- Posts -->
    <div class="soc-posts" id="soc-posts"></div>
    <div class="soc-load-more" id="soc-load-more">
      <button class="soc-load-btn" id="soc-load-btn">Load more posts</button>
    </div>
  </div>

  <!-- RIGHT: Network panel -->
  <div class="soc-side-col">

    <!-- Identity -->
    <div class="soc-panel">
      <div class="soc-panel-hd">My Identity</div>
      <div class="soc-identity">
        <div class="soc-id-av" id="soc-id-av" style="background:${prof.color}">${prof.emoji}</div>
        <div class="soc-id-info">
          <input class="soc-name-inp" id="soc-name-inp" value="${escSocHtml(prof.name)}" placeholder="Display name" maxlength="32">
          <div class="soc-peer-id-row">
            <span class="soc-peer-label">Peer ID:</span>
            <span class="soc-peer-id" id="soc-peer-id">Connecting…</span>
            <button class="soc-copy-btn" id="soc-copy-id" title="Copy ID">⎘</button>
          </div>
          <div class="soc-status-row">
            <span class="soc-status-dot"></span>
            <span id="soc-net-status" style="color:#888;font-size:11px">Initializing…</span>
          </div>
        </div>
      </div>
      <!-- Color swatches -->
      <div class="soc-color-row" id="soc-colors">
        ${['#5b8af5','#e91e8c','#00c896','#ff6b2b','#f7c535','#a855f7'].map(c=>
          `<div class="soc-clr-sw${c===prof.color?' active':''}" data-c="${c}" style="background:${c}"></div>`
        ).join('')}
      </div>
      <!-- Emoji swatches -->
      <div class="soc-emoji-row" id="soc-emojis">
        ${['🌐','🚀','⚡','🎯','🦋','🌙','🔥','🎮','🎵','🌸'].map(e=>
          `<div class="soc-emoji-sw${e===prof.emoji?' active':''}" data-e="${e}">${e}</div>`
        ).join('')}
      </div>
    </div>

    <!-- Connect to peer -->
    <div class="soc-panel">
      <div class="soc-panel-hd">Connect to Peer</div>
      <div class="soc-connect-row">
        <input class="soc-peer-inp" id="soc-peer-inp" placeholder="Paste peer ID…" autocomplete="off">
        <button class="soc-connect-btn" id="soc-connect-btn">Connect</button>
      </div>
    </div>

    <!-- Active connections -->
    <div class="soc-panel">
      <div class="soc-panel-hd">Connections <span id="soc-conn-badge" class="soc-badge">0</span></div>
      <div class="soc-conn-list" id="soc-conn-list"></div>
    </div>

    <!-- Instructions -->
    <div class="soc-panel soc-help-panel">
      <div class="soc-panel-hd">How it works</div>
      <div class="soc-help-text">
        Share your <strong>Peer ID</strong> with others. They paste it in "Connect to Peer" — or vice versa.
        Posts travel peer-to-peer: if A connected to B, and B disconnects, A still has B's posts.
        Posts are cached locally and survive offline.
      </div>
    </div>
  </div>

</div>`;

  function escSocHtml(s) {
    return String(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function onMount(win) {
    const feedEl     = win.querySelector('#soc-posts');
    const countEl    = win.querySelector('#soc-feed-count');
    const ramFill    = win.querySelector('#soc-ram-fill');
    const ramTxt     = win.querySelector('#soc-ram-txt');
    const statusEl   = win.querySelector('#soc-net-status');
    const peerIdEl   = win.querySelector('#soc-peer-id');
    const connListEl = win.querySelector('#soc-conn-list');
    const connBadge  = win.querySelector('#soc-conn-badge');
    const peerInp    = win.querySelector('#soc-peer-inp');
    const connBtn    = win.querySelector('#soc-connect-btn');
    const copyBtn    = win.querySelector('#soc-copy-id');
    const composeTA  = win.querySelector('#soc-compose-ta');
    const imgUrlInp  = win.querySelector('#soc-img-url');
    const postBtn    = win.querySelector('#soc-post-btn');
    const charCount  = win.querySelector('#soc-char-count');
    const nameInp    = win.querySelector('#soc-name-inp');
    const loadBtn    = win.querySelector('#soc-load-btn');

    SOCIAL.initFeed(feedEl, countEl, ramFill, ramTxt);
    SOCIAL.initConnList(connListEl);
    SOCIAL.initPeer(statusEl, peerIdEl);

    // Update connection badge
    const origRenderConn = SOCIAL.initConnList;
    const updateBadge = () => {
      if (connBadge) connBadge.textContent = SOCIAL.getConnCount();
    };
    // Poll badge every 2s
    const badgeIv = setInterval(updateBadge, 2000);
    win.addEventListener('remove', () => clearInterval(badgeIv));

    // Compose
    composeTA.addEventListener('input', () => {
      charCount.textContent = composeTA.value.length + '/500';
    });

    postBtn.addEventListener('click', () => {
      const ok = SOCIAL.publishPost(composeTA.value, imgUrlInp.value.trim() || null);
      if (ok) { composeTA.value = ''; imgUrlInp.value = ''; charCount.textContent = '0/500'; }
      else toast('', 'Social', 'Post cannot be empty');
    });

    // Connect
    connBtn.addEventListener('click', () => {
      const id = peerInp.value.trim();
      if (!id) { toast('', 'Social', 'Enter a peer ID'); return; }
      SOCIAL.connectToPeer(id);
      peerInp.value = '';
    });
    peerInp.addEventListener('keydown', e => { if (e.key === 'Enter') connBtn.click(); });

    // Copy peer ID
    copyBtn.addEventListener('click', () => {
      const id = peerIdEl.textContent;
      if (id && id !== 'Connecting…') {
        navigator.clipboard.writeText(id).catch(() => {});
        toast('', 'Social', 'Peer ID copied!');
      }
    });

    // Load more posts
    loadBtn.addEventListener('click', () => {
      const more = SOCIAL.loadMorePosts();
      if (!more) { loadBtn.textContent = 'No more posts'; loadBtn.disabled = true; }
    });

    // Profile: name
    nameInp.addEventListener('change', () => {
      const p = SOCIAL.getProfile();
      p.name = nameInp.value.trim() || 'Anonymous';
      SOCIAL.saveProfile(p);
    });

    // Profile: color
    win.querySelectorAll('.soc-clr-sw').forEach(sw => {
      sw.addEventListener('click', () => {
        win.querySelectorAll('.soc-clr-sw').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        const p = SOCIAL.getProfile();
        p.color = sw.dataset.c;
        SOCIAL.saveProfile(p);
        win.querySelector('#soc-my-av').style.background = p.color;
        win.querySelector('#soc-id-av').style.background = p.color;
      });
    });

    // Profile: emoji
    win.querySelectorAll('.soc-emoji-sw').forEach(sw => {
      sw.addEventListener('click', () => {
        win.querySelectorAll('.soc-emoji-sw').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        const p = SOCIAL.getProfile();
        p.emoji = sw.dataset.e;
        SOCIAL.saveProfile(p);
        win.querySelector('#soc-my-av').textContent = p.emoji;
        win.querySelector('#soc-id-av').textContent = p.emoji;
      });
    });

    // Scroll-based infinite load
    feedEl.addEventListener('scroll', () => {
      if (feedEl.scrollTop + feedEl.clientHeight >= feedEl.scrollHeight - 60) {
        SOCIAL.loadMorePosts();
      }
    });
  }

  return { content, onMount };
}

function escSocHtml(s) {
  return String(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
