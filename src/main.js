import './styles.css';
import { cropPresets } from './config/crop-presets.js';
import { collectMetadata } from './modules/metadata-handler.js';
import { cropArea, drawCrop } from './modules/crop-engine.js';
import { makeExport } from './modules/exporter.js';

const state = { image: null, file: null, metadata: null, preset: cropPresets[0], zoom: 1, x: 0, y: 0, hideOthers: false, dragging: null };
const app = document.querySelector('#app');
const fmt = new Intl.NumberFormat('pt-BR');

function render() {
  const loaded = Boolean(state.image);
  app.innerHTML = `<main class="app">
    <header class="top"><div class="brand">Globo Crop <span>FERRAMENTA DE FOTO</span></div>
      <label class="load">${loaded ? 'Substituir foto' : 'Carregar fotografia'}<input id="file" type="file" accept="image/jpeg,.jpg,.jpeg" hidden></label>
      <div class="file">${loaded ? `${escapeHtml(state.file.name)} · ${state.image.naturalWidth} × ${state.image.naturalHeight} px` : 'Processamento 100% local — nenhuma imagem é enviada.'}</div>
    </header>
    <div class="workspace"><section class="stage-card">
      ${loaded ? `<div id="canvasWrap" class="canvas-wrap"><img id="photo" class="photo" src="${state.image.src}" alt="Fotografia carregada">${frames()}</div>
      <div class="toolbar"><button id="less" title="Reduzir zoom">−</button><strong class="zoom">Zoom ${Math.round(state.zoom * 100)}%</strong><button id="more" title="Aumentar zoom">+</button><button id="center">Centralizar</button><button id="toggle">${state.hideOthers ? 'Exibir molduras' : 'Ocultar outras molduras'}</button></div>` : `<div class="empty"><div><strong>Comece carregando um JPG</strong>Visualize e ajuste cortes para a capa sem sair do navegador.</div></div>`}
    </section><aside class="panel"><div class="eyebrow">Formatos de corte</div><h1>${loaded ? escapeHtml(state.preset.name) : 'Selecione uma fotografia'}</h1>
      <div class="presets">${cropPresets.map(p => `<button class="preset ${p.id === state.preset.id ? 'active' : ''}" data-preset="${p.id}" ${loaded ? '' : 'disabled'}><span>${p.name}<br><small>${p.width} × ${p.height} px</small></span>${p.provisional ? '<i class="tag">PROVISÓRIO</i>' : '<i class="tag">CONFIRMADO</i>'}</button>`).join('')}</div>
      ${loaded ? details() : '<p class="notice">Os formatos provisórios são apenas referências de teste e podem ser alterados em <code>src/config/crop-presets.js</code>.</p>'}
    </aside></div></main>`;
  bind(); if (loaded) requestAnimationFrame(positionFrames);
}

function details() { const area = currentArea(); const usable = area.width >= state.preset.width && area.height >= state.preset.height; return `<div class="details">
  <div class="line"><span>Saída</span><strong>${fmt.format(state.preset.width)} × ${fmt.format(state.preset.height)} px</strong></div>
  <div class="line"><span>Proporção</span><strong>${state.preset.ratio.toFixed(3)}:1</strong></div>
  <div class="line"><span>Original</span><strong>${state.image.naturalWidth} × ${state.image.naturalHeight} px</strong></div>
  <div class="quality ${usable ? '' : 'warn'}">${usable ? '✓ Resolução adequada para este corte.' : 'Atenção: o recorte será ampliado e poderá perder qualidade.'}</div>
  <div class="actions"><button class="preview" id="preview">Pré-visualizar corte</button><button class="download" id="download">Baixar JPG</button></div>
  <p class="notice">IPTC e XMP são reinseridos quando encontrados. EXIF técnico não é copiado, para não manter dimensões ou miniaturas incompatíveis após o recorte.</p></div>`; }

