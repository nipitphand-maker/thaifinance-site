// ── Chart utility ────────────────────────────
function drawLineChart(id, vals, labs, color='#2D3FE0') {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const dpr = window.devicePixelRatio||1;
  const W = canvas.offsetWidth, H = 120;
  canvas.width = W*dpr; canvas.height = H*dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);

  const pad = {l:4,r:4,t:8,b:22};
  const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max-min||1;
  const px = i => pad.l+(i/(vals.length-1))*cW;
  const py = v => pad.t+cH-((v-min)/range)*cH;

  // subtle grid
  ctx.strokeStyle='rgba(0,0,0,0.04)'; ctx.lineWidth=1;
  for(let i=0;i<=3;i++){
    const y=pad.t+(cH/3)*i;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
  }

  // fill
  const grad = ctx.createLinearGradient(0,pad.t,0,H);
  grad.addColorStop(0, color+'22');
  grad.addColorStop(1, color+'00');
  ctx.beginPath();
  ctx.moveTo(px(0),py(vals[0]));
  for(let i=1;i<vals.length;i++) ctx.lineTo(px(i),py(vals[i]));
  ctx.lineTo(px(vals.length-1),H-pad.b);
  ctx.lineTo(px(0),H-pad.b);
  ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(px(0),py(vals[0]));
  for(let i=1;i<vals.length;i++) ctx.lineTo(px(i),py(vals[i]));
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();

  // last dot
  const lx=px(vals.length-1), ly=py(vals[vals.length-1]);
  ctx.beginPath(); ctx.arc(lx,ly,3,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();

  // x labels
  ctx.fillStyle='#888'; ctx.font=`10px "IBM Plex Sans Thai",sans-serif`; ctx.textAlign='center';
  const step=Math.max(1,Math.floor(labs.length/5));
  for(let i=0;i<labs.length;i+=step) ctx.fillText(labs[i],px(i),H-5);
}

// ── Number format ────────────────────────────
function fmt(n, d=2) {
  return Number(n).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
}

// ── Tab switch ───────────────────────────────
function switchTab(btn, fn) {
  btn.closest('.tab-row').querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  fn();
}

// ── Nav inject ───────────────────────────────
function injectNav(active) {
  const links = [
    ['index.html','หน้าหลัก'],
    ['gold.html','💛 ทอง'],
    ['oil.html','⛽ น้ำมัน'],
    ['electricity.html','⚡ ค่าไฟ'],
    ['solar.html','☀️ โซล่า'],
    ['crypto.html','₿ คริปโต'],
    ['dca.html','📊 DCA'],
    ['savings.html','🏦 เงินฝาก'],
    ['travel.html','🚗 เดินทาง'],
    ['tax.html','🧾 ภาษี'],
    ['mortgage.html','🏠 ผ่อนบ้าน'],
  ];
  const html = `<nav class="nav"><div class="nav-inner">
    <a href="index.html" class="nav-brand">ThaiFinance</a>
    <div class="nav-sep"></div>
    <div class="nav-links">
      ${links.map(([href,label])=>`<a href="${href}" class="nav-link${href===active?' active':''}">${label}</a>`).join('')}
    </div>
  </div></nav>`;
  document.body.insertAdjacentHTML('afterbegin', html);
}
