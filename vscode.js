// ── SIMPLE PYTHON INTERPRETER ───────────────────────────────────
function simplePythonRun(code){
  let output='';
  const vars={};
  const lines=code.split('\n');
  const printVal=(v)=>{
    if(typeof v==='string')return v;
    if(Array.isArray(v))return '['+v.map(printVal).join(', ')+']';
    return String(v);
  };
  for(let i=0;i<lines.length;i++){
    const raw=lines[i];
    const line=raw.trimEnd();
    if(!line||line.trimStart().startsWith('#'))continue;
    const trimmed=line.trimStart();
    // print(...)
    if(trimmed.startsWith('print(')){
      const inner=trimmed.slice(6,-1).trim();
      // Handle f-strings simply
      let val=inner;
      if((inner.startsWith('"')&&inner.endsWith('"'))||(inner.startsWith("'")&&inner.endsWith("'")))
        val=inner.slice(1,-1).replace(/\{(\w+)\}/g,(_,k)=>vars[k]!==undefined?printVal(vars[k]):k);
      else if(vars[inner]!==undefined) val=printVal(vars[inner]);
      else try{val=printVal(eval(inner.replace(/\b(\w+)\b/g,(_,k)=>vars[k]!==undefined?JSON.stringify(vars[k]):k)));}catch(e){val=inner;}
      output+=val+'\n';
    }
    // variable assignment (simple)
    else if(/^\w+\s*=\s*.+/.test(trimmed)&&!trimmed.startsWith('if')&&!trimmed.startsWith('for')&&!trimmed.startsWith('while')){
      const eqIdx=trimmed.indexOf('=');
      const varName=trimmed.slice(0,eqIdx).trim();
      const rawVal=trimmed.slice(eqIdx+1).trim();
      if((rawVal.startsWith('"')&&rawVal.endsWith('"'))||(rawVal.startsWith("'")&&rawVal.endsWith("'")))
        vars[varName]=rawVal.slice(1,-1);
      else if(!isNaN(rawVal)) vars[varName]=Number(rawVal);
      else if(rawVal==='True') vars[varName]=true;
      else if(rawVal==='False') vars[varName]=false;
      else vars[varName]=rawVal;
    }
    else if(trimmed.startsWith('import ')){const mod=trimmed.split(' ')[1];output+=`# import ${mod} (simulated)\n`;}
    // skip unsupported
  }
  return output||'(no output)';
}

