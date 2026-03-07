// ── RESOURCE MONITOR ────────────────────────────────────────────

// ── Global resource tracking ─────────────────────────────────────
window.RESMON = (() => {
  const TOTAL_RAM    = 256;   // MB, fake total
  const APP_COSTS    = {      // MB per open window
    explorer:    8,
    notepad:     4,
    vscode:      22,
    terminal:    6,
    calculator:  3,
    clock:       2,
    settings:    5,
    img_viewer:  14,
    vid_player:  30,
    aud_player:  10,
    social:      20,
    resmon:      4,
  };
  const DEFAULT_APP  = 6;

  let socialUsage = 0;   // set externally by social.js
  let callbacks   = [];  // subscribers that want live updates

  function getOpenWindows() {
    const wins = document.querySelectorAll('.window');
    const result = [];
    wins.forEach(w => {
      const id    = w.id.replace('win_', '');
      const title = w.querySelector('.win-title')?.textContent || id;
      const appKey = Object.keys(APP_COSTS).find(k => id.startsWith(k)) || id;
      result.push({ id, title: title.trim(), mb: APP_COSTS[appKey] || DEFAULT_APP });
    });
    return result;
  }

  function getStorageInfo() {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        used += (localStorage.getItem(key) || '').length * 2; // UTF-16: 2 bytes/char
      }
      // Browser localStorage quota is typically 5-10 MB
      const quota = 5 * 1024 * 1024; // 5 MB estimate
      return { used, quota, pct: Math.min(100, (used / quota) * 100) };
    } catch(e) {
      return { used: 0, quota: 5 * 1024 * 1024, pct: 0 };
    }
  }

  function getRAMInfo() {
    const wins   = getOpenWindows();
    const winMB  = wins.reduce((s, w) => s + w.mb, 0);
    const totalUsed = winMB + socialUsage + 12; // 12 MB for OS baseline
    return {
      total: TOTAL_RAM,
      used:  Math.min(TOTAL_RAM, totalUsed),
      pct:   Math.min(100, (totalUsed / TOTAL_RAM) * 100),
      breakdown: [
        { label: 'OS Baseline', mb: 12, color: '#5b8af5' },
        ...wins.map(w => ({ label: w.title.slice(0,20), mb: w.mb, color: '#9b59f5' })),
        ...(socialUsage > 0 ? [{ label: 'Social Network', mb: socialUsage, color: '#28c840' }] : []),
      ],
    };
  }

  function formatBytes(b) {
    if (b < 1024)       return b + ' B';
    if (b < 1048576)    return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }

  return {
    setSocialUsage(mb) { socialUsage = mb; callbacks.forEach(cb => cb()); },
    getStorageInfo,
    getRAMInfo,
    getOpenWindows,
    formatBytes,
    subscribe(fn)   { callbacks.push(fn); },
    unsubscribe(fn) { callbacks = callbacks.filter(c => c !== fn); },
  };
})();

