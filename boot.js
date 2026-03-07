// ── APP CONFIG ──────────────────────────────────────────────────
const APPS_CFG={
  explorer:   {title:'File Explorer',w:750,h:500,img:'./public/folder_full.png',ico:'folder_open'},
  notepad:    {title:'Text Editor',  w:640,h:460,img:'./public/notepad.png',    ico:'notepad'},
  terminal:   {title:'Terminal',     w:640,h:430,img:'./public/terminal.png',   ico:'terminal'},
  calculator: {title:'Calculator',  w:310,h:520,img:'./public/calc.png',       ico:'calculator'},
  clock:      {title:'Clock',        w:300,h:380,img:'./public/clock.png',      ico:'clock'},
  settings:   {title:'Settings',     w:680,h:500,img:'./public/settings.png',   ico:'settings'},
  img_viewer: {title:'Image Viewer', w:680,h:500,img:'./public/img_viewer.png', ico:'img_viewer'},
  vid_player: {title:'Video Player', w:700,h:480,img:'./public/vid_player.png', ico:'vid_player'},
  aud_player: {title:'Audio Player',w:380,h:490,img:'./public/aud_player.png', ico:'aud_player'},
  vscode:     {title:'VS Code',      w:1000,h:700,img:'./public/vscode.png',    ico:'vscode'},
  social:     {title:'Social Network', w:940,h:620,img:'./public/social.png',    ico:'social'},
  resmon:     {title:'Resource Monitor', w:540,h:480,img:'./public/resmon.png',  ico:'resmon'},
};

function openApp(id,opts){const cfg=APPS_CFG[id];if(!cfg)return;const builder={explorer:buildExplorer,notepad:buildNotepad,terminal:buildTerminal,calculator:buildCalc,clock:buildClock,settings:buildSettings,img_viewer:buildImgViewer,vid_player:buildVidPlayer,aud_player:buildAudPlayer,vscode:buildVSCode,social:buildSocial,resmon:buildResmon}[id];if(!builder)return;const{content,onMount}=builder(opts);WM.create({id:opts?.uid||id,title:opts?.title||cfg.title,width:cfg.w,height:cfg.h,content,onMount,imgSrc:cfg.img,iconKey:cfg.ico});}

function routeOpen(name,item,cwd){const ext=name.split('.').pop().toLowerCase();const src=item.blobUrl||item.src||'';if(IMG_EXT.includes(ext)){const uid='imgv_'+Date.now();const{content,onMount}=buildImgViewer({filename:name,src});WM.create({id:uid,title:name,width:680,height:500,content,onMount,imgSrc:APPS_CFG.img_viewer.img,iconKey:'img_viewer'});}else if(VID_EXT.includes(ext)){const uid='vidp_'+Date.now();const{content,onMount}=buildVidPlayer({filename:name,src});WM.create({id:uid,title:name,width:700,height:480,content,onMount,imgSrc:APPS_CFG.vid_player.img,iconKey:'vid_player'});}else if(AUD_EXT.includes(ext)){const uid='audp_'+Date.now();const{content,onMount}=buildAudPlayer({filename:name,src});WM.create({id:uid,title:name,width:380,height:490,content,onMount,imgSrc:APPS_CFG.aud_player.img,iconKey:'aud_player'});}else if(ext==='html'){openFileInVSCode(name,item.content,cwd==='/'?'/'+name:cwd+'/'+name);}else if(item.content!==null&&item.content!==undefined){openFileInEditor(name,item.content,cwd==='/'?'/'+name:cwd+'/'+name);}else if(src){const uid='imgv_'+Date.now();const{content,onMount}=buildImgViewer({filename:name,src});WM.create({id:uid,title:name,width:680,height:500,content,onMount,imgSrc:APPS_CFG.img_viewer.img,iconKey:'img_viewer'});}else{toast('','Info','Drop the file onto the desktop to import it.');}}

