import {playChime} from './audio.js';

const canvas = document.getElementById('traceCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');
const finishBtn = document.getElementById('finishBtn');
const reward = document.getElementById('reward');
const starsWrap = document.getElementById('stars');
const continueBtn = document.getElementById('continueBtn');

// Dynamic stroke color (default: orange theme)
let currentStrokeColor = '#FF6F00';

function initColorPalette(){
  const palette = document.getElementById('colorPalette');
  const toggle = document.getElementById('paletteToggle');
  const panel = document.getElementById('palettePanel');
  const colorButtons = Array.from(document.querySelectorAll('.color-btn'));
  if(!palette || !toggle || !panel || !colorButtons.length) return;

  // helper to animate buttons into a circular ring around the toggle
  function animateRadial(open){
    const rect = toggle.getBoundingClientRect();
    const centerX = rect.left + rect.width/2;
    const centerY = rect.top + rect.height/2;
    const btnW = colorButtons[0].getBoundingClientRect().width || 44;
    const btnH = colorButtons[0].getBoundingClientRect().height || 44;
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const margin = Math.max(btnW, btnH) / 2 + 8; // safe margin so buttons stay visible

    const n = colorButtons.length;

    // extra gap between buttons (px) to avoid 'dempet' look — slightly reduced so buttons sit closer
    const extraGap = 8;
    // compute minimum radius so buttons don't overlap each other (conservative)
    const minRadius = Math.max(40, (btnW + extraGap) / (2 * Math.sin(Math.PI / Math.max(n,2)))) + 6;
    // preferred radius relative to toggle size — smaller so buttons appear closer to toggle
    const preferredRadius = Math.max(56, rect.width * 1.05);
    let radius = window.matchMedia('(max-width:520px)').matches ? Math.max(minRadius, rect.width + 8) : Math.max(minRadius, preferredRadius);

    // decide arc range for bottom-right placement: prefer up-and-left expansion
    let arcStartDeg = -180; let arcEndDeg = -60; // default: fan mostly upward/left
    // If toggle is near bottom-right, fan upward-left (compact quarter ring)
    if(centerY > vh * 0.6 && centerX > vw * 0.6){ arcStartDeg = -200; arcEndDeg = -80; }
    // If near bottom-left, fan upward-right
    else if(centerY > vh * 0.6 && centerX < vw * 0.4){ arcStartDeg = -100; arcEndDeg = 0; }
    // If near top-right (fallback), fan downward-left
    else if(centerY < vh * 0.3 && centerX > vw * 0.75){ arcStartDeg = 90; arcEndDeg = 180; }
    else if(centerX > vw * 0.75) { arcStartDeg = -150; arcEndDeg = -30; }
    else if(centerX < vw * 0.25) { arcStartDeg = -30; arcEndDeg = 30; }

    // ensure spacing between buttons based on chosen arc — compute required radius to avoid overlap
    const arcSpanRad = (arcEndDeg - arcStartDeg) * Math.PI / 180;
    const deltaAngle = (n > 1) ? (arcSpanRad / (n - 1)) : arcSpanRad;
    if(deltaAngle > 0){
      const requiredRadius = (btnW + extraGap) / (2 * Math.sin(Math.max(0.001, deltaAngle / 2)));
      radius = Math.max(radius, requiredRadius);
    }

    // ensure radius fits in viewport; reduce radius until all button positions are inside viewport
    const fits = (r, startDeg, endDeg)=>{
      for(let i=0;i<n;i++){
        const t = n === 1 ? 0.5 : i/(n-1);
        const deg = startDeg + (endDeg - startDeg) * t;
        const rad = deg * Math.PI / 180;
        const x = centerX + Math.cos(rad) * r;
        const y = centerY + Math.sin(rad) * r;
        if(x < margin || x > vw - margin || y < margin || y > vh - margin) return false;
      }
      return true;
    };

    let attempts = 0;
    while(!fits(radius, arcStartDeg, arcEndDeg) && attempts < 6){ radius = Math.max(minRadius, radius * 0.8); attempts++; }

    // compute evenly spaced angles across chosen arc
    const angles = [];
    if(n === 1){ angles.push((arcStartDeg + arcEndDeg)/2); }
    else {
      for(let i=0;i<n;i++){
        const t = n === 1 ? 0.5 : i/(n-1);
        angles.push(arcStartDeg + (arcEndDeg - arcStartDeg) * t);
      }
    }

    colorButtons.forEach((btn, i)=>{
      btn.classList.add('radial');
      btn.style.position = 'fixed';
      btn.style.left = (centerX - btnW/2) + 'px';
      btn.style.top = (centerY - btnH/2) + 'px';
      btn.style.zIndex = 220;

      const angleDeg = angles[i];
      const angle = angleDeg * Math.PI / 180;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      const delay = i * 40;
      btn.style.transitionDelay = (open ? delay : (n - i) * 20) + 'ms';

      requestAnimationFrame(()=>{
        if(open){
          btn.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
          btn.style.opacity = '1';
        } else {
          btn.style.transform = `translate(0px, 0px) scale(0.95)`;
          btn.style.opacity = '0';
        }
      });

      const cleanup = (ev)=>{
        if(!open){
          btn.style.position = '';
          btn.style.left = '';
          btn.style.top = '';
          btn.style.zIndex = '';
          btn.classList.remove('radial');
          btn.style.transitionDelay = '';
          btn.style.transform = '';
          btn.style.opacity = '';
        }
        btn.removeEventListener('transitionend', cleanup);
      };
      btn.addEventListener('transitionend', cleanup);
    });
  }

  toggle.addEventListener('click', (e)=>{
    e.stopPropagation();
    const open = palette.classList.toggle('open');
    palette.setAttribute('aria-hidden', String(!open));
    panel.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    // play a single spin animation on the icon
    toggle.classList.add('spinning');
    setTimeout(()=> toggle.classList.remove('spinning'), 650);

    // animate color buttons in a circle around the toggle
    animateRadial(open);
  });

  colorButtons.forEach((b, idx)=>{
    // store index for fallback and accessibility
    b.dataset.index = idx;
    b.addEventListener('click', (e)=>{
      e.stopPropagation();
      colorButtons.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const col = b.dataset.color; if(col){ currentStrokeColor = col; }
      // close after picking color (nice for kids)
      const paletteEl = document.getElementById('colorPalette');
      paletteEl.classList.remove('open'); paletteEl.setAttribute('aria-hidden','true'); panel.setAttribute('aria-hidden','true'); toggle.setAttribute('aria-expanded','false');
      // animate back
      animateRadial(false);
    });
  });

  // close when clicking outside
  document.addEventListener('click', (e)=>{ if(palette && !palette.contains(e.target)) { palette.classList.remove('open'); palette.setAttribute('aria-hidden','true'); panel.setAttribute('aria-hidden','true'); toggle.setAttribute('aria-expanded','false'); toggle.classList.remove('spinning'); animateRadial(false); } });
  document.addEventListener('keydown',(e)=>{ if(e.key === 'Escape'){ palette.classList.remove('open'); palette.setAttribute('aria-hidden','true'); panel.setAttribute('aria-hidden','true'); toggle.setAttribute('aria-expanded','false'); toggle.classList.remove('spinning'); animateRadial(false); } });

  // reposition if open and window resizes
  window.addEventListener('resize', ()=>{ if(palette.classList.contains('open')) animateRadial(true); });
}

