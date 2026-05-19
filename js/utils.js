// ── Theme (dark mode) ────────────────────────
(function() {
  try {
    const t = localStorage.getItem('tf-theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  // cycle: auto → opposite of system → other → auto
  let next;
  if (!cur) next = mq ? 'light' : 'dark';
  else if (cur === 'dark') next = 'light';
  else next = 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('tf-theme', next); } catch (e) {}
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

// ── Chart utility ────────────────────────────
function drawLineChart(id, vals, labs, color) {
  color = color || '#2D3FE0';
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = 120;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 4, r: 4, t: 8, b: 22 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  const range = max - min || 1;
  const px = i => pad.l + (i / (vals.length - 1)) * cW;
  const py = v => pad.t + cH - ((v - min) / range) * cH;

  // grid
  ctx.strokeStyle = 'rgba(127,127,127,0.08)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad.t + (cH / 3) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }

  // fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, H);
  grad.addColorStop(0, color + '22');
  grad.addColorStop(1, color + '00');
  ctx.beginPath();
  ctx.moveTo(px(0), py(vals[0]));
  for (let i = 1; i < vals.length; i++) ctx.lineTo(px(i), py(vals[i]));
  ctx.lineTo(px(vals.length - 1), H - pad.b);
  ctx.lineTo(px(0), H - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(px(0), py(vals[0]));
  for (let i = 1; i < vals.length; i++) ctx.lineTo(px(i), py(vals[i]));
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();

  // last dot
  const lx = px(vals.length - 1), ly = py(vals[vals.length - 1]);
  ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();

  // x labels
  ctx.fillStyle = '#888'; ctx.font = '10px "IBM Plex Sans Thai",sans-serif'; ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(labs.length / 5));
  for (let i = 0; i < labs.length; i += step) ctx.fillText(labs[i], px(i), H - 5);
}

// ── Number format ────────────────────────────
function fmt(n, d) {
  if (d == null) d = 2;
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ── Tab switch ───────────────────────────────
function switchTab(btn, fn) {
  btn.closest('.tab-row').querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fn();
}

// ── Share ────────────────────────────────────
function shareTool(title) {
  const url = location.href;
  title = title || document.title;
  if (navigator.share) {
    navigator.share({ title: title, url: url }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function () {
      const btn = document.getElementById('shareBtn');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = '✓ คัดลอกแล้ว';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 1500);
      }
    });
  } else {
    prompt('คัดลอกลิงก์นี้:', url);
  }
}

// ── Nav inject (with dark mode toggle + share) ───
function injectNav(active) {
  const links = [
    ['index.html', 'หน้าหลัก'],
    ['gold.html', '💛 ทอง'],
    ['oil.html', '⛽ น้ำมัน'],
    ['crypto.html', '₿ คริปโต'],
    ['fx.html', '💱 แลกเงิน'],
    ['electricity.html', '⚡ ค่าไฟ'],
    ['solar.html', '☀️ โซล่า'],
    ['dca.html', '📊 DCA'],
    ['compound.html', '🌱 ทบต้น'],
    ['savings.html', '🏦 เงินฝาก'],
    ['tax.html', '🧾 ภาษี'],
    ['salary.html', '💼 เงินเดือน'],
    ['mortgage.html', '🏠 ผ่อนบ้าน'],
    ['carloan.html', '🚙 ผ่อนรถ'],
    ['travel.html', '🚗 เดินทาง'],
    ['bmi.html', '⚖️ BMI'],
  ];
  const themeNow = document.documentElement.getAttribute('data-theme');
  const themeIcon = themeNow === 'dark' ? '☀️' : '🌙';
  const html =
    '<nav class="nav"><div class="nav-inner">' +
    '<a href="index.html" class="nav-brand">ThaiFinance</a>' +
    '<div class="nav-sep"></div>' +
    '<div class="nav-links">' +
    links.map(function ([href, label]) {
      return '<a href="' + href + '" class="nav-link' + (href === active ? ' active' : '') + '">' + label + '</a>';
    }).join('') +
    '</div>' +
    '<button class="theme-toggle" id="themeBtn" onclick="toggleTheme()" aria-label="สลับธีมมืด/สว่าง">' + themeIcon + '</button>' +
    '</div></nav>';
  document.body.insertAdjacentHTML('afterbegin', html);
}

// ── Sticky bottom ad (mobile) — show after 6s, dismissible ───
function setupStickyAd() {
  if (window.innerWidth >= 720) return;
  if (localStorage.getItem('tf-sticky-dismiss')) return;
  const ad = document.getElementById('stickyAd');
  if (!ad) return;
  setTimeout(function () { ad.classList.add('show'); }, 6000);
}
function closeStickyAd() {
  const ad = document.getElementById('stickyAd');
  if (ad) ad.classList.remove('show');
  try { localStorage.setItem('tf-sticky-dismiss', Date.now()); } catch (e) {}
}

// ── Service Worker register ──────────────────
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
