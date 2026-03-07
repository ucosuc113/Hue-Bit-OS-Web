'use strict';

/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              ⚠  PERSISTENCE — IMPORTANT NOTE  ⚠                ║
 * ║                                                                  ║
 * ║  TODO: EVERYTHING THAT HAS A SAVE SYSTEM, OR THAT NEEDS TO      ║
 * ║  PERSIST BETWEEN SESSIONS, IS SAVED IN THE BROWSER'S            ║
 * ║  localStorage UNDER THE KEY: "huebit-os-v2"                     ║
 * ║                                                                  ║
 * ║  This includes: OS settings (volume, accent, wallpaper,          ║
 * ║  username, password, font size, night light, lock timer),        ║
 * ║  the virtual filesystem (FS), desktop icon positions,            ║
 * ║  and the user profile avatar (base64 image).                     ║
 * ║                                                                  ║
 * ║  SYSTEM FILE AUTO-PATCH:                                         ║
 * ║  BUILD_VERSION is a string constant in the code. Every time      ║
 * ║  it changes (e.g. "1.4.4" → "1.4.4"), loadAutoSave() calls      ║
 * ║  getSystemFiles() and overwrites only the OS-owned paths         ║
 * ║  (readme.txt, changes_log.txt, dev-notes, etc). All user         ║
 * ║  files, settings, wallpaper, and avatar are preserved.           ║
 * ║                                                                  ║
 * ║  To trigger a patch: bump BUILD_VERSION in the code.             ║
 * ║  To inspect or clear saved data:                                 ║
 * ║    DevTools → Application → Local Storage → huebit-os-v2        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
document.getElementById('sb-img').onerror=function(){this.style.display='none';document.querySelector('.sb-fb').style.display='block'};

// ── SVG ICON FACTORY ─────────────────────────────────────────
let _uid=0;
const mkI=fn=>()=>fn('i'+(++_uid));

function ensureAppImage(imgEl,path,icoKey){
  if(!path){imgEl.onerror?.();return;}
  fetch(path,{method:'GET'}).then(r=>{if(r.ok){imgEl.src=path;}else throw new Error('not ok');}).catch(()=>{const d=document.createElement('div');d.style.cssText=`width:${imgEl.width}px;height:${imgEl.height}px;display:flex;align-items:center;justify-content:center`;d.innerHTML=ICO[icoKey]?ICO[icoKey]():'';imgEl.replaceWith(d);});
}


// ── GLOBAL OS STATE ────────────────────────────────────────────
const OS={volume:80,accent:'#5b8af5',accent2:'#9b59f5',nightLight:false,animations:true,fontSize:14,lockAfter:0,password:'',usePassword:false,username:'User',avatar:null};

function setAccent(c1,c2){document.documentElement.style.setProperty('--accent',c1);if(c2)document.documentElement.style.setProperty('--accent2',c2);OS.accent=c1;if(c2)OS.accent2=c2;autoSave();}