let drawing = false;
let lastPoint = null;
let paths = []; // store strokes
let totalDrawnLength = 0;
let lastDrawTime = 0;
let autoFinishTimeout = null;

let selectedShape = 'vertical';
// Per-shape progress thresholds (px of stroke length) — ordered by difficulty (lower = easier)
const shapeThresholds = { vertical: 200, horizontal: 200, circle: 350, wave: 600, square: 700, triangle: 800, spiral: 900, maze: 1000 };
function getThreshold(){ return shapeThresholds[selectedShape] || 800; }

function initShapeSelector(){
  const buttons = document.querySelectorAll('.shape-btn');
  if(!buttons) return;
  buttons.forEach(b=>{
    b.addEventListener('click', ()=> {
      buttons.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      selectedShape = b.dataset.shape;
      // reset when choosing new shape
      resetBtn.click();
      drawTemplate();
    });
  });
  const defaultBtn = document.querySelector('.shape-btn[data-shape="vertical"]');
  if(defaultBtn) defaultBtn.classList.add('active');
}

// Pixel ratio scaling
function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round((rect.height || 600) * dpr);
  ctx.scale(dpr, dpr);
  drawTemplate();
  redrawStrokes();
}

function drawTemplate(){
  // Clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const w = canvas.clientWidth;
  const cx = w/2;

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#FFA726';

  if(selectedShape === 'vertical'){
    // simple vertical line centered
    drawDottedLine(cx, 80, cx, 420, 18);
  } else if(selectedShape === 'horizontal'){
    // simple horizontal line centered
    drawDottedLine(cx - 240, 240, cx + 240, 240, 18);
  } else if(selectedShape === 'wave'){
    // horizontal sine wave across canvas
    const wvW = Math.min(600, canvas.clientWidth - 80);
    const startX = cx - wvW/2; const startY = 260;
    const samples = 80;
    for(let i=0;i<=samples;i++){
      const t = i/samples;
      const x = startX + t*wvW;
      const y = startY + Math.sin(t*Math.PI*4) * 60; // 4 waves
      ctx.beginPath(); ctx.fillStyle = '#2C2C2C'; ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    }
  } else if(selectedShape === 'circle'){
    const radius = 120;
    const cy = 240;
    const steps = 40;
    for(let i=0;i<steps;i++){
      const t = i/steps;
      const a = t*Math.PI*2;
      const x = cx + Math.cos(a)*radius;
      const y = cy + Math.sin(a)*radius;
      ctx.beginPath(); ctx.fillStyle = '#2C2C2C'; ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    }
  } else if(selectedShape === 'square'){
    const size = 240; const left = cx - size/2; const top = 120;
    drawDottedLine(left, top, left+size, top, 18);
    drawDottedLine(left+size, top, left+size, top+size, 18);
    drawDottedLine(left+size, top+size, left, top+size, 18);
    drawDottedLine(left, top+size, left, top, 18);
  } else if(selectedShape === 'triangle'){
    const topY = 110; const baseY = 380; const apexX = cx;
    const leftX = cx - 160; const rightX = cx + 160;
    drawDottedLine(leftX, baseY, apexX, topY, 14);
    drawDottedLine(rightX, baseY, apexX, topY, 14);
    drawDottedLine(leftX, baseY, rightX, baseY, 14);
  } else if(selectedShape === 'spiral'){
    const steps = 120; const centerY = 240; const centerX = cx; let maxR = 130;
    for(let i=0;i<steps;i++){
      const t = i/steps; const a = t*8*Math.PI; const r = t*maxR;
      const x = centerX + Math.cos(a)*r; const y = centerY + Math.sin(a)*r;
      ctx.beginPath(); ctx.fillStyle = '#2C2C2C'; ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
    }
  } else if(selectedShape === 'maze'){
    // Simple winding maze-like path (not full maze algorithm)
    const left = cx - 180; const top = 120; const w = 360; const h = 260;
    // outer border segments
    drawDottedLine(left, top, left+w, top, 12);
    drawDottedLine(left+w, top, left+w, top+h, 12);
    drawDottedLine(left+w, top+h, left, top+h, 12);
    // inner simple corridors
    drawDottedLine(left+40, top, left+40, top+180, 12);
    drawDottedLine(left+40, top+180, left+220, top+180, 12);
    drawDottedLine(left+220, top+180, left+220, top+60, 12);
    drawDottedLine(left+220, top+60, left+120, top+60, 12);
    drawDottedLine(left+120, top+60, left+120, top+220, 12);
  }
}

