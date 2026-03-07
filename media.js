// ── IMAGE VIEWER ─────────────────────────────────────────────────
function buildImgViewer(opts){
  const src=opts?.src||'',fn=opts?.filename||'image';
  const content=`<div class="imgv-wrap"><div class="imgv-toolbar"><button class="imgv-btn" id="iv-zin" title="Zoom In">+</button><button class="imgv-btn" id="iv-zout" title="Zoom Out">−</button><button class="imgv-btn" id="iv-fit" title="Fit">⊡</button><button class="imgv-btn" id="iv-full" title="1:1">1:1</button><span class="imgv-name">${fn}</span><span class="imgv-zoom" id="iv-zpct">100%</span></div><div class="imgv-stage" id="iv-stage"><img id="iv-img" src="${src}" alt="${fn}" draggable="false"><div class="imgv-err" id="iv-err" style="display:none">Could not load image</div></div></div>`;
  function onMount(win){const img=win.querySelector('#iv-img'),stage=win.querySelector('#iv-stage'),zpct=win.querySelector('#iv-zpct'),err=win.querySelector('#iv-err');let scale=1,ox=0,oy=0,dragging=false,sx=0,sy=0;img.onerror=()=>{img.style.display='none';err.style.display='block';};const apply=()=>{img.style.transform=`translate(${ox}px,${oy}px)scale(${scale})`;zpct.textContent=Math.round(scale*100)+'%';};const fit=()=>{scale=1;ox=0;oy=0;apply();};win.querySelector('#iv-zin').onclick=()=>{scale=Math.min(scale*1.25,10);apply();};win.querySelector('#iv-zout').onclick=()=>{scale=Math.max(scale*.8,.05);apply();};win.querySelector('#iv-fit').onclick=fit;win.querySelector('#iv-full').onclick=()=>{scale=1;apply();};stage.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.05,Math.min(10,scale*(e.deltaY<0?1.12:.9)));apply();},{passive:false});stage.addEventListener('mousedown',e=>{dragging=true;sx=e.clientX-ox;sy=e.clientY-oy;});document.addEventListener('mousemove',e=>{if(!dragging)return;ox=e.clientX-sx;oy=e.clientY-sy;apply();});document.addEventListener('mouseup',()=>dragging=false);}
  return{content,onMount};
}


// ── VIDEO PLAYER ─────────────────────────────────────────────────
function buildVidPlayer(opts){
  const src=opts?.src||'',fn=opts?.filename||'video';
  const content=`<div class="vid-wrap"><div class="vid-stage"><video id="vp-vid" src="${src}"></video></div><div class="vid-controls"><div class="vid-progress" id="vp-prog"><div class="vid-progress-fill" id="vp-fill" style="width:0%"></div></div><div class="vid-btns"><button class="vid-btn" id="vp-rew">⏮</button><button class="vid-btn" id="vp-play">▶</button><button class="vid-btn" id="vp-fwd">⏭</button><button class="vid-btn" id="vp-mute" style="font-size:0;display:flex;align-items:center;justify-content:center"></button><span class="vid-time" id="vp-time">0:00 / 0:00</span></div></div></div>`;
  function onMount(win){const vid=win.querySelector('#vp-vid'),pb=win.querySelector('#vp-play'),mb=win.querySelector('#vp-mute');const fill=win.querySelector('#vp-fill'),timeEl=win.querySelector('#vp-time'),prog=win.querySelector('#vp-prog');const fmt=s=>{const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec;};vid.onerror=()=>{win.querySelector('.vid-stage').innerHTML=`<div class="vid-err">Could not load video</div>`;};vid.addEventListener('timeupdate',()=>{if(!vid.duration)return;fill.style.width=(vid.currentTime/vid.duration*100)+'%';timeEl.textContent=fmt(vid.currentTime)+' / '+fmt(vid.duration);});vid.addEventListener('play',()=>pb.textContent='⏸');vid.addEventListener('pause',()=>pb.textContent='▶');vid.addEventListener('ended',()=>pb.textContent='▶');pb.onclick=()=>vid.paused?vid.play():vid.pause();mb.onclick=()=>{vid.muted=!vid.muted;mb.innerHTML=vid.muted?SI.volMute:SI.volHigh;};win.querySelector('#vp-rew').onclick=()=>vid.currentTime=0;win.querySelector('#vp-fwd').onclick=()=>vid.currentTime=Math.min(vid.duration||0,vid.currentTime+10);prog.onclick=e=>{if(!vid.duration)return;const r=prog.getBoundingClientRect();vid.currentTime=((e.clientX-r.left)/r.width)*vid.duration;};win.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();pb.click();}else if(e.key==='ArrowRight')vid.currentTime+=5;else if(e.key==='ArrowLeft')vid.currentTime-=5;});}
  return{content,onMount};
}

// ── SVG ICON STRINGS (replaces emoji in Audio Player, Explorer, VS Code) ──