function openFileInEditor(name,content,fsPath){const uid='ed_'+name.replace(/\W/g,'_')+'_'+Date.now();const{content:html,onMount}=buildNotepad({filename:name,initial:content,fsPath});WM.create({id:uid,title:name,width:640,height:460,content:html,onMount,imgSrc:APPS_CFG.notepad.img,iconKey:'notepad'});}
function openFileInVSCode(name,content,fsPath){const uid='vsc_'+name.replace(/\W/g,'_')+'_'+Date.now();const{content:html,onMount}=buildVSCode({filename:name,initial:content,fsPath});WM.create({id:uid,title:name+' - VS Code',width:900,height:650,content:html,onMount,imgSrc:APPS_CFG.vscode.img,iconKey:'vscode'});}

function showSaveDialog(defaultName,getContent,onSaved){const dirs=Object.entries(FS['/'].children).filter(([,v])=>v.type==='dir').map(([k])=>k);const ov=document.createElement('div');ov.className='save-overlay';ov.innerHTML=`<div class="save-modal"><div class="save-modal-hd">💾 Save As</div><div class="save-modal-body"><div class="save-label">Save to folder</div><div class="save-folders">${dirs.map(d=>`<div class="save-folder-btn${d==='Documents'?' active':''}" data-d="${d}">${SI.folder} ${d}</div>`).join('')}</div><div class="save-label" style="margin-top:10px">File name</div><input class="save-input" id="sav-fname" value="${defaultName}" autocomplete="off" spellcheck="false"></div><div class="save-modal-ft"><button class="save-action cancel" id="sav-cancel">Cancel</button><button class="save-action confirm" id="sav-ok">Save</button></div></div>`;document.body.appendChild(ov);let selDir='Documents';ov.querySelectorAll('.save-folder-btn').forEach(b=>b.addEventListener('click',()=>{ov.querySelectorAll('.save-folder-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');selDir=b.dataset.d;}));ov.querySelector('#sav-cancel').onclick=()=>ov.remove();ov.querySelector('#sav-ok').onclick=()=>{const fname=ov.querySelector('#sav-fname').value.trim();if(!fname)return;const parent=fsGet('/'+selDir);if(parent?.children){parent.children[fname]={type:'file',icon:'file_txt',content:getContent()};if(selDir==='Desktop')renderDesktopFsIcons();onSaved?.(selDir,fname);toast('','Saved',`"${fname}" saved to /${selDir}`);autoSave();}ov.remove();};ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});setTimeout(()=>ov.querySelector('#sav-fname').select(),80);}


// ── DESKTOP ───────────────────────────────────────────────────────
const DESK_CFG=[
  {id:'explorer',   label:'Files',         img:'./public/folder.png',    ico:'folder'},
  {id:'notepad',    label:'Text Editor',   img:'./public/notepad.png',    ico:'notepad'},
  {id:'vscode',     label:'VS Code',       img:'./public/vscode.png',     ico:'vscode'},
  {id:'terminal',   label:'Terminal',      img:'./public/terminal.png',   ico:'terminal'},
  {id:'img_viewer', label:'Image Viewer',  img:'./public/img_viewer.png', ico:'img_viewer'},
  {id:'vid_player', label:'Video Player',  img:'./public/vid_player.png', ico:'vid_player'},
  {id:'aud_player', label:'Audio Player', img:'./public/aud_player.png', ico:'aud_player'},
  {id:'calculator', label:'Calculator',    img:'./public/calc.png',       ico:'calculator'},
  {id:'clock',      label:'Clock',         img:'./public/clock.png',      ico:'clock'},
  {id:'settings',   label:'Settings',      img:'./public/settings.png',   ico:'settings'},
  {id:'social',     label:'Social',        img:'./public/social.png',     ico:'social'},
  {id:'resmon',     label:'Res. Monitor',  img:'./public/resmon.png',     ico:'resmon'},
];