function drawDottedLine(x1,y1,x2,y2,gap){
  const dx = x2-x1; const dy = y2-y1;
  const dist = Math.hypot(dx,dy);
  const steps = Math.floor(dist / gap);
  for(let i=0;i<=steps;i++){
    const t = i/steps;
    const x = x1 + dx*t;
    const y = y1 + dy*t;
    ctx.beginPath();
    ctx.fillStyle = '#2C2C2C';
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();
  }
}

function pointerPos(e){
  const rect = canvas.getBoundingClientRect();
  return {x: e.clientX - rect.left, y: e.clientY - rect.top};
}

canvas.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  drawing = true; lastPoint = pointerPos(e);
  paths.push([lastPoint]);
});

canvas.addEventListener('pointermove', (e)=>{
  if(!drawing) return;
  const p = pointerPos(e);
  const prev = lastPoint;

  const dx = p.x - prev.x;
  const dy = p.y - prev.y;
  const dist = Math.hypot(dx, dy);

  ctx.strokeStyle = currentStrokeColor;
  ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // If movement is fast (large distance between events), interpolate points to avoid gaps
  const segmentSize = 4; // px per interpolated segment
  if(dist > segmentSize){
    const steps = Math.ceil(dist / segmentSize);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    for(let i=1;i<=steps;i++){
      const t = i/steps;
      const x = prev.x + dx * t;
      const y = prev.y + dy * t;
      ctx.lineTo(x, y);
      // store intermediate points for stroke replay
      paths[paths.length-1].push({x,y});
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    paths[paths.length-1].push(p);
  }

  totalDrawnLength += dist;
  lastPoint = p;
  lastDrawTime = Date.now();
  scheduleAutoFinish();
  if(totalDrawnLength >= getThreshold()) finishBtn.disabled = false;
});

canvas.addEventListener('pointerup', (e)=>{
  drawing = false;
  lastPoint = null;
  lastDrawTime = Date.now();
  scheduleAutoFinish();
});

function redrawStrokes(){
  // re-draw strokes over template
  ctx.lineCap = 'round';
  paths.forEach(stk => {
    if(stk.length<2) return;
    ctx.strokeStyle = currentStrokeColor; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(stk[0].x, stk[0].y);
    for(let i=1;i<stk.length;i++){
      const p = stk[i]; const prev = stk[i-1];
      const midx = (prev.x + p.x)/2; const midy = (prev.y + p.y)/2;
      ctx.quadraticCurveTo(prev.x, prev.y, midx, midy);
    }
    ctx.stroke();
  });
}

// Jadwalkan auto-finish jika tidak ada aktivitas selama 2.5 detik
function scheduleAutoFinish() {
  clearTimeout(autoFinishTimeout);
  autoFinishTimeout = setTimeout(() => {
    if (!drawing && totalDrawnLength > 0) {
      finishBtn.click();
    }
  }, 2500);
}

resetBtn.addEventListener('click', ()=>{
  paths = []; totalDrawnLength = 0; finishBtn.disabled = true;
  lastDrawTime = Date.now();
  clearTimeout(autoFinishTimeout);
  drawTemplate();
});

finishBtn.addEventListener('click', ()=>{
  // Pastikan garis sudah cukup panjang sebelum memberi reward
  if (totalDrawnLength < getThreshold() * 0.8) {
    // Jika kurang dari 80% threshold, beri minimal 1 bintang karena sudah ada effort
    const fakeStars = Math.min(1, Math.floor(totalDrawnLength / getThreshold()));
    playReward(fakeStars);
  } else {
    // Trigger reward normal
    playReward();
  }
});

continueBtn.addEventListener('click', ()=>{
  reward.classList.add('hidden');
  reward.setAttribute('aria-hidden','true');

  // Advance to the next shape if available. If last shape, go back to level selection.
  const buttons = Array.from(document.querySelectorAll('.shape-btn'));
  const idx = buttons.findIndex(b => b.classList.contains('active'));
  if(idx >= 0 && idx < buttons.length - 1){
    // select next shape
    const next = buttons[idx + 1];
    next.click();
    // reset canvas and focus for immediate drawing
    setTimeout(()=>{
      resetBtn.click();
      if(!canvas.hasAttribute('tabindex')) canvas.setAttribute('tabindex','0');
      canvas.focus();
    }, 80);
  } else {
    // Completed the last shape — return to level selection
    window.location.href = 'level.html';
  }
});

// Hitung bintang berdasarkan kerapihan garis
function calculateStars() {
  if (paths.length === 0) return 0;

  // Hitung total panjang garis
  const totalLength = totalDrawnLength;
  const threshold = getThreshold();

  // Hitung coverage (berapa banyak template yang sudah di-cover)
  const coverage = Math.min(totalLength / threshold, 1);

  // Jika coverage kurang dari 40%, berarti belum cukup gambar
  if (coverage < 0.4) return 0;

  // Untuk garis vertikal dan horizontal yang sederhana, kriteria lebih longgar
  const isSimpleShape = selectedShape === 'vertical' || selectedShape === 'horizontal';

  // Hitung jumlah stroke (berapa banyak kali menel/tarik)
  const strokeCount = paths.length;

  // Hitung smoothness (kelincauan garis)
  let totalSpeedVariance = 0;
  let pointCount = 0;

  paths.forEach(stroke => {
    for (let i = 1; i < stroke.length; i++) {
      const dist = Math.hypot(
        stroke[i].x - stroke[i-1].x,
        stroke[i].y - stroke[i-1].y
      );
      const timeBetween = 1; // Asumsi sama interval
      const speed = dist / timeBetween;
      totalSpeedVariance += speed;
      pointCount++;
    }
  });

  const avgSpeed = totalSpeedVariance / pointCount;
  const speedTarget = 5; // Kecepatan ideal
  const smoothness = Math.max(0, 1 - Math.abs(avgSpeed - speedTarget) / speedTarget);

  // Hitung efficiency
  const avgStrokeLength = totalLength / strokeCount;
  const efficiencyScore = Math.min(avgStrokeLength / threshold, 1);

  // Hitung stroke penalty (terlalu banyak stroke buruk)
  const strokePenalty = Math.max(0, 1 - (strokeCount - 1) * 0.3);

  // Kombinasikan metrik dengan bobot berbeda
  let score;

  if (isSimpleShape) {
    // Bentuk sederhana: coverage + smoothness + sedikit efficiency
    score = (coverage * 0.5 + smoothness * 0.3 + efficiencyScore * 0.2);
  } else {
    // Bentuk kompleks: balance semuanya
    score = (coverage * 0.4 + smoothness * 0.3 + efficiencyScore * 0.2 + strokePenalty * 0.1);
  }

  // Debug log
  console.log(`Shape: ${selectedShape}, Coverage: ${coverage.toFixed(2)}, Strokes: ${strokeCount}, Smoothness: ${smoothness.toFixed(2)}, Efficiency: ${efficiencyScore.toFixed(2)}, Score: ${score.toFixed(2)}`);

  // Tentukan jumlah bintang dengan threshold yang lebih ketat
  if (score >= 0.85) return 3;
  if (score >= 0.65) return 2;
  if (score >= 0.45) return 1;
  return 0;
}

// Animasi bintang yang terisi bertahap
function animateStars(starCount) {
  starsWrap.innerHTML = '';

  // Buat 3 bintang
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    if (i < starCount) {
      // Untuk bintang yang terisi, tambahkan kelas filled
      star.classList.add('filled');
    }
    starsWrap.appendChild(star);
  }

  // Animasi muncul satu per satu
  for (let i = 0; i < starCount; i++) {
    setTimeout(() => {
      starsWrap.children[i].classList.add('show');
    }, 200 * i);
  }

  // Animasi pengisian untuk bintang yang terisi
  for (let i = 0; i < starCount; i++) {
    setTimeout(() => {
      const star = starsWrap.children[i];
      star.style.animation = 'fillStar 0.5s ease-out forwards';
    }, 200 * i + 300);
  }
}

function playReward(customStars = null){
  // Gunakan custom stars jika diberikan, hitung jika tidak
  const starCount = customStars !== null ? customStars : calculateStars();
  animateStars(starCount);

  reward.classList.remove('hidden');
  reward.setAttribute('aria-hidden','false');
  playChime();
}

// initial sizing: set canvas CSS height to keep ratio
function setup(){
  const rect = canvas.getBoundingClientRect();
  if(!rect.height) canvas.style.height = '480px';
  initShapeSelector();
  initColorPalette();
  window.addEventListener('resize', ()=>{ drawTemplate(); redrawStrokes(); });
  // Use CSS size-based redraw
  drawTemplate();
}

setup();
// If you want crisp canvas on high-dpr, we can call resize on load
window.addEventListener('load', ()=>{
  // wait a tick
  setTimeout(()=>{
    drawTemplate();
  },50);
});

// Support keyboard: allow Reset with R, Finish with Enter
window.addEventListener('keydown', (e)=>{
  if(e.key.toLowerCase()==='r') resetBtn.click();
  if(e.key==='Enter' && !finishBtn.disabled) finishBtn.click();
});