// ── VS CODE LIGHT EDITOR ──────────────────────────────────────────
function buildVSCode(opts){
  const initialFile = opts?.filename || 'untitled.txt';
  const initialContent = opts?.initial !== undefined ? opts.initial : '// This editor supports: Python, JS, HTML, and CSS\n';
  let savedFsPath = opts?.fsPath || null;
  let currentFileName = initialFile;

  const content = `<div class="vscode-wrap" style="position:relative;overflow:visible">
    <div class="vscode-menu" id="vsc-menubar">
      <div class="menu-item" data-menu="file">File</div>
      <div class="menu-item" data-menu="edit">Edit</div>
      <div class="menu-item" data-menu="view">View</div>
      <div class="menu-item" data-menu="run">Run</div>
      <div class="menu-item" data-menu="terminal">Terminal</div>
    </div>
    <div id="vsc-file-dd"   class="vsc-dd" style="display:none"><div data-a="new">New File</div><div data-a="open">Open File…</div><div data-a="save">Save &nbsp;<span style="opacity:.4">Ctrl+S</span></div><div data-a="saveas">Save As…</div><div data-a="export">Export / Download</div></div>
    <div id="vsc-edit-dd"   class="vsc-dd" style="display:none"><div data-a="copy">Copy</div><div data-a="paste">Paste</div><div data-a="selectall">Select All</div><div data-a="find">Find…</div></div>
    <div id="vsc-view-dd"   class="vsc-dd" style="display:none"><div data-a="sidebar">Toggle Sidebar</div><div data-a="toggleterm">Toggle Terminal</div></div>
    <div id="vsc-run-dd"    class="vsc-dd" style="display:none"><div data-a="runcode">${SI.playSmall}Run Code &nbsp;<span style="opacity:.4">F5</span></div></div>
    <div id="vsc-terminal-dd" class="vsc-dd" style="display:none"><div data-a="newterm">New Terminal</div><div data-a="clearterm">Clear Terminal</div></div>
    <div class="vscode-toolbar">
      <button class="tool-btn" id="vsc-runbtn">${SI.playSmall}Run</button>
      <button class="tool-btn" id="vsc-debugbtn" style="background:#5a4a00">${SI.bugIcon}Debug</button>
      <button class="tool-btn" id="vsc-termbtn" style="background:#1a3a1a">${SI.terminalIcon}Terminal</button>
      <span id="vsc-dirty" style="margin-left:8px;font-size:11px;color:#e2a045;display:none">● unsaved</span>
    </div>
    <div class="vscode-main" id="vsc-main">
      <div class="vscode-sidebar" id="vsc-sidebar">
        <div class="sidebar-tabs">
          <div class="tab active" data-panel="vsc-exp-panel">${SI.explorerTab}Explorer</div>
          <div class="tab" data-panel="vsc-open-panel">${SI.editorsTab}Open Editors</div>
        </div>
        <div class="sidebar-content" style="overflow-y:auto;flex:1">
          <div id="vsc-exp-panel"></div>
          <div id="vsc-open-panel" style="display:none"></div>
        </div>
      </div>
      <div class="vscode-editor" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0">
        <div class="editor-tabs">
          <div class="editor-tab active"><span id="vsc-tabname">${initialFile}</span><span id="vsc-closetab" class="close-tab" style="margin-left:8px;cursor:pointer">✕</span></div>
        </div>
        <textarea class="ed-ta" id="vsc-ta" spellcheck="false"></textarea>
      </div>
    </div>
    <div id="vsc-term" style="display:none;flex-direction:column;height:200px;min-height:200px;border-top:1px solid #3e3e42;background:#1e1e1e;flex-shrink:0">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 10px;background:#252526;border-bottom:1px solid #3e3e42">
        <span style="font-size:12px;color:#ccc">TERMINAL</span>
        <span id="vsc-termclose" style="cursor:pointer;font-size:14px;opacity:.6;padding:0 4px">✕</span>
      </div>
      <div id="vsc-termout" style="flex:1;padding:8px 12px;overflow-y:auto;font-family:var(--mono);font-size:12px;white-space:pre-wrap;word-break:break-all"></div>
      <div style="display:flex;align-items:center;padding:4px 10px;background:#252526;border-top:1px solid #3e3e42">
        <span style="color:#569cd6;font-size:12px;margin-right:6px;flex-shrink:0">$</span>
        <input id="vsc-terminp" autocomplete="off" spellcheck="false" placeholder="enter command (run, clear, help…)" style="flex:1;background:none;border:none;outline:none;color:#d4d4d4;font-family:var(--mono);font-size:12px">
      </div>
    </div>
    <div class="vscode-status">
      <span id="vsc-statusl">Ln 1, Col 1</span>
      <span id="vsc-statusr">UTF-8</span>
    </div>
  </div>`;

  function onMount(win){
    const ta       = win.querySelector('#vsc-ta');
    const tabname  = win.querySelector('#vsc-tabname');
    const dirty    = win.querySelector('#vsc-dirty');
    const sidebar  = win.querySelector('#vsc-sidebar');
    const expPanel = win.querySelector('#vsc-exp-panel');
    const openPanel= win.querySelector('#vsc-open-panel');
    const term     = win.querySelector('#vsc-term');
    const termOut  = win.querySelector('#vsc-termout');
    const termInp  = win.querySelector('#vsc-terminp');
    const statusL  = win.querySelector('#vsc-statusl');
    const statusR  = win.querySelector('#vsc-statusr');

    // Set initial content
    ta.value = initialContent;
    let origContent = initialContent;

    // ── status bar ──────────────────────────────────
    const updateStatus = () => {
      const before = ta.value.substr(0, ta.selectionStart);
      const lines = before.split('\n');
      statusL.textContent = `Ln ${lines.length}, Col ${lines[lines.length-1].length+1}`;
      const ext = currentFileName.split('.').pop().toLowerCase();
      const langMap = {js:'JavaScript', py:'Python', html:'HTML', css:'CSS', ts:'TypeScript', json:'JSON', md:'Markdown', txt:'Plain Text', csv:'CSV'};
      statusR.textContent = (langMap[ext]||ext.toUpperCase()) + ' | UTF-8';
      dirty.style.display = ta.value !== origContent ? 'inline' : 'none';
    };
    ta.addEventListener('input', updateStatus);
    ta.addEventListener('click', updateStatus);
    ta.addEventListener('keyup', updateStatus);
    updateStatus();

    // ── terminal helpers ────────────────────────────
    const tPrint = (text, color) => {
      const d = document.createElement('div');
      d.style.color = color || '#d4d4d4';
      d.textContent = text;
      termOut.appendChild(d);
      termOut.scrollTop = termOut.scrollHeight;
    };
    const showTerm = () => {
      term.style.display = 'flex';
      // Adjust main area
      win.querySelector('#vsc-main').style.flex = '1';
      termInp.focus();
    };
    const hideTerm = () => { term.style.display = 'none'; };
    const toggleTerm = () => term.style.display === 'flex' ? hideTerm() : showTerm();

    // ── run code ────────────────────────────────────
    const runCode = () => {
      showTerm();
      termOut.innerHTML = '';
      const code = ta.value;
      const ext = currentFileName.split('.').pop().toLowerCase();
      tPrint(`> Running: ${currentFileName}`, '#569cd6');
      tPrint('');

      if(ext === 'py'){
        try {
          const out = simplePythonRun(code);
          (out||'(no output)').split('\n').forEach(l => tPrint(l));
        } catch(e){ tPrint('Error: ' + e.message, '#f48771'); }
      }
      else if(ext === 'js'){
        const logs = [];
        const _log = console.log.bind(console);
        const _err = console.error.bind(console);
        console.log = (...a) => { logs.push({t:'log', v:a.map(String).join(' ')}); };
        console.error = (...a) => { logs.push({t:'err', v:a.map(String).join(' ')}); };
        try {
          const fn2 = new Function(code);
          const ret = fn2();
          if(ret !== undefined) logs.push({t:'log', v:'→ ' + String(ret)});
        } catch(e){ logs.push({t:'err', v:'Error: ' + e.message}); }
        finally { console.log = _log; console.error = _err; }
        logs.forEach(l => tPrint(l.v, l.t==='err'?'#f48771':'#d4d4d4'));
        if(!logs.length) tPrint('(no output)');
      }
      else if(ext === 'html'){
        const blob = new Blob([code], {type:'text/html'});
        const url  = URL.createObjectURL(blob);
        const uid  = 'html_prev_' + Date.now();
        WM.create({id:uid, title:'Preview: '+currentFileName, width:720, height:520,
          content:`<iframe src="${url}" style="width:100%;height:100%;border:none;background:#fff"></iframe>`,
          onMount:()=>{}, iconKey:'img_viewer'});
        tPrint('HTML preview opened in new window.', '#4ec9b0');
      }
      else if(ext === 'css'){
        tPrint('CSS file — no runnable output. Use inside an HTML file.', '#4ec9b0');
      }
      else {
        tPrint(`Run not supported for .${ext} files.`, '#f48771');
      }
      tPrint('');
      tPrint('─'.repeat(40), '#3e3e42');
    };

    // ── file ops ────────────────────────────────────
    const setFile = (name, content2, fspath) => {
      currentFileName = name;
      ta.value = content2;
      savedFsPath = fspath || null;
      origContent = content2;
      tabname.textContent = name;
      updateStatus();
      updateOpenPanel();
    };

    const doNew = () => setFile('untitled.txt', '', null);

    const doOpen = () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.onchange = e => {
        const f = e.target.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = ev => setFile(f.name, ev.target.result, null);
        r.readAsText(f);
      };
      inp.click();
    };

    const doSave = () => {
      if(savedFsPath){
        const parts = savedFsPath.replace(/^\/+/,'').split('/').filter(Boolean);
        const fname = parts.pop();
        const parent = fsGet('/'+parts.join('/'));
        if(parent?.children?.[fname]){
          parent.children[fname].content = ta.value;
          origContent = ta.value;
          dirty.style.display = 'none';
          toast('','Saved',`"${fname}" updated.`);
          return;
        }
      }
      doSaveAs();
    };

    const doSaveAs = () => {
      showSaveDialog(currentFileName, () => ta.value, (dir, name) => {
        savedFsPath = '/'+dir+'/'+name;
        currentFileName = name;
        origContent = ta.value;
        tabname.textContent = name;
        dirty.style.display = 'none';
        updateOpenPanel();
      });
    };

    const doExport = () => {
      const blob = new Blob([ta.value],{type:'text/plain'});
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=currentFileName;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast('','Exported',`"${currentFileName}" downloaded.`);
    };

    // ── open editors panel ──────────────────────────
    const updateOpenPanel = () => {
      openPanel.innerHTML = '';
      const d = document.createElement('div');
      d.style.cssText = 'padding:6px 10px;color:#ccc;font-size:12px;cursor:pointer';
      d.innerHTML = SI.fileGeneric + ' ' + currentFileName;
      openPanel.appendChild(d);
    };
    updateOpenPanel();

    // ── explorer panel ──────────────────────────────
    const buildTree = (path, container, depth) => {
      const node = fsGet(path);
      if(!node) return;
      const indent = depth * 14;
      if(node.type === 'dir'){
        const row = document.createElement('div');
        row.style.cssText = `padding:3px 8px 3px ${8+indent}px;cursor:pointer;color:#bbb;font-size:12px;user-select:none`;
        row.innerHTML = (path==='/'? SI.home+' HueBit FS' : SI.folder+' '+path.split('/').pop());
        const childWrap = document.createElement('div');
        let open = depth < 1;
        childWrap.style.display = open ? 'block' : 'none';
        row.onclick = () => { open=!open; childWrap.style.display=open?'block':'none'; row.style.color=open?'#fff':'#bbb'; };
        row.addEventListener('mouseenter',()=>row.style.background='#2d2d30');
        row.addEventListener('mouseleave',()=>row.style.background='');
        container.appendChild(row);
        container.appendChild(childWrap);
        if(node.children){
          Object.entries(node.children)
            .sort(([a,av],[b,bv])=>av.type!==bv.type?(av.type==='dir'?-1:1):a.localeCompare(b))
            .forEach(([name, item])=>{
              const cp = path==='/'?'/'+name:path+'/'+name;
              buildTree(cp, childWrap, depth+1);
            });
        }
      } else {
        const ext = path.split('.').pop().toLowerCase();
        const ico = {txt:SI.fileGeneric,md:SI.mdFile,js:SI.jsFile,py:SI.pyFile,html:SI.htmlFile,css:SI.cssFile,json:SI.jsonFile,csv:SI.csvFile}[ext]||SI.fileGeneric;
        const row = document.createElement('div');
        row.style.cssText = `padding:3px 8px 3px ${8+indent}px;cursor:pointer;color:#888;font-size:12px;user-select:none`;
        row.innerHTML = ico + ' ' + path.split('/').pop();
        row.addEventListener('mouseenter',()=>row.style.background='#2d2d30');
        row.addEventListener('mouseleave',()=>row.style.background='');
        row.onclick = () => {
          const item = fsGet(path);
          if(item?.content != null){
            setFile(path.split('/').pop(), item.content, path);
          } else if(item?.blobUrl){
            toast('','Info','Cannot open binary/media files in editor.');
          } else {
            toast('','Info','This file is empty.');
            setFile(path.split('/').pop(), '', path);
          }
        };
        container.appendChild(row);
      }
    };
    buildTree('/', expPanel, 0);

    // ── sidebar tab switching ───────────────────────
    win.querySelectorAll('.sidebar-tabs .tab').forEach(tab => {
      tab.onclick = () => {
        win.querySelectorAll('.sidebar-tabs .tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        expPanel.style.display  = tab.dataset.panel==='vsc-exp-panel'  ? 'block':'none';
        openPanel.style.display = tab.dataset.panel==='vsc-open-panel' ? 'block':'none';
      };
    });

    // ── toolbar buttons ─────────────────────────────
    win.querySelector('#vsc-runbtn').onclick   = runCode;
    win.querySelector('#vsc-debugbtn').onclick = () => toast('','Debug','Debugger not implemented yet.');
    win.querySelector('#vsc-termbtn').onclick  = toggleTerm;
    win.querySelector('#vsc-termclose').onclick= hideTerm;
    win.querySelector('#vsc-closetab').onclick = doNew;

    // ── terminal input ──────────────────────────────
    termInp.addEventListener('keydown', e => {
      if(e.key !== 'Enter') return;
      const cmd = termInp.value.trim(); termInp.value='';
      tPrint('$ '+cmd, '#569cd6');
      if(cmd==='run')        { runCode(); }
      else if(cmd==='clear') { termOut.innerHTML=''; }
      else if(cmd==='help')  { tPrint('Commands: run, clear, ls, pwd, help', '#4ec9b0'); }
      else if(cmd==='pwd')   { tPrint('/'); }
      else if(cmd==='ls')    { const n=fsGet('/');if(n?.children)Object.keys(n.children).forEach(k=>tPrint('  '+k)); }
      else { tPrint(`"${cmd}": not found. Type help.`, '#f48771'); }
      termOut.scrollTop = termOut.scrollHeight;
    });

    // ── dropdown menu system ────────────────────────
    const ddMap = {file:'vsc-file-dd', edit:'vsc-edit-dd', view:'vsc-view-dd', run:'vsc-run-dd', terminal:'vsc-terminal-dd'};
    const hideAllDDs = () => Object.values(ddMap).forEach(id=>{const el=win.querySelector('#'+id);if(el)el.style.display='none';});

    // Position all dropdowns absolutely within the window
    Object.values(ddMap).forEach(id => {
      const dd = win.querySelector('#'+id);
      if(!dd) return;
      dd.style.cssText += ';position:absolute;z-index:999;min-width:170px;background:#2d2d30;border:1px solid #555;border-radius:4px;padding:4px 0;box-shadow:0 8px 24px rgba(0,0,0,0.5)';
      // Style items
      dd.querySelectorAll('[data-a]').forEach(item => {
        item.style.cssText = 'padding:7px 16px;color:#ccc;cursor:pointer;font-size:13px;user-select:none';
        item.addEventListener('mouseenter',()=>item.style.background='#094771');
        item.addEventListener('mouseleave',()=>item.style.background='');
      });
    });

    win.querySelectorAll('#vsc-menubar .menu-item').forEach(mi => {
      mi.addEventListener('click', e => {
        e.stopPropagation();
        const menu = mi.dataset.menu;
        const ddId = ddMap[menu];
        const dd   = win.querySelector('#'+ddId);
        if(!dd) return;
        const wasOpen = dd.style.display === 'block';
        hideAllDDs();
        if(!wasOpen){
          const wrect = win.getBoundingClientRect();
          const mrect = mi.getBoundingClientRect();
          dd.style.left = (mrect.left - wrect.left) + 'px';
          dd.style.top  = (mrect.bottom - wrect.top) + 'px';
          dd.style.display = 'block';
        }
      });
    });

    // ── dropdown action handler ──────────────────────
    win.querySelectorAll('[data-a]').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        hideAllDDs();
        switch(item.dataset.a){
          case 'new':        doNew(); break;
          case 'open':       doOpen(); break;
          case 'save':       doSave(); break;
          case 'saveas':     doSaveAs(); break;
          case 'export':     doExport(); break;
          case 'copy':       navigator.clipboard.writeText(ta.value.substring(ta.selectionStart,ta.selectionEnd)); break;
          case 'paste':      navigator.clipboard.readText().then(t=>{const s=ta.selectionStart,ed=ta.selectionEnd;ta.value=ta.value.substring(0,s)+t+ta.value.substring(ed);ta.selectionStart=ta.selectionEnd=s+t.length;updateStatus();}); break;
          case 'selectall':  ta.select(); break;
          case 'find':       { const q=prompt('Find:');if(q){const i=ta.value.indexOf(q);if(i>=0){ta.setSelectionRange(i,i+q.length);ta.focus();}else toast('','Find','Not found.');} break; }
          case 'sidebar':    sidebar.style.display=sidebar.style.display==='none'?'flex':'none'; break;
          case 'toggleterm': toggleTerm(); break;
          case 'runcode':    runCode(); break;
          case 'newterm':    termOut.innerHTML=''; showTerm(); break;
          case 'clearterm':  termOut.innerHTML=''; break;
        }
      });
    });

    // Close dropdowns on outside click
    win.addEventListener('click', e => {
      if(!e.target.closest('.menu-item') && !e.target.closest('.vsc-dd')) hideAllDDs();
    });

    // ── keyboard shortcuts ───────────────────────────
    win.addEventListener('keydown', e => {
      if((e.ctrlKey||e.metaKey) && e.key==='s')   { e.preventDefault(); doSave(); }
      else if((e.ctrlKey||e.metaKey) && e.key==='r'){ e.preventDefault(); runCode(); }
      else if(e.key==='F5')                          { e.preventDefault(); runCode(); }
      else if((e.ctrlKey||e.metaKey) && e.key==='`'){ e.preventDefault(); toggleTerm(); }
      else if((e.ctrlKey||e.metaKey) && e.key==='n'){ e.preventDefault(); doNew(); }
      else if((e.ctrlKey||e.metaKey) && e.key==='o'){ e.preventDefault(); doOpen(); }
    });

    ta.focus();

    // ── Tutorial popup (shown once per session) ──────────────────
    const tutKey = 'huebit-vsc-tut-seen';
    if (!sessionStorage.getItem(tutKey)) {
      sessionStorage.setItem(tutKey, '1');
      setTimeout(() => {
        const ov = document.createElement('div');
        ov.className = 'vsc-tut-overlay';
        ov.innerHTML = `
          <div class="vsc-tut-modal">
            <div class="vsc-tut-header">
              <span class="vsc-tut-icon">📋</span>
              <span>VS Code — Quick Start</span>
              <button class="vsc-tut-close" id="vsc-tut-close">✕</button>
            </div>
            <div class="vsc-tut-body">
              <p class="vsc-tut-lead">Para ejecutar cualquier programa, primero debes <strong>guardarlo con la extensión correcta</strong>:</p>
              <div class="vsc-tut-table">
                <div class="vsc-tut-row">
                  <span class="vsc-tut-lang html">HTML</span>
                  <span class="vsc-tut-ext">.html</span>
                  <span class="vsc-tut-eg">example.html</span>
                </div>
                <div class="vsc-tut-row">
                  <span class="vsc-tut-lang js">JS</span>
                  <span class="vsc-tut-ext">.js</span>
                  <span class="vsc-tut-eg">example.js</span>
                </div>
                <div class="vsc-tut-row">
                  <span class="vsc-tut-lang py">Python</span>
                  <span class="vsc-tut-ext">.py</span>
                  <span class="vsc-tut-eg">example.py</span>
                </div>
                <div class="vsc-tut-row">
                  <span class="vsc-tut-lang css">CSS</span>
                  <span class="vsc-tut-ext">.css</span>
                  <span class="vsc-tut-eg">example.css</span>
                </div>
              </div>
              <div class="vsc-tut-steps">
                <div class="vsc-tut-step"><span class="vsc-tut-num">1</span>Escribe tu código</div>
                <div class="vsc-tut-step"><span class="vsc-tut-num">2</span>File → Save As… y ponle el nombre con extensión</div>
                <div class="vsc-tut-step"><span class="vsc-tut-num">3</span>Presiona <kbd>F5</kbd> o el botón <strong>▶ Run</strong></div>
              </div>
              <p class="vsc-tut-note">💡 HTML abre una ventana de preview. JS y Python muestran output en el terminal. CSS informa que debe usarse dentro de HTML.</p>
            </div>
            <div class="vsc-tut-footer">
              <label class="vsc-tut-nosee"><input type="checkbox" id="vsc-tut-nosee"> No mostrar de nuevo</label>
              <button class="vsc-tut-ok" id="vsc-tut-ok">Entendido ✓</button>
            </div>
          </div>`;
        win.appendChild(ov);
        const close = () => {
          if (ov.querySelector('#vsc-tut-nosee')?.checked) {
            try { localStorage.setItem('huebit-vsc-tut-perm', '1'); } catch(e) {}
          }
          ov.style.opacity = '0';
          setTimeout(() => ov.remove(), 180);
        };
        ov.querySelector('#vsc-tut-close').onclick = close;
        ov.querySelector('#vsc-tut-ok').onclick = close;
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        // Check permanent dismiss
        try { if (localStorage.getItem('huebit-vsc-tut-perm')) { ov.remove(); return; } } catch(e) {}
        requestAnimationFrame(() => { ov.style.transition = 'opacity .2s'; ov.style.opacity = '1'; });
      }, 350);
    }
  }

  return { content, onMount };
}