function buildDesktop(){const area=document.getElementById('icon-area');DESK_CFG.forEach((app,i)=>{const el=document.createElement('div');el.className='desk-icon';el.style.top=(22+i*90)+'px';el.style.left='16px';el.dataset.id=app.id;const imgWrapper=document.createElement('div');imgWrapper.className='di-img';const img=document.createElement('img');img.alt=app.label;img.width=52;img.height=52;img.onerror=function(){const d=document.createElement('div');d.style.cssText='width:52px;height:52px;display:flex;align-items:center;justify-content:center';d.innerHTML=ICO[app.ico]?ICO[app.ico]():'';this.replaceWith(d);};ensureAppImage(img,app.img,app.ico);imgWrapper.appendChild(img);const sp=document.createElement('span');sp.textContent=app.label;el.appendChild(imgWrapper);el.appendChild(sp);el.style.opacity='0';el.style.transform='translateX(-22px)';setTimeout(()=>{el.style.transition='opacity .4s ease,transform .5s cubic-bezier(.2,1.2,.3,1)';el.style.opacity='1';el.style.transform='translateX(0)';setTimeout(()=>el.style.transition='',560);},60+i*55);let clicks=0,ct;el.addEventListener('click',e=>{document.querySelectorAll('.desk-icon').forEach(d=>d.classList.remove('selected'));el.classList.add('selected');clicks++;clearTimeout(ct);ct=setTimeout(()=>{if(clicks>=2)openApp(app.id);clicks=0;},280);e.stopPropagation();});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();document.querySelectorAll('.desk-icon').forEach(d=>d.classList.remove('selected'));el.classList.add('selected');ctxMenu(e.clientX,e.clientY,[{label:`Open ${app.label}`,fn:()=>openApp(app.id)}]);});_makeDraggableIcon(el);area.appendChild(el);});}

const FS_ICON_COL_LEFT=110;
function renderDesktopFsIcons(){document.querySelectorAll('.desk-icon.fs-file-icon').forEach(e=>e.remove());const desktopNode=fsGet('/Desktop');if(!desktopNode?.children)return;Object.entries(desktopNode.children).forEach(([name,item],idx)=>{addFsDesktopIcon(name,item,idx);});}
function addFsDesktopIcon(name,item,idx){const area=document.getElementById('icon-area');const el=document.createElement('div');el.className='desk-icon fs-file-icon';el.style.top=(22+idx*90)+'px';el.style.left=FS_ICON_COL_LEFT+'px';const ext=name.split('.').pop().toLowerCase();const imgWrapper=document.createElement('div');imgWrapper.className='di-img';if((item.blobUrl||item.src)&&IMG_EXT.includes(ext)){const thumb=document.createElement('img');thumb.src=item.blobUrl||item.src;thumb.style.cssText='width:52px;height:52px;object-fit:cover;border-radius:8px';imgWrapper.appendChild(thumb);}else{const iconFn=ICO[item.icon||(item.type==='dir'?'folder':'file_txt')];imgWrapper.innerHTML=iconFn?iconFn():'';}const sp=document.createElement('span');sp.textContent=name;el.appendChild(imgWrapper);el.appendChild(sp);el.style.opacity='0';el.style.transform='translateX(22px)';requestAnimationFrame(()=>{el.style.transition='opacity .35s ease,transform .45s cubic-bezier(.2,1.2,.3,1)';el.style.opacity='1';el.style.transform='translateX(0)';setTimeout(()=>el.style.transition='',500);});let clicks=0,ct;el.addEventListener('click',e=>{document.querySelectorAll('.desk-icon').forEach(d=>d.classList.remove('selected'));el.classList.add('selected');clicks++;clearTimeout(ct);ct=setTimeout(()=>{if(clicks>=2)routeOpen(name,item,'/Desktop');clicks=0;},280);e.stopPropagation();});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();document.querySelectorAll('.desk-icon').forEach(d=>d.classList.remove('selected'));el.classList.add('selected');ctxMenu(e.clientX,e.clientY,[{label:`Open ${name}`,fn:()=>routeOpen(name,item,'/Desktop')},{sep:true},{label:'Delete',fn:()=>{const dn=fsGet('/Desktop');if(dn?.children){delete dn.children[name];el.style.transition='all .18s ease';el.style.opacity='0';el.style.transform='scale(0.5)';setTimeout(()=>el.remove(),180);toast('','Deleted',`"${name}" removed.`);}},danger:true}]);});_makeDraggableIcon(el);area.appendChild(el);}
function _makeDraggableIcon(el){let sx,sy,sl,st,drag=false;el.addEventListener('mousedown',e=>{if(e.button!==0)return;drag=false;const stX=e.clientX,stY=e.clientY;sx=e.clientX;sy=e.clientY;sl=el.offsetLeft;st=el.offsetTop;const mm=ev=>{if(Math.abs(ev.clientX-stX)+Math.abs(ev.clientY-stY)>4)drag=true;if(drag){el.style.left=(sl+ev.clientX-sx)+'px';el.style.top=Math.max(0,st+ev.clientY-sy)+'px';}};const mu=()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);});}