function syncAvatar(){
  const svgFallback='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
  const smAv=document.getElementById('sm-av');
  if(smAv){
    if(OS.avatar){smAv.innerHTML='';const img=document.createElement('img');img.src=OS.avatar;img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';smAv.appendChild(img);}
    else{smAv.innerHTML=svgFallback;}
  }
  // lock screen avatar is recreated dynamically in renderLock(), handled there
}
function setNightLight(on){OS.nightLight=on;let el=document.getElementById('nightlight-ol');if(on&&!el){el=document.createElement('div');el.id='nightlight-ol';el.style.cssText='position:fixed;inset:0;background:rgba(255,110,0,0.11);pointer-events:none;z-index:799;mix-blend-mode:multiply';document.body.appendChild(el);}else if(!on&&el)el.remove();autoSave();}


// ── FULL PERSISTENCE SYSTEM ───────────────────────────────────────
const LS_KEY='huebit-os-v2';

// ── BUILD VERSION ─────────────────────────────────────────────
// Bump this string every time you update system files (readme,
// changelog, dev-notes, etc). loadAutoSave() will patch only
// the SYSTEM_FILES paths in localStorage and leave everything
// else (user files, settings, wallpaper) completely untouched.
const BUILD_VERSION='1.4.4';

let customWallpaperData=null;

function autoSave(){
  try{
    const state={v:2,buildVersion:BUILD_VERSION,OS,FS:JSON.parse(JSON.stringify(FS)),curWP,customWP:customWallpaperData,iconPositions:getIconPositions()};
    localStorage.setItem(LS_KEY,JSON.stringify(state));
  }catch(e){
    try{
      const fsSafe=stripBlobsFromFS(JSON.parse(JSON.stringify(FS)));
      localStorage.setItem(LS_KEY,JSON.stringify({v:2,buildVersion:BUILD_VERSION,OS,FS:fsSafe,curWP,customWP:null,iconPositions:{}}));
    }catch(e2){}
  }
}

function stripBlobsFromFS(node){
  if(!node)return node;
  if(node.type==='file'&&node.blobUrl&&node.blobUrl.startsWith('data:'))return{...node,blobUrl:null};
  if(node.children){const ch={};for(const[k,v]of Object.entries(node.children))ch[k]=stripBlobsFromFS(v);return{...node,children:ch};}
  return node;
}

function getIconPositions(){
  const pos={};
  document.querySelectorAll('.desk-icon').forEach(el=>{const id=el.dataset.id||el.querySelector('span')?.textContent;if(id)pos[id]={left:el.style.left,top:el.style.top};});
  return pos;
}

function loadAutoSave(){
  const saved=localStorage.getItem(LS_KEY);if(!saved)return;
  try{
    const state=JSON.parse(saved);if(!state||state.v!==2)return;
    if(state.OS)Object.assign(OS,state.OS);
    if(state.FS){
      function deepMergeFS(target,source){
        if(!source||!target)return;
        if(source.children&&target.children){for(const[k,v]of Object.entries(source.children)){if(target.children[k]&&target.children[k].type==='dir'&&v.type==='dir')deepMergeFS(target.children[k],v);else target.children[k]=v;}}
      }
      deepMergeFS(FS['/'],state.FS['/']);
    }
    if(state.curWP)curWP=state.curWP;
    if(state.customWP){
      customWallpaperData=state.customWP;
      const ci=WP_THEMES.findIndex(w=>w.key==='custom');
      const cwp={key:'custom',label:'Custom',img:null,bg:'url('+state.customWP+') center/cover no-repeat'};
      if(ci>=0)WP_THEMES[ci]=cwp;else WP_THEMES.push(cwp);
    }
    // ── System file patch on version change ──────────────────
    // If the saved build version is older (or missing), overwrite
    // only the OS-owned paths with the latest content from the
    // current build. User files in all other locations are untouched.
    if(state.buildVersion !== BUILD_VERSION){
      const sysFiles = getSystemFiles();
      for(const [path, node] of Object.entries(sysFiles)){
        fsPatch(path, node);
      }
      console.info(`[HueBit] System files patched: ${state.buildVersion||'legacy'} → ${BUILD_VERSION}`);
      // autoSave runs below after everything is applied, so the new
      // buildVersion will be written to localStorage automatically.
    }
    setAccent(OS.accent,OS.accent2);setNightLight(OS.nightLight);setWallpaper(curWP);renderDesktopFsIcons();if(OS.avatar)setTimeout(syncAvatar,50);
    // Always persist the current state (captures buildVersion update)
    setTimeout(autoSave, 100);
    if(state.iconPositions)setTimeout(()=>{document.querySelectorAll('.desk-icon').forEach(el=>{const id=el.dataset.id||el.querySelector('span')?.textContent;if(id&&state.iconPositions[id]){el.style.left=state.iconPositions[id].left;el.style.top=state.iconPositions[id].top;}});},200);
  }catch(e){console.error('HueBit loadAutoSave:',e);}
}

// ── FAKE FILESYSTEM ────────────────────────────────────────────
const CHANGELOG=`HueBit OS — Changelog
═════════════════════

[v1.4.4] - Latest

- Project refactored: the monolithic index.html was split into
  styles.css + js/core.js + js/wm.js + js/ui.js + js/icons.js +
  js/boot.js + individual app files in js/apps/.
- Added Social Network app: P2P using WebRTC/PeerJS, no backend.
  Posts travel peer-to-peer with hop limit (max 8), cached locally,
  survive peer disconnection. Lazy loading (5 posts/page, 20 in memory).
- Added Resource Monitor app: fake-RAM tracker (256 MB), real
  localStorage usage meter, per-process breakdown, clean temp tool.
- VS Code: welcome tutorial popup on first open, dismissable permanently.

[v1.4.3]

- SVG icon system: all emoji replaced with inline SVGs.
- Text Editor: multi-tab support (Ctrl+T new, Ctrl+W close).
- Audio Player: fixed play() Promise rejection, added Open File button,
  specific error codes, parseFloat() volume precision fix.

[v1.4.2]

- VS Code editor fully rewritten: menus, run, terminal, explorer.
- HTML run opens live preview. JS captures console.log. Python supported.

[v1.4.1]

- Code editor improved, Python added.
- Lock screen UI improved. Login system added.

[v1.4.0]

- Added functional code editor with HTML, JS, and CSS.
- Fixed audio detection. Changed icons.

[v1.3.0]
─────────────────
• Public folder sync via manifest.json
• Works 100% static: no backend, no Node.js, GitHub Pages compatible

[v1.0.0]
─────────────────
• Complete OS: window manager, filesystem, terminal, explorer, media apps`;

// ── SYSTEM FILES REGISTRY ─────────────────────────────────────
// These are the "OS-owned" files that get refreshed in localStorage
// whenever BUILD_VERSION changes. User files are NEVER touched.
// Key = absolute FS path. Value = file node to restore.
// NOTE: this object is defined *after* CHANGELOG so the content
// is already available.
function getSystemFiles(){
  return {
    '/Desktop/readme.txt':            {type:'file',icon:'file_txt',content:'Welcome to HueBit OS v1.4.4!\n─────────────────────────\n\nDouble-click icons to open apps.\nRight-click for context menus.\nDrag files onto desktop to import them.\n\nVS Code is now fully functional:\n- File menu: New, Open, Save, Save As, Export\n- Edit: Copy, Paste, Select All, Find\n- View: Toggle Sidebar, Toggle Terminal\n- Run: Run button executes code\n- Terminal: interactive with run/clear/help\n- Explorer: browse and open FS files\n\nAudio files need to be listed in manifest.json.\n\nTerminal: type "help"\nEnjoy!'},
    '/Desktop/changes_log.txt':       {type:'file',icon:'file_txt',content:CHANGELOG},
    '/Documents/Projects/dev-notes.txt':{type:'file',icon:'file_txt',content:'# HueBit OS Dev Notes\n\nStack: HTML5, CSS3, Vanilla JS\nNo frameworks. No dependencies.\nGitHub Pages compatible.\n\n## File routing by extension\n- .txt/.md/.csv/.json → Text Editor\n- .jpg/.png/.gif/.webp/.svg → Image Viewer\n- .mp4/.webm/.ogv → Video Player\n- .mp3/.wav/.ogg/.flac → Audio Player\n- .html → VS Code with preview\n\n## VS Code keyboard shortcuts\n- Ctrl+S: Save\n- Ctrl+R or F5: Run code\n- Ctrl+`: Toggle terminal\n- Ctrl+N: New file\n- Ctrl+O: Open file'},
    '/Documents/todo.txt':            {type:'file',icon:'file_txt',content:'TODO\n────\n[x] Window manager\n[x] Virtual FS\n[x] Terminal\n[x] Wallpaper themes\n[x] Lock screen\n[x] Media apps\n[x] Save dialog\n[x] File drag & drop\n[x] Interactable settings\n[x] Public folder sync via manifest.json\n[x] VS Code fully functional\n[x] Multi-tab text editor\n[x] SVG icon system\n[x] Profile picture\n[ ] More wallpapers\n[ ] World domination'},
    '/Documents/notes.txt':           {type:'file',icon:'file_txt',content:'Quick Notes\n──────────\n• Coffee\n• Ship the OS\n• Sleep 8 hours\n• Drop files to import them!\n• Or use manifest.json for permanent files\n• Profit'},
    '/Downloads/data.csv':            {type:'file',icon:'file_txt',content:'id,name,score\n1,Alice,98\n2,Bob,76\n3,Carol,88\n4,Dave,55\n5,Eve,100'},
  };
}

// Helper: set a file at an absolute FS path, creating parent dirs as needed
function fsPatch(path, node){
  const parts=path.replace(/^\/+/,'').split('/').filter(Boolean);
  const fname=parts.pop();
  let cur=FS['/'];
  for(const seg of parts){
    if(!cur.children[seg]) cur.children[seg]={type:'dir',children:{}};
    cur=cur.children[seg];
  }
  cur.children[fname]=node;
}

const FS={'/':{type:'dir',children:{
  'Desktop':{type:'dir',children:{
    'readme.txt':{type:'file',icon:'file_txt',content:'Welcome to HueBit OS v1.4.4!\n─────────────────────────\n\nDouble-click icons to open apps.\nRight-click for context menus.\nDrag files onto desktop to import them.\n\nVS Code is now fully functional:\n- File menu: New, Open, Save, Save As, Export\n- Edit: Copy, Paste, Select All, Find\n- View: Toggle Sidebar, Toggle Terminal\n- Run: ▶ Run button executes code\n- Terminal: interactive with run/clear/help\n- Explorer: browse and open FS files\n\nAudio files need to be listed in manifest.json.\n\nTerminal: type "help"\nEnjoy! ✨'},
    'changes_log.txt':{type:'file',icon:'file_txt',content:CHANGELOG},
  }},
  'Documents':{type:'dir',children:{
    'Projects':{type:'dir',children:{
      'dev-notes.txt':{type:'file',icon:'file_txt',content:'# HueBit OS Dev Notes\n\nStack: HTML5, CSS3, Vanilla JS\nNo frameworks. No dependencies.\nGitHub Pages compatible.\n\n## File routing by extension\n- .txt/.md/.csv/.json → Text Editor\n- .jpg/.png/.gif/.webp/.svg → Image Viewer\n- .mp4/.webm/.ogv → Video Player\n- .mp3/.wav/.ogg/.flac → Audio Player\n- .html → VS Code with preview\n\n## VS Code keyboard shortcuts\n- Ctrl+S: Save\n- Ctrl+R or F5: Run code\n- Ctrl+`: Toggle terminal\n- Ctrl+N: New file\n- Ctrl+O: Open file'}
    }},
    'todo.txt':{type:'file',icon:'file_txt',content:'TODO\n────\n[x] Window manager\n[x] Virtual FS\n[x] Terminal\n[x] Wallpaper themes\n[x] Lock screen\n[x] Media apps\n[x] Save dialog\n[x] File drag & drop\n[x] Interactable settings\n[x] Public folder sync via manifest.json\n[x] VS Code fully functional\n[ ] More wallpapers\n[ ] World domination 🌍'},
    'notes.txt':{type:'file',icon:'file_txt',content:'Quick Notes\n──────────\n• Coffee ☕\n• Ship the OS\n• Sleep 8 hours\n• Drop files to import them!\n• Or use manifest.json for permanent files\n• Profit'},
  }},
  'Downloads':{type:'dir',children:{'data.csv':{type:'file',icon:'file_txt',content:'id,name,score\n1,Alice,98\n2,Bob,76\n3,Carol,88\n4,Dave,55\n5,Eve,100'}}},
  'Pictures':{type:'dir',children:{}},
  'Music':{type:'dir',children:{}},
  'Videos':{type:'dir',children:{}},
  'Trash':{type:'dir',children:{}},
}}};

function fsGet(path){if(!path||path==='/')return FS['/'];const parts=path.replace(/^\/+/,'').split('/').filter(Boolean);let n=FS['/'];for(const p of parts){if(!n?.children?.[p])return null;n=n.children[p];}return n;}

const IMG_EXT=['jpg','jpeg','png','gif','webp','bmp','svg'];
const VID_EXT=['mp4','webm','ogv','mov'];
const AUD_EXT=['mp3','wav','ogg','flac','aac','m4a'];
const TXT_EXT=['txt','md','csv','json','js','css','html','py','sh','xml','log'];

function extIcon(ext){if(IMG_EXT.includes(ext))return'file_img';if(VID_EXT.includes(ext))return'file_video';if(AUD_EXT.includes(ext))return'file_music';if(TXT_EXT.includes(ext))return'file_txt';return'file_bin';}

async function loadManifest(){try{const res=await fetch('./public/manifest.json');if(!res.ok)return;const manifest=await res.json();const folders=Object.keys(manifest).filter(k=>k!=='_readme');let loaded=0;for(const folder of folders){const files=manifest[folder];if(!Array.isArray(files)||!files.length)continue;const folderNode=fsGet('/'+folder);if(!folderNode?.children)continue;for(const filename of files){if(folderNode.children[filename])continue;const ext=filename.split('.').pop().toLowerCase();const url=`./public/${folder}/${filename}`;if(TXT_EXT.includes(ext)){try{const r=await fetch(url);if(r.ok){const content=await r.text();folderNode.children[filename]={type:'file',icon:'file_txt',content};loaded++;}}catch(e){}}else{folderNode.children[filename]={type:'file',icon:extIcon(ext),blobUrl:url,content:null};if(folder==='Desktop'&&AUD_EXT.includes(ext)){const mNode=fsGet('/Music');if(mNode?.children&&!mNode.children[filename]){mNode.children[filename]={type:'file',icon:'file_music',blobUrl:url,content:null};}}loaded++;}}}if(loaded>0){renderDesktopFsIcons();}}catch(e){}}

