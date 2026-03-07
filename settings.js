// ── SETTINGS ─────────────────────────────────────────────────────
const WP_THEMES=[
  {key:'original',label:'Original',img:'./public/wallpaper.png',bg:null},
  {key:'aurora',  label:'Aurora',  img:null,bg:'radial-gradient(ellipse 130% 90% at 50% 110%,#0b1535,#040608)'},
  {key:'sunset',  label:'Sunset',  img:null,bg:'linear-gradient(160deg,#1a0533,#3d1a00 50%,#1a0000)'},
  {key:'ocean',   label:'Ocean',   img:null,bg:'linear-gradient(160deg,#020c18,#0a2040 50%,#020c18)'},
  {key:'forest',  label:'Forest',  img:null,bg:'linear-gradient(160deg,#020f08,#072010 50%,#020f08)'},
  {key:'void',    label:'Void',    img:null,bg:'#000'},
];
let curWP='original';
function setWallpaper(key){
  curWP=key;const wp=WP_THEMES.find(w=>w.key===key)||WP_THEMES[0];
  const wall=document.getElementById('wallpaper');
  if(wp.key==='custom'&&customWallpaperData){
    wall.style.backgroundImage=`url('${customWallpaperData}')`;wall.style.backgroundSize='cover';wall.style.backgroundPosition='center';wall.style.background='';
  }else if(wp.img){
    wall.style.backgroundImage=`url('${wp.img}')`;wall.style.backgroundSize='cover';wall.style.backgroundPosition='center';wall.style.background='';
  }else{wall.style.backgroundImage='none';wall.style.background=wp.bg;}
}

function mkToggle(id,checked,onChange){const lbl=document.createElement('label');lbl.className='sett-toggle';const inp=document.createElement('input');inp.type='checkbox';inp.id=id;inp.checked=checked;const track=document.createElement('div');track.className='sett-toggle-track';const thumb=document.createElement('div');thumb.className='sett-toggle-thumb';lbl.append(inp,track,thumb);inp.addEventListener('change',()=>onChange(inp.checked));return lbl;}

