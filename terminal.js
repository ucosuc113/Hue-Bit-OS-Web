// ── TERMINAL ─────────────────────────────────────────────────────
function buildTerminal(opts){
  const content=`<div class="term-wrap"><div class="term-out" id="tout"></div><div class="term-row"><span class="term-prompt" id="tprompt">user@huebit:~$&nbsp;</span><input class="term-in" id="tin" autocomplete="off" spellcheck="false"></div></div>`;
  function onMount(win){
    const out=win.querySelector('#tout'),inp=win.querySelector('#tin'),pEl=win.querySelector('#tprompt');
    let cwd='/',hist=[],hi=-1;
    const ln=(t,c='')=>{const d=document.createElement('div');d.className='term-line '+c;d.textContent=t;out.appendChild(d);out.scrollTop=out.scrollHeight;};
    const lnh=h=>{const d=document.createElement('div');d.className='term-line';d.innerHTML=h;out.appendChild(d);out.scrollTop=out.scrollHeight;};
    const upP=()=>{const s=cwd==='/'?'~':cwd.split('/').pop();pEl.textContent=`user@huebit:${s}$ `;};
    ln('HueBit Shell  v1.4.4','acc');ln('Type "help" for commands.','info');ln('');
    const CMD={
      help(){lnh('<span style="color:#5b8af5;font-weight:700">Commands</span>');[['help','Show help'],['ls','List directory'],['cd [dir]','Change directory'],['pwd','Working dir'],['clear','Clear output'],['echo [text]','Print text'],['cat [file]','Read file'],['mkdir [name]','Create directory'],['touch [name]','Create file'],['rm [name]','Remove file/dir'],['whoami','User info'],['date','Date & time'],['uname','OS info'],['neofetch','System info'],['calc [expr]','Evaluate math'],['open [app]','Open app'],['python [code]','Run Python'],['history','Command history']].forEach(([c,d])=>lnh(`  <span style="color:#78e0a0;display:inline-block;min-width:130px">${c}</span><span style="color:rgba(255,255,255,0.4)">${d}</span>`));},
      ls(){CMD.dir();},
      dir(){const n=fsGet(cwd);if(!n?.children){ln('Not a directory','err');return;}const e=Object.entries(n.children);if(!e.length){ln('(empty)','info');return;}e.forEach(([nm,it])=>lnh(`  ${it.type==='dir'?`<span style="color:#5b8af5">${SI.folder} ${nm}/</span>`:`<span style="color:rgba(255,255,255,0.75)">${SI.fileGeneric} ${nm}</span>`}`));lnh(`<span style="color:rgba(255,255,255,0.3)">  ${e.length} item${e.length!==1?'s':''}</span>`);},
      cd(a){const t=a[0];if(!t||t==='~'){cwd='/';upP();return;}if(t==='..'){cwd=cwd.split('/').slice(0,-1).join('/')||'/';upP();return;}const np=t.startsWith('/')?t:(cwd==='/'?'/'+t:cwd+'/'+t);const n=fsGet(np);if(!n)ln(`cd: ${t}: No such file or directory`,'err');else if(n.type!=='dir')ln(`cd: ${t}: Not a directory`,'err');else{cwd=np;upP();}},
      pwd(){ln(cwd);},
      clear(){out.innerHTML='';},
      echo(a){ln(a.join(' '));},
      whoami(){ln('user  [uid=1000  groups=admin,users]');},
      date(){ln(new Date().toString());},
      uname(){ln('HueBit OS 1.4.4 (HTML5/JS) x86_64');},
      history(){hist.forEach((c,i)=>ln(`  ${String(hist.length-i).padStart(4,' ')}  ${c}`,'info'));},
      cat(a){if(!a[0]){ln('Usage: cat <file>','err');return;}const p=a[0].startsWith('/')?a[0]:(cwd==='/'?'/'+a[0]:cwd+'/'+a[0]);const n=fsGet(p);if(!n)ln(`cat: ${a[0]}: No such file`,'err');else if(n.type==='dir')ln(`cat: ${a[0]}: Is a directory`,'err');else if(!n.content)ln(`cat: ${a[0]}: Binary/media file`,'err');else n.content.split('\n').forEach(l=>ln(l));},
      mkdir(a){if(!a[0]){ln('Usage: mkdir <n>','err');return;}const p=fsGet(cwd);if(p?.children){p.children[a[0]]={type:'dir',children:{}};ln(`Created '${a[0]}'`,'ok');}},
      touch(a){if(!a[0]){ln('Usage: touch <n>','err');return;}const p=fsGet(cwd);if(p?.children){p.children[a[0]]={type:'file',icon:'file_txt',content:''};ln(`Created '${a[0]}'`,'ok');if(cwd==='/Desktop')renderDesktopFsIcons();autoSave();}},
      rm(a){if(!a[0]){ln('Usage: rm <n>','err');return;}const p=fsGet(cwd);if(p?.children?.[a[0]]){delete p.children[a[0]];ln(`Removed '${a[0]}'`,'ok');if(cwd==='/Desktop')renderDesktopFsIcons();autoSave();}else ln(`rm: ${a[0]}: No such file`,'err');},
      open(a){if(APPS_CFG[a[0]]){openApp(a[0]);ln(`Opening ${a[0]}...`,'ok');}else ln(`open: '${a[0]||''}': Unknown app`,'err');},
      python(a){if(!a[0]){ln('Usage: python <code>','err');return;}try{const r=simplePythonRun(a.join(' '));r.split('\n').forEach(l=>ln(l));}catch(e){ln('Error: '+e.message,'err');}},
      calc(a){if(!a[0]){ln('Usage: calc <expr>','err');return;}try{const r=(new Function(`"use strict";return(${a.join(' ').replace(/[^0-9+\-*/.() \^%]/g,'').replace(/\^/g,'**')})`)());lnh(`<span style="color:rgba(255,255,255,0.5)">${a.join(' ')} = </span><span style="color:#78e0a0">${r}</span>`);}catch{ln('Invalid expression','err');}},
      neofetch(){['<span style="color:#5b8af5">  ██╗  ██╗██╗   ██╗███████╗</span>  <b style="color:#9b59f5">user</b>@<b style="color:#5b8af5">huebit</b>','<span style="color:#5b8af5">  ██║  ██║██║   ██║██╔════╝</span>  ──────────────','<span style="color:#5b8af5">  ███████║██║   ██║█████╗  </span>  <span style="color:#9b59f5">OS</span>: HueBit OS 1.4.4','<span style="color:#5b8af5">  ██╔══██║██║   ██║██╔══╝  </span>  <span style="color:#9b59f5">Shell</span>: hsh 1.4','<span style="color:#5b8af5">  ██║  ██║╚██████╔╝███████╗</span>  <span style="color:#9b59f5">Resolution</span>: '+window.innerWidth+'×'+window.innerHeight,'<span style="color:#5b8af5">  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝</span>  <span style="color:#9b59f5">Theme</span>: Aurora Dark'].forEach(lnh);},
    };
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter'){const r=inp.value.trim();if(!r)return;hist.unshift(r);hi=-1;lnh(`<span style="color:#5b8af5">${pEl.textContent}</span><span style="color:#a0c8ff">${r}</span>`);inp.value='';const[c,...a]=r.split(/\s+/);CMD[c]?CMD[c](a):ln(`${c}: command not found (try "help")`,'err');}
      else if(e.key==='ArrowUp'){hi=Math.min(hi+1,hist.length-1);inp.value=hist[hi]||'';e.preventDefault();}
      else if(e.key==='ArrowDown'){hi=Math.max(hi-1,-1);inp.value=hi===-1?'':hist[hi];e.preventDefault();}
      else if(e.key==='Tab'){e.preventDefault();const pts=inp.value.split(' '),part=pts.pop();const n=fsGet(cwd);if(n?.children){const m=Object.keys(n.children).filter(k=>k.startsWith(part));if(m.length===1){pts.push(m[0]);inp.value=pts.join(' ')+' ';}}}
      else if(e.key==='c'&&e.ctrlKey){ln('^C','info');inp.value='';}
    });
    win.querySelector('.term-wrap').addEventListener('click',()=>inp.focus());
    inp.focus();
  }
  return{content,onMount};
}