function frames() { return cropPresets.map(p => `<div class="frame ${p.id === state.preset.id ? 'active' : ''}" data-frame="${p.id}" ${state.hideOthers && p.id !== state.preset.id ? 'hidden' : ''}><label>${p.name} · ${p.width} × ${p.height}</label></div>`).join(''); }
function currentArea() { return cropArea(state.image.naturalWidth, state.image.naturalHeight, state.preset.ratio, state.zoom, state.x, state.y); }
function center() { const a = cropArea(state.image.naturalWidth, state.image.naturalHeight, state.preset.ratio, state.zoom, 0, 0); state.x = (state.image.naturalWidth - a.width) / 2; state.y = (state.image.naturalHeight - a.height) / 2; }
function positionFrames() {
  const wrap = document.querySelector('#canvasWrap'), photo = document.querySelector('#photo'); if (!wrap || !photo) return;
  const scale = Math.min(wrap.clientWidth / photo.naturalWidth, wrap.clientHeight / photo.naturalHeight); const drawnW = photo.naturalWidth * scale, drawnH = photo.naturalHeight * scale;
  const left = (wrap.clientWidth - drawnW) / 2, top = (wrap.clientHeight - drawnH) / 2; const active = currentArea(); const cx = active.x + active.width / 2, cy = active.y + active.height / 2;
  cropPresets.forEach(p => { const element = document.querySelector(`[data-frame="${p.id}"]`); if (!element) return; let a;
    if (p.id === state.preset.id) a = active; else { const width = Math.min(state.image.naturalWidth, state.image.naturalHeight * p.ratio) / state.zoom; const height = width / p.ratio; a = { width, height, x: Math.max(0, Math.min(state.image.naturalWidth-width, cx-width/2)), y: Math.max(0, Math.min(state.image.naturalHeight-height, cy-height/2)) }; }
    Object.assign(element.style,{ left:`${left+a.x*scale}px`,top:`${top+a.y*scale}px`,width:`${a.width*scale}px`,height:`${a.height*scale}px` });
  });
}
function bind() { document.querySelector('#file')?.addEventListener('change', loadFile); document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => selectPreset(b.dataset.preset))); document.querySelectorAll('[data-frame]').forEach(f => f.addEventListener('click', e => { e.stopPropagation(); selectPreset(f.dataset.frame); }));
  document.querySelector('#less')?.addEventListener('click',()=>setZoom(-.1)); document.querySelector('#more')?.addEventListener('click',()=>setZoom(.1)); document.querySelector('#center')?.addEventListener('click',()=>{center();render()}); document.querySelector('#toggle')?.addEventListener('click',()=>{state.hideOthers=!state.hideOthers;render()}); document.querySelector('#preview')?.addEventListener('click', preview); document.querySelector('#download')?.addEventListener('click', download);
  const wrap=document.querySelector('#canvasWrap'); wrap?.addEventListener('pointerdown',startDrag); window.addEventListener('resize',positionFrames,{once:true}); }
async function loadFile(event) { const file=event.target.files?.[0]; if(!file)return; if(!/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)){alert('Selecione um arquivo JPG válido.');return} if(file.size>100*1024*1024){alert('O arquivo excede o limite de 100 MB.');return} try { const buffer=await file.arrayBuffer(); const metadata=collectMetadata(buffer); const url=URL.createObjectURL(file); const image=new Image(); image.onload=()=>{ if(state.image?.src) URL.revokeObjectURL(state.image.src); state.image=image;state.file=file;state.metadata=metadata;state.zoom=1;center();render(); }; image.onerror=()=>{URL.revokeObjectURL(url);alert('Não foi possível decodificar esta fotografia.');}; image.src=url; } catch(error){alert(error.message || 'Falha ao ler a fotografia.')} }
function selectPreset(id){state.preset=cropPresets.find(p=>p.id===id);state.zoom=1;center();render()} function setZoom(delta){const before=currentArea();const cx=before.x+before.width/2,cy=before.y+before.height/2;state.zoom=Math.max(1,Math.min(4,+(state.zoom+delta).toFixed(2)));const after=currentArea();state.x=cx-after.width/2;state.y=cy-after.height/2;render()}
function startDrag(event){if(event.target.closest('.frame')&&!event.target.classList.contains('active'))return; const wrap=event.currentTarget;wrap.setPointerCapture(event.pointerId);state.dragging={x:event.clientX,y:event.clientY,ox:state.x,oy:state.y};wrap.classList.add('dragging');wrap.addEventListener('pointermove',drag);wrap.addEventListener('pointerup',endDrag,{once:true})} function drag(event){if(!state.dragging)return;const wrap=document.querySelector('#canvasWrap'),scale=Math.min(wrap.clientWidth/state.image.naturalWidth,wrap.clientHeight/state.image.naturalHeight);const area=currentArea();state.x=Math.max(0,Math.min(state.image.naturalWidth-area.width,state.dragging.ox-(event.clientX-state.dragging.x)/scale));state.y=Math.max(0,Math.min(state.image.naturalHeight-area.height,state.dragging.oy-(event.clientY-state.dragging.y)/scale));positionFrames()}function endDrag(event){event.currentTarget.classList.remove('dragging');state.dragging=null;render()}
async function output(){return makeExport(state.image,currentArea(),state.preset,state.metadata)} async function preview(){try{const result=await output();const bitmap=await createImageBitmap(result.blob);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);const modal=document.createElement('div');modal.className='modal';modal.innerHTML='<div class="modal-content"><div class="eyebrow">Pré-visualização · '+state.preset.width+' × '+state.preset.height+' px</div><button>Fechar</button></div>';modal.querySelector('.modal-content').prepend(canvas);modal.querySelector('button').onclick=()=>modal.remove();document.body.append(modal)}catch(e){alert('Falha ao gerar a pré-visualização: '+e.message)}} async function download(){try{const result=await output();const suffix=`_${state.preset.id}_${state.preset.width}x${state.preset.height}.jpg`;const name=state.file.name.replace(/\.[^.]+$/,'').replace(/[^a-z0-9._-]/gi,'-')+suffix;const url=URL.createObjectURL(result.blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if(!result.validation.complete)alert('O arquivo foi baixado, mas não foi possível validar todos os metadados editoriais.')}catch(e){alert('Falha ao exportar o JPG: '+e.message)}} function escapeHtml(value){return value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
render();