function buildSettings(opts){
  const content=`<div class="sett-wrap"><div class="sett-side" id="sett-side-nav"></div><div class="sett-body" id="sbody"></div></div>`;
  function onMount(win){const body=win.querySelector('#sbody');const nav=win.querySelector('#sett-side-nav');const navItems=[{sec:'appearance',label:'Appearance',ico:'palette'},{sec:'display',label:'Display',ico:'monitor'},{sec:'sound',label:'Sound',ico:'sound'},{sec:'network',label:'Network',ico:'globe'},{sec:'privacy',label:'Privacy',ico:'shield'},{sec:'keyboard',label:'Keyboard',ico:'keyboard'},{sec:'about',label:'About',ico:'info'},{sec:'reset',label:'Reset',ico:'resetIco'}];navItems.forEach(n=>{const d=document.createElement('div');d.className='sett-nav';d.dataset.sec=n.sec;d.innerHTML=SI[n.ico]+n.label;d.onclick=()=>show(n.sec);nav.appendChild(d);});
    function show(sec){nav.querySelectorAll('.sett-nav').forEach(n=>n.classList.toggle('active',n.dataset.sec===sec));body.innerHTML='';
      if(sec==='appearance'){const wpGrid=document.createElement('div');wpGrid.className='sett-sec';wpGrid.innerHTML='<h3>Wallpaper Theme</h3>';const g=document.createElement('div');g.className='wp-grid';WP_THEMES.forEach(wp=>{const el=document.createElement('div');el.className='wp-opt'+(wp.key===curWP?' active':'');el.style.cssText=wp.img?`background-image:url('${wp.img}');background-size:cover;background-position:center`:`background:${wp.bg||'#111'}`;el.innerHTML=`<span>${wp.label}</span>`;el.onclick=()=>{setWallpaper(wp.key);g.querySelectorAll('.wp-opt').forEach(e=>e.classList.remove('active'));el.classList.add('active');toast('','Wallpaper',`Theme "${wp.label}" applied.`);};g.appendChild(el);});wpGrid.appendChild(g);
        // Custom wallpaper upload
        const cwRow=document.createElement('div');cwRow.style.cssText='margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        const cwBtn=document.createElement('button');cwBtn.innerHTML=SI.upload+'Upload Custom Wallpaper';
        cwBtn.style.cssText='padding:7px 14px;border-radius:9px;border:1px dashed rgba(255,255,255,0.25);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.7);font-size:12px;cursor:pointer;font-family:var(--font);transition:all .15s';
        cwBtn.onmouseenter=()=>{cwBtn.style.background='rgba(91,138,245,0.18)';cwBtn.style.borderColor='rgba(91,138,245,0.4)';cwBtn.style.color='#fff';};
        cwBtn.onmouseleave=()=>{cwBtn.style.background='rgba(255,255,255,0.05)';cwBtn.style.borderColor='rgba(255,255,255,0.25)';cwBtn.style.color='rgba(255,255,255,0.7)';};
        cwBtn.onclick=()=>{
          const fi=document.createElement('input');fi.type='file';fi.accept='image/*';
          fi.onchange=e=>{
            const file=e.target.files[0];if(!file)return;
            const r=new FileReader();
            r.onload=ev=>{
              customWallpaperData=ev.target.result;
              const cwp={key:'custom',label:'Custom',img:null,bg:'url('+customWallpaperData+') center/cover no-repeat'};
              const ci=WP_THEMES.findIndex(w=>w.key==='custom');
              if(ci>=0)WP_THEMES[ci]=cwp;else WP_THEMES.push(cwp);
              setWallpaper('custom');
              toast('','Wallpaper',`Custom wallpaper set: ${file.name}`);
              // rebuild wp grid to show custom option
              show('appearance');
            };
            r.readAsDataURL(file);
          };fi.click();
        };
        cwRow.appendChild(cwBtn);
        if(customWallpaperData){
          const clrBtn=document.createElement('button');clrBtn.innerHTML=SI.close+' Remove Custom';
          clrBtn.style.cssText='padding:7px 12px;border-radius:9px;border:1px solid rgba(255,90,90,0.25);background:rgba(255,90,90,0.07);color:rgba(255,120,120,0.8);font-size:12px;cursor:pointer;font-family:var(--font);transition:all .15s';
          clrBtn.onclick=()=>{customWallpaperData=null;const ci=WP_THEMES.findIndex(w=>w.key==='custom');if(ci>=0)WP_THEMES.splice(ci,1);if(curWP==='custom'){setWallpaper('original');}autoSave();show('appearance');};
          cwRow.appendChild(clrBtn);
        }
        wpGrid.appendChild(cwRow);
        body.appendChild(wpGrid);const accentSec=document.createElement('div');accentSec.className='sett-sec';accentSec.innerHTML='<h3>Accent Color</h3>';const row1=document.createElement('div');row1.className='sett-row col';row1.innerHTML='<label>Select accent color</label>';const swatches=document.createElement('div');swatches.className='color-swatches';const accents=[{c1:'#5b8af5',c2:'#9b59f5',label:'Blue'},{c1:'#e91e8c',c2:'#ff6b9d',label:'Pink'},{c1:'#00c896',c2:'#00e5b4',label:'Teal'},{c1:'#ff6b2b',c2:'#ff9f5b',label:'Orange'},{c1:'#f7c535',c2:'#ffe066',label:'Yellow'},{c1:'#a855f7',c2:'#7c3aed',label:'Violet'}];accents.forEach(a=>{const sw=document.createElement('div');sw.className='color-swatch'+(OS.accent===a.c1?' active':'');sw.style.background=`linear-gradient(135deg,${a.c1},${a.c2})`;sw.title=a.label;sw.onclick=()=>{setAccent(a.c1,a.c2);swatches.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('active'));sw.classList.add('active');toast('','Accent',`Color set to ${a.label}.`);};swatches.appendChild(sw);});row1.appendChild(swatches);accentSec.appendChild(row1);body.appendChild(accentSec);const ifSec=document.createElement('div');ifSec.className='sett-sec';ifSec.innerHTML='<h3>Interface</h3>';[{label:'Night Light',toggle:true,checked:OS.nightLight,onChange:v=>{setNightLight(v);}},{label:'Window Animations',toggle:true,checked:OS.animations,onChange:v=>{OS.animations=v;}},{label:'Dark Mode',toggle:true,checked:true,onChange:v=>toast('','Info','Dark mode is always on.')}].forEach(r=>{const row=document.createElement('div');row.className='sett-row';row.innerHTML=`<label>${r.label}</label>`;if(r.toggle)row.appendChild(mkToggle('t_'+r.label.replace(/\s/g,''),r.checked,r.onChange));else{const sp=document.createElement('span');sp.className='val on';sp.textContent='On';row.appendChild(sp);}ifSec.appendChild(row);});const fsRow=document.createElement('div');fsRow.className='sett-row col';fsRow.innerHTML='<label>Desktop Font Size</label>';const fsWrap=document.createElement('div');fsWrap.className='sett-range-wrap';const fsSlider=document.createElement('input');fsSlider.type='range';fsSlider.className='hb-range';fsSlider.min='11';fsSlider.max='18';fsSlider.step='1';fsSlider.value=OS.fontSize;const fsVal=document.createElement('span');fsVal.className='sett-range-val';fsVal.textContent=OS.fontSize+'px';updateRangeGradient(fsSlider,11,18);fsSlider.oninput=()=>{OS.fontSize=parseInt(fsSlider.value);fsVal.textContent=OS.fontSize+'px';document.querySelectorAll('.desk-icon span').forEach(el=>el.style.fontSize=Math.max(10,OS.fontSize-2)+'px');updateRangeGradient(fsSlider,11,18);};fsWrap.append(fsSlider,fsVal);fsRow.appendChild(fsWrap);ifSec.appendChild(fsRow);body.appendChild(ifSec);}
      else if(sec==='display'){body.innerHTML=`<div class="sett-sec"><h3>Display</h3><div class="sett-row"><label>Resolution</label><span class="val">${window.innerWidth} × ${window.innerHeight}</span></div><div class="sett-row"><label>Color Depth</label><span class="val">32-bit HDR</span></div><div class="sett-row"><label>Refresh Rate</label><span class="val">60 Hz</span></div><div class="sett-row"><label>Scaling</label><span class="val">100%</span></div></div><div class="sett-sec"><h3>Performance</h3><div class="sett-row"><label>Hardware Acceleration</label><span class="val on">GPU</span></div><div class="sett-row"><label>Render Backend</label><span class="val">WebGL 2.0</span></div></div>`;}
      else if(sec==='sound'){const sSec=document.createElement('div');sSec.className='sett-sec';sSec.innerHTML='<h3>Master Volume</h3>';const sRow=document.createElement('div');sRow.className='sett-row col';sRow.innerHTML='<label>System Volume</label>';const sWrap=document.createElement('div');sWrap.className='sett-range-wrap';const sSlider=document.createElement('input');sSlider.type='range';sSlider.className='hb-range';sSlider.min='0';sSlider.max='100';sSlider.step='1';sSlider.value=OS.volume;const sVal=document.createElement('span');sVal.className='sett-range-val';sVal.textContent=OS.volume+'%';updateRangeGradient(sSlider,0,100);sSlider.oninput=()=>{OS.volume=parseInt(sSlider.value);sVal.textContent=OS.volume+'%';updateRangeGradient(sSlider,0,100);const tr=document.getElementById('vol-range');if(tr){tr.value=OS.volume;document.getElementById('vol-val').textContent=OS.volume+'%';updateRangeGradient(tr,0,100);}document.getElementById('tray-vol').textContent=OS.volume===0?'🔇':OS.volume<40?'🔈':OS.volume<70?'🔉':'🔊';};sWrap.append(sSlider,sVal);sRow.appendChild(sWrap);sSec.appendChild(sRow);body.appendChild(sSec);}
      else if(sec==='network'){body.innerHTML=`<div class="sett-sec"><h3>Status</h3><div class="sett-row"><label>Connection</label><span class="val on">Simulated</span></div><div class="sett-row"><label>IP Address</label><span class="val">192.168.1.42</span></div><div class="sett-row"><label>DNS</label><span class="val">8.8.8.8</span></div></div>`;}
      else if(sec==='privacy'){
        // Username row
        const uSec=document.createElement('div');uSec.className='sett-sec';uSec.innerHTML='<h3>Account</h3>';
        const uRow=document.createElement('div');uRow.className='sett-row';
        uRow.innerHTML='<label>Display Name</label>';
        const uInp=document.createElement('input');uInp.type='text';uInp.value=OS.username||'User';uInp.placeholder='Your name';
        uInp.style.cssText='background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:7px 12px;border-radius:8px;font-family:var(--font);font-size:13px;outline:none;width:160px;transition:border-color .15s';
        uInp.onfocus=()=>uInp.style.borderColor='rgba(91,138,245,0.55)';
        uInp.onblur=()=>uInp.style.borderColor='rgba(255,255,255,0.12)';
        uInp.oninput=()=>{OS.username=uInp.value.trim()||'User';autoSave();syncSmUsername();};
        uRow.appendChild(uInp);uSec.appendChild(uRow);

        // ── avatar row ──
        const avRow=document.createElement('div');avRow.className='sett-row';
        avRow.innerHTML='<label>Profile Picture</label>';
        const avRight=document.createElement('div');avRight.style.cssText='display:flex;align-items:center;gap:10px';
        const avPreview=document.createElement('div');
        avPreview.style.cssText='width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid rgba(255,255,255,0.12)';
        if(OS.avatar){const pi=document.createElement('img');pi.src=OS.avatar;pi.style.cssText='width:100%;height:100%;object-fit:cover';avPreview.appendChild(pi);}
        else{avPreview.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';}
        const avBtn=document.createElement('button');avBtn.className='ed-btn';avBtn.innerHTML=SI.upload+'Upload Photo';
        avBtn.onclick=()=>{
          const inp=document.createElement('input');inp.type='file';inp.accept='image/*';
          inp.onchange=e=>{
            const f=e.target.files[0];if(!f)return;
            const r=new FileReader();
            r.onload=ev=>{
              OS.avatar=ev.target.result;
              avPreview.innerHTML='';const pi=document.createElement('img');pi.src=OS.avatar;pi.style.cssText='width:100%;height:100%;object-fit:cover';avPreview.appendChild(pi);
              syncAvatar();autoSave();toast('','Profile','Avatar updated.');
            };
            r.readAsDataURL(f);
          };
          inp.click();
        };
        const avClrBtn=document.createElement('button');avClrBtn.className='ed-btn';avClrBtn.innerHTML=SI.close+' Remove';
        avClrBtn.onclick=()=>{OS.avatar=null;avPreview.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';syncAvatar();autoSave();toast('','Profile','Avatar removed.');};
        avRight.appendChild(avPreview);avRight.appendChild(avBtn);avRight.appendChild(avClrBtn);
        avRow.appendChild(avRight);uSec.appendChild(avRow);

        body.appendChild(uSec);

        const pSec=document.createElement('div');pSec.className='sett-sec';pSec.innerHTML='<h3>Lock Screen</h3>';const lockOptions=[['Never',0],['1 min',1],['5 min',5],['10 min',10],['30 min',30]];const lRow=document.createElement('div');lRow.className='sett-row';lRow.innerHTML='<label>Auto-lock after</label>';const sel=document.createElement('select');sel.style.cssText='background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:5px 10px;border-radius:8px;font-family:var(--font);font-size:13px;outline:none;cursor:pointer';lockOptions.forEach(([l,v])=>{const o=document.createElement('option');o.value=v;o.textContent=l;if(v===OS.lockAfter)o.selected=true;sel.appendChild(o);});sel.onchange=()=>{OS.lockAfter=parseInt(sel.value);resetLockTimer();toast('','Lock',sel.value==='0'?'Auto-lock disabled.':`Auto-lock in ${sel.options[sel.selectedIndex].text}.`);autoSave();};lRow.appendChild(sel);pSec.appendChild(lRow);const pwRow=document.createElement('div');pwRow.className='sett-row';pwRow.innerHTML='<label>Use password</label>';const pwToggle=mkToggle('use_pass',OS.usePassword,v=>{OS.usePassword=v;pwInp.style.display=v?'block':'none';if(!v)OS.password='';autoSave();});pwRow.appendChild(pwToggle);pSec.appendChild(pwRow);const pwInp=document.createElement('div');pwInp.className='sett-row col';pwInp.style.display=OS.usePassword?'block':'none';pwInp.innerHTML='<label>Set password</label>';const pwInput=document.createElement('input');pwInput.type='password';pwInput.placeholder='Enter new password';pwInput.style.cssText='background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 12px;border-radius:8px;font-family:var(--font);font-size:13px;outline:none;width:100%';pwInput.onchange=()=>{OS.password=pwInput.value;autoSave();toast('','Password','Updated.');};pwInp.appendChild(pwInput);pSec.appendChild(pwInp);body.appendChild(pSec);}
      else if(sec==='keyboard'){body.innerHTML=`<div class="sett-sec"><h3>Keyboard Shortcuts</h3><div class="sett-row"><label>Ctrl+S</label><span class="val">Save file</span></div><div class="sett-row"><label>Ctrl+R / F5</label><span class="val">Run code (VS Code)</span></div><div class="sett-row"><label>Ctrl+\`</label><span class="val">Toggle terminal</span></div><div class="sett-row"><label>Space (Media)</label><span class="val">Play / Pause</span></div><div class="sett-row"><label>↑↓ (Terminal)</label><span class="val">History</span></div><div class="sett-row"><label>Tab (Terminal)</label><span class="val">Autocomplete</span></div></div>`;}
      else if(sec==='about'){body.innerHTML=`<div class="sett-sec"><h3>System Information</h3><div class="sett-row"><label>OS Name</label><span class="val">HueBit OS</span></div><div class="sett-row"><label>Version</label><span class="val">1.4.4</span></div><div class="sett-row"><label>Build</label><span class="val">2025.07 stable</span></div><div class="sett-row"><label>Kernel</label><span class="val">HTML5 / V8</span></div><div class="sett-row"><label>Hosting</label><span class="val on">GitHub Pages</span></div><div class="sett-row"><label>Resolution</label><span class="val">${window.innerWidth}×${window.innerHeight}</span></div><div class="sett-row"><label>Session Uptime</label><span id="sv-uptime2" class="val">0s</span></div></div><div class="sett-sec" style="margin-top:16px"><h3>Changelog — v1.4.4</h3><div style="background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.07);padding:12px 14px;font-size:12px;line-height:2;color:rgba(255,255,255,0.65)"><span style="color:#78e0a0;font-weight:700">Audio Player fixes</span><br>• Fixed: play() Promise rejection was silently swallowed — caused button stuck at ▶ and timer at 0:00 on browsers with autoplay restrictions or invalid src<br>• Fixed: opening Audio Player without a file no longer deadlocks — clicking ▶ now auto-opens a file picker<br>• Added: 📂 Open File button so users can load local audio at any time without drag-and-drop<br>• Fixed: error handler now reports specific error code (Network / Decode / Unsupported) instead of a generic message<br>• Fixed: volume slider now uses parseFloat() preventing silent volume precision bugs<br><span style="color:rgba(255,255,255,0.35);font-size:11px">v1.4.2 → v1.4.4 · Audio Player stability patch</span></div></div><div style="text-align:center;padding:18px 0 6px;opacity:.35"><div style="margin-bottom:8px;opacity:.6"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div><div style="font-size:12px;line-height:1.9">HTML5 · CSS3 · Vanilla JS<br>No frameworks · No dependencies<br>GitHub Pages compatible</div></div>`;const t0=Date.now();const iv=setInterval(()=>{const el=body.querySelector('#sv-uptime2');if(!el){clearInterval(iv);return;}const s=Math.floor((Date.now()-t0)/1000);el.textContent=s<60?s+'s':s<3600?Math.floor(s/60)+'m '+s%60+'s':Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m';},1000);}
      else if(sec==='reset'){
        const rSec=document.createElement('div');rSec.className='sett-sec';
        rSec.innerHTML='<h3>Factory Reset</h3>';
        const desc=document.createElement('div');
        desc.style.cssText='font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:18px;padding:12px 14px;background:rgba(255,80,80,0.06);border:1px solid rgba(255,80,80,0.15);border-radius:10px';
        desc.innerHTML='<strong style="color:rgba(255,120,120,0.9)">Warning — this cannot be undone.</strong><br>Clears all localStorage data: settings, wallpaper, password, profile picture, and every file you created or imported. The OS will reload from its default state.';
        rSec.appendChild(desc);
        const rRow=document.createElement('div');rRow.className='sett-row';rRow.style.flexDirection='column';rRow.style.alignItems='flex-start';rRow.style.gap='12px';

        // Confirm checkbox
        const chkWrap=document.createElement('label');
        chkWrap.style.cssText='display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:rgba(255,255,255,0.65);user-select:none';
        const chk=document.createElement('input');chk.type='checkbox';
        chk.style.cssText='width:15px;height:15px;accent-color:#ff5f57;cursor:pointer';
        const chkLbl=document.createElement('span');chkLbl.textContent='I understand — delete everything and reset';
        chkWrap.appendChild(chk);chkWrap.appendChild(chkLbl);

        // Reset button
        const rBtn=document.createElement('button');
        rBtn.style.cssText='background:rgba(255,80,80,0.18);border:1px solid rgba(255,80,80,0.4);color:#ff9090;padding:9px 22px;border-radius:10px;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;opacity:0.4;pointer-events:none;transition:all .15s;display:flex;align-items:center;gap:6px';
        rBtn.innerHTML=SI.resetIco+'Reset to Factory Defaults';
        rBtn.title='Check the box above to enable this button';

        chk.onchange=()=>{
          rBtn.style.opacity=chk.checked?'1':'0.4';
          rBtn.style.pointerEvents=chk.checked?'auto':'none';
        };
        rBtn.onclick=()=>{
          if(!chk.checked)return;
          localStorage.removeItem(LS_KEY);
          toast('','Reset','Cleared. Reloading…');
          setTimeout(()=>location.reload(),900);
        };

        rRow.appendChild(chkWrap);
        rRow.appendChild(rBtn);
        rSec.appendChild(rRow);
        body.appendChild(rSec);
      }
    }
    show('appearance');
  }
  return{content,onMount};
}

// ── RANGE GRADIENT HELPER ─────────────────────────────────────────
function updateRangeGradient(input,min,max){const pct=((input.value-min)/(max-min))*100;input.style.background=`linear-gradient(to right,var(--accent) ${pct}%,rgba(255,255,255,0.15) ${pct}%)`;}

// ── LOCK SCREEN ──────────────────────────────────────────────────
let _lockTimer=null;
function resetLockTimer(){clearTimeout(_lockTimer);if(OS.lockAfter>0)_lockTimer=setTimeout(()=>lockScreen(),OS.lockAfter*60000);}

function lockScreen(){
  if(document.querySelector('.lock-overlay'))return;
  const ov=document.createElement('div');ov.className='lock-overlay';
  document.body.appendChild(ov);

  const renderLock=()=>{
    const n=new Date(),p=x=>String(x).padStart(2,'0');
    const timeStr=`${p(n.getHours())}:${p(n.getMinutes())}`;
    const dateStr=n.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    const needsPw=OS.usePassword&&OS.password;
    ov.innerHTML=`
      <div class="lock-bg-tint"></div>
      <div class="lock-time">${timeStr}</div>
      <div class="lock-date">${dateStr}</div>
      <div class="lock-card">
        <div class="lock-avatar" style="font-size:0" id="lock-av-el"></div>
        <div class="lock-username">${OS.username||'User'}</div>
        <div class="lock-divider"></div>
        ${needsPw?`
          <div class="lock-pass-wrap">
            <input type="password" id="lock-pass" placeholder="Password" autocomplete="off" spellcheck="false">
            <button class="lock-submit" id="lock-submit">→</button>
          </div>
          <div class="lock-error" id="lock-err"></div>
        `:`<div class="lock-hint-btn" id="lock-click-hint">Click to sign in →</div>`}
      </div>
    `;
    // populate avatar
    const lockAvEl=ov.querySelector('#lock-av-el');
    if(lockAvEl){
      if(OS.avatar){const img=document.createElement('img');img.src=OS.avatar;img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';lockAvEl.appendChild(img);}
      else{lockAvEl.innerHTML='<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';}
    }
    if(needsPw){
      const inp=ov.querySelector('#lock-pass');
      const err=ov.querySelector('#lock-err');
      const sub=ov.querySelector('#lock-submit');
      const tryUnlock=()=>{
        if(inp.value===OS.password){unlock();}
        else{
          err.textContent='Incorrect password';
          err.style.animation='none';
          requestAnimationFrame(()=>err.style.animation='');
          inp.value='';inp.style.borderColor='rgba(255,100,100,0.7)';
          setTimeout(()=>{err.textContent='';inp.style.borderColor='';},2200);
        }
      };
      inp.addEventListener('keydown',e=>{if(e.key==='Enter')tryUnlock();});
      sub.addEventListener('click',tryUnlock);
      setTimeout(()=>inp.focus(),80);
    }else{
      const btn=ov.querySelector('#lock-click-hint');
      const doUnlock=()=>unlock();
      btn&&btn.addEventListener('click',doUnlock);
      ov.addEventListener('click',e=>{if(e.target===ov||e.target.classList.contains('lock-bg-tint')||e.target.classList.contains('lock-time')||e.target.classList.contains('lock-date'))doUnlock();});
      document.addEventListener('keydown',e=>{if(!['Meta','Control','Alt','Shift'].includes(e.key))doUnlock();},{once:true});
    }
  };

  const unlock=()=>{
    clearInterval(iv);
    ov.style.transition='opacity .4s ease';
    ov.style.opacity='0';
    setTimeout(()=>ov.remove(),420);
    resetLockTimer();
  };

  renderLock();
  const iv=setInterval(renderLock,60000); // update clock every minute
}

