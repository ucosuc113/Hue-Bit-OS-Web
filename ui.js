// ── CONTEXT MENU ─────────────────────────────────────────────────
const ctxEl=document.getElementById('ctx');
function ctxMenu(x,y,items){ctxEl.innerHTML='';items.forEach(item=>{if(item.sep){const s=document.createElement('div');s.className='ctx-sep';ctxEl.appendChild(s);return;}const el=document.createElement('div');el.className='ctx-item'+(item.danger?' danger':'');el.textContent=item.label;el.addEventListener('click',()=>{item.fn();hideCtx();});ctxEl.appendChild(el);});ctxEl.style.display='block';ctxEl.style.left=x+'px';ctxEl.style.top=y+'px';setTimeout(()=>{const r=ctxEl.getBoundingClientRect();if(r.right>window.innerWidth)ctxEl.style.left=(window.innerWidth-r.width-8)+'px';if(r.bottom>window.innerHeight)ctxEl.style.top=(window.innerHeight-r.height-8)+'px';ctxEl.classList.add('show');},8);}
function hideCtx(){ctxEl.classList.remove('show');setTimeout(()=>ctxEl.style.display='none',150);}
document.addEventListener('click',()=>hideCtx());
document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideCtx();closeStartMenu();}});
document.getElementById('desktop').addEventListener('contextmenu',e=>{if(e.target.closest('.desk-icon')||e.target.closest('.window'))return;e.preventDefault();ctxMenu(e.clientX,e.clientY,[{label:'New Text File',fn:()=>openApp('notepad')},{label:'Open Explorer',fn:()=>openApp('explorer')},{sep:true},{label:'Change Wallpaper',fn:()=>openApp('settings')},{label:'Settings',fn:()=>openApp('settings')},{sep:true},{label:'Lock Screen',fn:lockScreen}]);});

// ── TOAST ─────────────────────────────────────────────────────────
function toast(icon,title,msg,ms=3500){const el=document.createElement('div');el.className='toast';el.innerHTML=`<div class="toast-ico">${icon}</div><div><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>`;document.getElementById('toasts').appendChild(el);el.addEventListener('click',()=>{el.classList.add('out');setTimeout(()=>el.remove(),220);});setTimeout(()=>{if(document.contains(el)){el.classList.add('out');setTimeout(()=>el.remove(),220);}},ms);}

// ── CLOCK TRAY ────────────────────────────────────────────────────
function tickTray(){const n=new Date(),t=n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),d=n.toLocaleDateString('en-US',{month:'short',day:'numeric'});document.getElementById('clock-tray').innerHTML=`<div>${t}</div><div style="font-size:10px;opacity:.5">${d}</div>`;}
tickTray();setInterval(tickTray,15000);

// ── STARS ─────────────────────────────────────────────────────────
function drawStars(){const cv=document.getElementById('stars-canvas');cv.width=window.innerWidth;cv.height=window.innerHeight;const ctx=cv.getContext('2d');for(let i=0;i<150;i++){const x=Math.random()*cv.width,y=Math.random()*cv.height,r=Math.random()*1.1+.2,a=Math.random()*.5+.1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fill();}}
drawStars();window.addEventListener('resize',drawStars);

// ── VOLUME TRAY ───────────────────────────────────────────────────
(()=>{const btn=document.getElementById('tray-vol');const popup=document.getElementById('vol-popup');const range=document.getElementById('vol-range');const valEl=document.getElementById('vol-val');let open=false;updateRangeGradient(range,0,100);function openV(){open=true;const r=btn.getBoundingClientRect();popup.style.right=(window.innerWidth-r.right-6)+'px';popup.classList.add('show');}function closeV(){open=false;popup.classList.remove('show');}btn.addEventListener('click',e=>{e.stopPropagation();open?closeV():openV();});range.oninput=()=>{OS.volume=parseInt(range.value);valEl.textContent=OS.volume+'%';updateRangeGradient(range,0,100);btn.innerHTML=OS.volume===0?SI.volMute:OS.volume<40?SI.volMid:OS.volume<70?SI.volLow:SI.volHigh;};document.addEventListener('click',e=>{if(open&&!popup.contains(e.target)&&e.target!==btn)closeV();});})();

// ── FILE DROP SYSTEM ──────────────────────────────────────────────
const dropZone=document.getElementById('drop-zone');
let _dragCount=0;
document.getElementById('desktop').addEventListener('dragenter',e=>{e.preventDefault();_dragCount++;if(_dragCount===1){dropZone.classList.add('show');}});
document.getElementById('desktop').addEventListener('dragleave',e=>{_dragCount--;if(_dragCount===0)dropZone.classList.remove('show');});
document.getElementById('desktop').addEventListener('dragover',e=>e.preventDefault());
document.getElementById('desktop').addEventListener('drop',e=>{e.preventDefault();_dragCount=0;dropZone.classList.remove('show');handleFileDrop(e.dataTransfer.files);});
dropZone.addEventListener('dragover',e=>e.preventDefault());
dropZone.addEventListener('drop',e=>{e.preventDefault();_dragCount=0;dropZone.classList.remove('show');handleFileDrop(e.dataTransfer.files);});

function handleFileDrop(files){if(!files||!files.length)return;Array.from(files).forEach(file=>{const ext=file.name.split('.').pop().toLowerCase();const reader=new FileReader();if(TXT_EXT.includes(ext)){reader.onload=ev=>{const desktopNode=fsGet('/Desktop');const docNode=fsGet('/Documents');if(desktopNode?.children){desktopNode.children[file.name]={type:'file',icon:'file_txt',content:ev.target.result};}if(docNode?.children)docNode.children[file.name]={type:'file',icon:'file_txt',content:ev.target.result};renderDesktopFsIcons();toast('','Imported',`"${file.name}" added to Desktop`);};reader.readAsText(file);}else{reader.onload=ev=>{const blobUrl=ev.target.result;let icon='file_bin',folder='Downloads';if(IMG_EXT.includes(ext)){icon='file_img';folder='Pictures';}else if(VID_EXT.includes(ext)){icon='file_video';folder='Videos';}else if(AUD_EXT.includes(ext)){icon='file_music';folder='Music';}const entry={type:'file',icon,blobUrl,content:null};const desktopNode=fsGet('/Desktop');if(desktopNode?.children){desktopNode.children[file.name]=entry;}const folderNode=fsGet('/'+folder);if(folderNode?.children)folderNode.children[file.name]=entry;renderDesktopFsIcons();autoSave();toast('','Imported',`"${file.name}" added to ${folder}`);};reader.readAsDataURL(file);}});}

