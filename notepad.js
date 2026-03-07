function buildNotepad(opts){
  const initFn=opts?.filename||'untitled.txt', initContent=opts?.initial||'', initFsPath=opts?.fsPath||null;

  const content=`<div class="ed-wrap" style="display:flex;flex-direction:column;height:100%">
    <div id="ed-tabbar" style="display:flex;align-items:center;gap:0;background:rgba(0,0,0,0.22);border-bottom:1px solid rgba(255,255,255,0.07);overflow-x:auto;flex-shrink:0;scrollbar-width:none;min-height:36px"></div>
    <div class="ed-toolbar" style="flex-shrink:0">
      <button class="ed-btn" id="ed-new-tab" title="New Tab (Ctrl+T)">${SI.plus}</button>
      <div style="width:1px;height:18px;background:rgba(255,255,255,0.1);margin:0 4px;flex-shrink:0"></div>
      <button class="ed-btn" id="ed-save">Save</button>
      <button class="ed-btn" id="ed-saveas">Save As…</button>
      <span class="ed-fname" id="ed-fn">${initFn}</span>
      <div class="ed-status" id="ed-stat">Ln 1, Col 1</div>
    </div>
    <div id="ed-ta-wrap" style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden">
      <textarea class="ed-ta" id="ed-ta" spellcheck="false" placeholder="Start typing…" style="flex:1;min-height:0"></textarea>
    </div>
  </div>`;

  function onMount(win){
    const tabbar=win.querySelector('#ed-tabbar');
    const ta=win.querySelector('#ed-ta');
    const stat=win.querySelector('#ed-stat');
    const fnEl=win.querySelector('#ed-fn');

    // ── tab state ──
    let tabs=[];  // [{id, name, content, fsPath, dirty}]
    let activeId=null;
    let _tid=0;
    const mkId=()=>'t'+(++_tid);

    const addTab=(name,content,fsPath)=>{
      const id=mkId();
      tabs.push({id,name,content,fsPath,dirty:false});
      renderTabs();
      switchTab(id);
      return id;
    };

    const renderTabs=()=>{
      tabbar.innerHTML='';
      tabs.forEach(t=>{
        const el=document.createElement('div');
        el.style.cssText='display:flex;align-items:center;gap:6px;padding:0 10px 0 12px;height:36px;cursor:pointer;border-right:1px solid rgba(255,255,255,0.07);white-space:nowrap;flex-shrink:0;font-size:12px;font-family:var(--font);color:rgba(255,255,255,0.55);transition:background .12s;min-width:80px;max-width:160px;position:relative';
        if(t.id===activeId) el.style.cssText+=';background:rgba(255,255,255,0.07);color:#fff;border-bottom:2px solid var(--accent)';
        const nameSpan=document.createElement('span');
        nameSpan.textContent=(t.dirty?'● ':'')+t.name;
        nameSpan.style.cssText='overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0';
        const closeBtn=document.createElement('button');
        closeBtn.innerHTML=SI.close;
        closeBtn.style.cssText='background:none;border:none;color:rgba(255,255,255,0.35);cursor:pointer;display:flex;align-items:center;padding:2px;border-radius:3px;flex-shrink:0;transition:color .12s';
        closeBtn.title='Close tab (Ctrl+W)';
        closeBtn.onmouseenter=()=>closeBtn.style.color='rgba(255,255,255,0.85)';
        closeBtn.onmouseleave=()=>closeBtn.style.color='rgba(255,255,255,0.35)';
        closeBtn.onclick=ev=>{ev.stopPropagation();closeTab(t.id);};
        el.appendChild(nameSpan);
        el.appendChild(closeBtn);
        el.onclick=()=>switchTab(t.id);
        tabbar.appendChild(el);
      });
    };

    const switchTab=(id)=>{
      // save current textarea content to current tab
      if(activeId){
        const cur=tabs.find(t=>t.id===activeId);
        if(cur) cur.content=ta.value;
      }
      activeId=id;
      const t=tabs.find(t=>t.id===id);
      if(!t) return;
      ta.value=t.content;
      fnEl.textContent=t.name;
      renderTabs();
      upd();
      ta.focus();
    };

    const closeTab=(id)=>{
      const idx=tabs.findIndex(t=>t.id===id);
      if(idx===-1) return;
      tabs.splice(idx,1);
      if(tabs.length===0){
        // always keep at least one tab
        addTab('untitled.txt','',null);
        return;
      }
      if(activeId===id){
        const newIdx=Math.min(idx, tabs.length-1);
        switchTab(tabs[newIdx].id);
      } else {
        renderTabs();
      }
    };

    const upd=()=>{
      const v=ta.value;
      const lines=v.substr(0,ta.selectionStart).split('\n');
      stat.textContent=`Ln ${lines.length}, Col ${lines[lines.length-1].length+1}  |  ${v.length} ch`;
      // mark dirty
      const cur=tabs.find(t=>t.id===activeId);
      if(cur){
        const origDirty=cur.dirty;
        cur.dirty = (cur.fsPath ? v !== (cur._savedContent||'') : v !== '');
        if(cur.dirty!==origDirty) renderTabs();
      }
    };

    const doSave=()=>{
      const cur=tabs.find(t=>t.id===activeId);
      if(!cur) return;
      cur.content=ta.value;
      if(cur.fsPath){
        const parts=cur.fsPath.replace(/^\/+/,'').split('/').filter(Boolean);
        const fname=parts.pop(), parent=fsGet('/'+parts.join('/'));
        if(parent?.children?.[fname]){
          parent.children[fname].content=ta.value;
          cur.dirty=false; cur._savedContent=ta.value;
          renderTabs(); toast('','Saved',`"${fname}" updated.`); return;
        }
      }
      showSaveDialog(cur.name,()=>ta.value,(dir,name)=>{
        cur.fsPath='/'+dir+'/'+name;
        cur.name=name; cur.dirty=false; cur._savedContent=ta.value;
        fnEl.textContent=name; renderTabs();
      });
    };

    // ── boot first tab ──
    addTab(initFn, initContent, initFsPath);
    const firstTab=tabs[0];
    firstTab._savedContent=initContent;

    // ── new tab button ──
    win.querySelector('#ed-new-tab').onclick=()=>addTab('untitled.txt','',null);

    // ── save buttons ──
    win.querySelector('#ed-save').onclick=doSave;
    win.querySelector('#ed-saveas').onclick=()=>{
      const cur=tabs.find(t=>t.id===activeId);
      if(!cur) return;
      showSaveDialog(cur.name,()=>ta.value,(dir,name)=>{
        cur.fsPath='/'+dir+'/'+name;
        cur.name=name; cur.dirty=false; cur._savedContent=ta.value;
        fnEl.textContent=name; renderTabs();
      });
    };

    // ── textarea events ──
    ta.addEventListener('input',upd);
    ta.addEventListener('click',upd);
    ta.addEventListener('keyup',upd);

    // ── keyboard shortcuts ──
    win.addEventListener('keydown',e=>{
      if(e.key==='s'&&(e.ctrlKey||e.metaKey)){e.preventDefault();doSave();}
      else if(e.key==='t'&&(e.ctrlKey||e.metaKey)){e.preventDefault();addTab('untitled.txt','',null);}
      else if(e.key==='w'&&(e.ctrlKey||e.metaKey)){e.preventDefault();if(activeId)closeTab(activeId);}
    });

    ta.focus();
  }
  return{content,onMount};
}