// ── AUDIO PLAYER ─────────────────────────────────────────────────
function buildAudPlayer(opts){
  const src=opts?.src||'',fn=opts?.filename||'audio',title=fn.replace(/\.[^.]+$/,'');
  const noFile=!src;
  const content=`<div class="aud-wrap"><div class="aud-art" id="ap-art" style="color:rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center">${SI.musicNote}</div><div class="aud-title" id="ap-title">${noFile?'No file loaded':title}</div><div class="aud-sub" id="ap-sub">${noFile?'Drop a file or click Open':'Audio Player'}</div><div class="aud-prog-wrap"><div class="aud-prog" id="ap-prog"><div class="aud-prog-fill" id="ap-fill" style="width:0%"></div></div><div class="aud-times"><span id="ap-cur">0:00</span><span id="ap-dur">0:00</span></div></div><div class="aud-btns"><button class="aud-btn" id="ap-rew" title="Restart">${SI.skipBack}</button><button class="aud-btn main" id="ap-play" title="Play / Pause">${SI.play}</button><button class="aud-btn" id="ap-fwd" title="Skip +10s">${SI.skipFwd}</button></div><div class="aud-vol-row"><span class="aud-vol-ico" style="display:flex;align-items:center">${SI.volLow}</span><input type="range" class="hb-range" id="ap-vol" min="0" max="1" step="0.02" value="1" style="flex:1"><span class="aud-vol-ico" style="display:flex;align-items:center">${SI.volHigh}</span></div><button class="aud-btn" id="ap-open" style="margin-top:4px;padding:7px 18px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.75);font-size:12px;font-family:var(--font);cursor:pointer;width:100%;transition:background .13s" title="Open audio file">${SI.folderOpen}Open File</button><audio id="ap-aud"${src?' src="'+src+'"':''}></audio></div>`;
  function onMount(win){
    const aud=win.querySelector('#ap-aud'),art=win.querySelector('#ap-art'),pb=win.querySelector('#ap-play');
    const fill=win.querySelector('#ap-fill'),prog=win.querySelector('#ap-prog');
    const curEl=win.querySelector('#ap-cur'),durEl=win.querySelector('#ap-dur');
    const titleEl=win.querySelector('#ap-title'),subEl=win.querySelector('#ap-sub');
    const openBtn=win.querySelector('#ap-open');
    const fmt=s=>{const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec;};

    // ── load a new source into the player ──
    const loadSrc=(newSrc,newName)=>{
      aud.pause();aud.currentTime=0;fill.style.width='0%';curEl.textContent='0:00';durEl.textContent='0:00';
      pb.innerHTML=SI.play;art.classList.remove('playing');
      aud.src=newSrc;
      const t=newName.replace(/\.[^.]+$/,'');
      titleEl.textContent=t;subEl.textContent='Audio Player';
      aud.load();
    };

    // ── open file picker ──
    openBtn.addEventListener('click',()=>{
      const inp=document.createElement('input');inp.type='file';
      inp.accept='audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.weba';
      inp.onchange=e=>{
        const f=e.target.files[0];if(!f)return;
        const url=URL.createObjectURL(f);
        loadSrc(url,f.name);
        toast('','Audio',`Loaded "${f.name}"`);
      };
      inp.click();
    });

    // ── error handling ──
    aud.addEventListener('error',()=>{
      const codes={1:'Aborted',2:'Network error',3:'Decode error',4:'Source not supported'};
      const msg=codes[aud.error?.code]||'Unknown error';
      pb.innerHTML=SI.play;art.classList.remove('playing');
      toast('','Audio',`Playback failed: ${msg}. Try opening a different file.`);
    });

    aud.addEventListener('loadedmetadata',()=>durEl.textContent=fmt(aud.duration));
    aud.addEventListener('timeupdate',()=>{if(!aud.duration)return;fill.style.width=(aud.currentTime/aud.duration*100)+'%';curEl.textContent=fmt(aud.currentTime);});
    aud.addEventListener('play',()=>{pb.innerHTML=SI.pause;art.classList.add('playing');});
    aud.addEventListener('pause',()=>{pb.innerHTML=SI.play;art.classList.remove('playing');});
    aud.addEventListener('ended',()=>{pb.innerHTML=SI.play;art.classList.remove('playing');fill.style.width='0%';});

    // ── play / pause — properly handle the Promise ──
    pb.onclick=()=>{
      if(!aud.src||aud.src===location.href){openBtn.click();return;}
      if(aud.paused){
        const p=aud.play();
        if(p!==undefined){
          p.catch(err=>{
            pb.innerHTML=SI.play;art.classList.remove('playing');
            toast('','Audio','Playback blocked. Try clicking play again or open a file.');
          });
        }
      }else{aud.pause();}
    };

    win.querySelector('#ap-rew').onclick=()=>aud.currentTime=0;
    win.querySelector('#ap-fwd').onclick=()=>aud.currentTime=Math.min(aud.duration||0,aud.currentTime+10);
    prog.onclick=e=>{if(!aud.duration)return;const r=prog.getBoundingClientRect();aud.currentTime=((e.clientX-r.left)/r.width)*aud.duration;};

    const volSlider=win.querySelector('#ap-vol');
    updateRangeGradient(volSlider,0,1);
    volSlider.oninput=()=>{aud.volume=parseFloat(volSlider.value);updateRangeGradient(volSlider,0,1);};

    win.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();pb.click();}});
  }
  return{content,onMount};
}