// ── START MENU ────────────────────────────────────────────────────
const ALL_SM_APPS=[...DESK_CFG];
let smOpen=false,desktopIcons=null; // desktopIcons kept for legacy compat
function buildStartMenu(){const grid=document.getElementById('sm-grid');ALL_SM_APPS.forEach(app=>{const el=document.createElement('div');el.className='sm-item';el.dataset.q=app.label.toLowerCase();const iW=document.createElement('div');iW.className='si-img';const img=document.createElement('img');img.alt=app.label;img.width=36;img.height=36;img.onerror=function(){const d=document.createElement('div');d.style.cssText='width:36px;height:36px;display:flex;align-items:center;justify-content:center';d.innerHTML=ICO[app.ico]?ICO[app.ico]():'';this.replaceWith(d);};ensureAppImage(img,app.img,app.ico);iW.appendChild(img);const sp=document.createElement('span');sp.textContent=app.label;el.appendChild(iW);el.appendChild(sp);el.addEventListener('click',()=>{openApp(app.id);closeStartMenu();});grid.appendChild(el);});document.getElementById('sm-input').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.sm-item').forEach(el=>el.style.display=el.dataset.q.includes(q)?'':'none');});document.getElementById('sm-lock').onclick=()=>{lockScreen();closeStartMenu();};document.getElementById('sm-restart').onclick=()=>toast('','System','Restarting HueBit OS…');document.getElementById('sm-power').onclick=()=>toast('','System','Shutting down…');}
document.getElementById('start-btn').addEventListener('click',e=>{e.stopPropagation();smOpen?closeStartMenu():openStartMenu();});
function openStartMenu(){document.getElementById('start-menu').classList.add('open');smOpen=true;setTimeout(()=>document.getElementById('sm-input').focus(),60);}
function closeStartMenu(){document.getElementById('start-menu').classList.remove('open');smOpen=false;}
document.addEventListener('click',e=>{const sm=document.getElementById('start-menu');if(smOpen&&!sm.contains(e.target)&&!e.target.closest('#start-btn'))closeStartMenu();});


// ── BOOT ──────────────────────────────────────────────────────────

// ── INJECT SVG ICONS INTO DOM ELEMENTS ───────────────────────
(()=>{
  const volTray=document.getElementById('tray-vol');
  if(volTray){volTray.style.display='flex';volTray.style.alignItems='center';volTray.innerHTML=SI.volHigh;}
  const volLow=document.getElementById('vol-low-ico');
  if(volLow)volLow.innerHTML=SI.volMid;
  syncAvatar();
  const smLock=document.getElementById('sm-lock');
  if(smLock){smLock.style.display='flex';smLock.style.alignItems='center';smLock.style.justifyContent='center';smLock.innerHTML=SI.lock;}
  const smRestart=document.getElementById('sm-restart');
  if(smRestart){smRestart.style.display='flex';smRestart.style.alignItems='center';smRestart.style.justifyContent='center';smRestart.innerHTML=SI.restart;}
  const smPower=document.getElementById('sm-power');
  if(smPower){smPower.style.display='flex';smPower.style.alignItems='center';smPower.style.justifyContent='center';smPower.innerHTML=SI.power;}
  const dzIco=document.getElementById('dz-ico-el');
  if(dzIco){dzIco.innerHTML='<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(91,138,245,0.8)" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';}
  const vpMute=document.getElementById('vp-mute');
  if(vpMute){vpMute.innerHTML=SI.volHigh;}
})();
buildDesktop();
buildStartMenu();
// Keep start menu username in sync
function syncSmUsername(){const el=document.getElementById('sm-uname');if(el)el.textContent=OS.username||'User';}
renderDesktopFsIcons();
loadManifest();
loadAutoSave();syncSmUsername();
setTimeout(()=>lockScreen(),200);