// ── App builder ───────────────────────────────────────────────────
function buildResmon(opts) {
  const content = `
<div class="rm-wrap">

  <!-- Header tabs -->
  <div class="rm-tabs">
    <div class="rm-tab active" data-panel="rm-ram">RAM</div>
    <div class="rm-tab" data-panel="rm-storage">Storage</div>
    <div class="rm-tab" data-panel="rm-processes">Processes</div>
  </div>

  <!-- RAM Panel -->
  <div class="rm-panel" id="rm-ram">
    <div class="rm-gauge-section">
      <div class="rm-gauge-label">
        <span>System RAM</span>
        <span id="rm-ram-used-txt">…</span>
      </div>
      <div class="rm-gauge-track">
        <div class="rm-gauge-fill rm-ram-fill" id="rm-ram-fill"></div>
      </div>
      <div class="rm-gauge-sub" id="rm-ram-sub">Calculating…</div>
    </div>

    <!-- Breakdown chart -->
    <div class="rm-breakdown" id="rm-breakdown"></div>

    <!-- RAM bars per process -->
    <div class="rm-proc-list" id="rm-proc-list"></div>
  </div>

  <!-- Storage Panel -->
  <div class="rm-panel" id="rm-storage" style="display:none">
    <div class="rm-gauge-section">
      <div class="rm-gauge-label">
        <span>LocalStorage</span>
        <span id="rm-stor-used-txt">…</span>
      </div>
      <div class="rm-gauge-track">
        <div class="rm-gauge-fill rm-stor-fill" id="rm-stor-fill"></div>
      </div>
      <div class="rm-gauge-sub" id="rm-stor-sub">Measuring…</div>
    </div>

    <!-- Storage breakdown by key -->
    <div class="rm-stor-list" id="rm-stor-list"></div>

    <button class="rm-clean-btn" id="rm-clean-btn">
      Clean Temp Data
    </button>
  </div>

  <!-- Processes Panel -->
  <div class="rm-panel" id="rm-processes" style="display:none">
    <div class="rm-proc-table">
      <div class="rm-proc-row rm-proc-head">
        <span>Process</span>
        <span>RAM</span>
        <span>Status</span>
      </div>
      <div id="rm-proc-rows"></div>
    </div>
  </div>

</div>`;

  function onMount(win) {
    let interval;
    let activePanel = 'rm-ram';

    // Tab switching
    win.querySelectorAll('.rm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        win.querySelectorAll('.rm-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activePanel = tab.dataset.panel;
        win.querySelectorAll('.rm-panel').forEach(p => {
          p.style.display = p.id === activePanel ? 'block' : 'none';
        });
        update();
      });
    });

    function fmtMB(mb) { return mb.toFixed(1) + ' MB'; }

    function updateRAM() {
      const info = window.RESMON.getRAMInfo();
      const pct  = info.pct.toFixed(1);

      const fill = win.querySelector('#rm-ram-fill');
      const txt  = win.querySelector('#rm-ram-used-txt');
      const sub  = win.querySelector('#rm-ram-sub');
      if (fill) {
        fill.style.width = pct + '%';
        fill.style.background = info.pct > 80 ? '#ff5f57' : info.pct > 60 ? '#ffbd2e' : 'var(--rm-accent)';
      }
      if (txt)  txt.textContent = fmtMB(info.used) + ' / ' + fmtMB(info.total);
      if (sub)  sub.textContent = `${pct}% used — ${fmtMB(info.total - info.used)} free`;

      // Breakdown mini chart
      const bkEl = win.querySelector('#rm-breakdown');
      if (bkEl) {
        bkEl.innerHTML = '';
        const total = info.breakdown.reduce((s, i) => s + i.mb, 0) || 1;
        info.breakdown.forEach(item => {
          const seg = document.createElement('div');
          seg.className = 'rm-bk-seg';
          seg.style.width = Math.max(2, (item.mb / info.total) * 100) + '%';
          seg.style.background = item.color;
          seg.title = `${item.label}: ${fmtMB(item.mb)}`;
          bkEl.appendChild(seg);
        });
      }

      // Per-process RAM bars
      const procList = win.querySelector('#rm-proc-list');
      if (procList) {
        procList.innerHTML = '';
        info.breakdown.forEach(item => {
          const row = document.createElement('div');
          row.className = 'rm-proc-row-item';
          const pct2 = (item.mb / info.total * 100).toFixed(1);
          row.innerHTML = `
            <div class="rm-proc-name">${item.label}</div>
            <div class="rm-proc-bar-wrap">
              <div class="rm-proc-bar-fill" style="width:${pct2}%;background:${item.color}"></div>
            </div>
            <div class="rm-proc-mb">${fmtMB(item.mb)}</div>
          `;
          procList.appendChild(row);
        });
      }
    }

    function updateStorage() {
      const info = window.RESMON.getStorageInfo();
      const pct  = info.pct.toFixed(1);
      const fill = win.querySelector('#rm-stor-fill');
      const txt  = win.querySelector('#rm-stor-used-txt');
      const sub  = win.querySelector('#rm-stor-sub');
      if (fill) {
        fill.style.width = pct + '%';
        fill.style.background = info.pct > 80 ? '#ff5f57' : info.pct > 60 ? '#ffbd2e' : '#28c840';
      }
      if (txt) txt.textContent = window.RESMON.formatBytes(info.used) + ' / ' + window.RESMON.formatBytes(info.quota);
      if (sub) sub.textContent = `${pct}% of estimated 5 MB quota used`;

      // List localStorage keys
      const storList = win.querySelector('#rm-stor-list');
      if (storList) {
        storList.innerHTML = '';
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const val = localStorage.getItem(key) || '';
          const bytes = val.length * 2;
          entries.push({ key, bytes });
        }
        entries.sort((a, b) => b.bytes - a.bytes);
        entries.forEach(e => {
          const row = document.createElement('div');
          row.className = 'rm-stor-row';
          const kShort = e.key.length > 28 ? e.key.slice(0, 28) + '…' : e.key;
          const barPct = Math.min(100, (e.bytes / info.quota) * 100).toFixed(2);
          row.innerHTML = `
            <span class="rm-stor-key" title="${e.key}">${kShort}</span>
            <div class="rm-stor-bar-wrap">
              <div class="rm-stor-bar-fill" style="width:${barPct}%"></div>
            </div>
            <span class="rm-stor-size">${window.RESMON.formatBytes(e.bytes)}</span>
          `;
          storList.appendChild(row);
        });
        if (!entries.length) storList.innerHTML = '<div class="rm-empty">LocalStorage is empty</div>';
      }
    }

    function updateProcesses() {
      const wins = window.RESMON.getOpenWindows();
      const rowsEl = win.querySelector('#rm-proc-rows');
      if (!rowsEl) return;
      rowsEl.innerHTML = '';
      wins.forEach(w => {
        const row = document.createElement('div');
        row.className = 'rm-proc-row';
        row.innerHTML = `
          <span>${w.title.slice(0, 22)}</span>
          <span>${w.mb} MB</span>
          <span class="rm-proc-running">Running</span>
        `;
        rowsEl.appendChild(row);
      });
      if (!wins.length) rowsEl.innerHTML = '<div class="rm-empty">No processes</div>';
    }

    function update() {
      if (activePanel === 'rm-ram')       updateRAM();
      else if (activePanel === 'rm-storage') updateStorage();
      else if (activePanel === 'rm-processes') { updateRAM(); updateProcesses(); }
    }

    // Refresh every 1.5 seconds
    interval = setInterval(update, 1500);
    update();

    // Subscribe to social usage changes
    window.RESMON.subscribe(update);

    // Clean storage button
    win.querySelector('#rm-clean-btn')?.addEventListener('click', () => {
      const keysToKeep = ['huebit-os-v2', 'huebit-social-posts-v1', 'huebit-social-profile-v1', 'huebit-social-peerid-v1'];
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      let removed = 0;
      keys.forEach(k => {
        if (!keysToKeep.includes(k)) { localStorage.removeItem(k); removed++; }
      });
      toast('', 'Resource Monitor', `Cleaned ${removed} temp entries`);
      update();
    });

    // Clean up on window close
    const observer = new MutationObserver(() => {
      if (!document.contains(win)) {
        clearInterval(interval);
        window.RESMON.unsubscribe(update);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return { content, onMount };
}
