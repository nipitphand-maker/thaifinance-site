// Cloudflare Worker — Gold Price Proxy (2-tier fallback)
// Primary:  https://api.chnwt.dev/thai-gold-api/latest  (JSON proxy ของ goldtraders.or.th)
// Fallback: https://xn--42cah7d0cxcvbbb9x.com/          (ราคาทอง.com — scrape HTML table)
//
// ทั้งสองแหล่งใช้ราคาประกาศของสมาคมค้าทองคำเป็น source เดียวกัน
// ตอบ JSON schema เดียวกันเสมอ frontend จึงไม่ต้องสนใจว่ามาจากแหล่งไหน

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800',
};

const parseNum = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

async function fetchPrimary() {
  const r = await fetch('https://api.chnwt.dev/thai-gold-api/latest', {
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  if (!r.ok) throw new Error(`chnwt ${r.status}`);
  const d = await r.json();
  if (d?.status !== 'success' || !d?.response?.price) throw new Error('chnwt schema');
  const p = d.response.price;
  return {
    source: 'chnwt',
    updatedAtThai: `${d.response.update_date} ${d.response.update_time || ''}`.trim(),
    prices: {
      bar965: { buy: parseNum(p.gold_bar?.buy), sell: parseNum(p.gold_bar?.sell) },
      jewelry: { buy: parseNum(p.gold?.buy), sell: parseNum(p.gold?.sell) },
    },
    change: null,
  };
}

async function fetchFallback() {
  const r = await fetch('https://xn--42cah7d0cxcvbbb9x.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ThaiFinanceBot/1.0)' },
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  if (!r.ok) throw new Error(`rakathong ${r.status}`);
  const html = await r.text();

  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const bar = text.match(/ทองคำแท่ง\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)/);
  const jew = text.match(/ทองรูปพรรณ\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)/);
  const chg = text.match(/วันนี้\s+([+\-]?\d+(?:\.\d+)?)/);
  const dt  = text.match(/(\d{1,2}\s+(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+\d{4})\s+(เวลา[^()]*)/);

  if (!bar || !jew) throw new Error('rakathong parse');

  return {
    source: 'rakathong',
    updatedAtThai: dt ? `${dt[1]} ${dt[2].trim()}` : new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    prices: {
      bar965: { buy: parseNum(bar[1]), sell: parseNum(bar[2]) },
      jewelry: { buy: parseNum(jew[1]), sell: parseNum(jew[2]) },
    },
    change: chg ? parseNum(chg[1]) : null,
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const attempts = [];
    let payload = null;

    for (const [name, fn] of [['primary', fetchPrimary], ['fallback', fetchFallback]]) {
      try {
        payload = await fn();
        attempts.push({ tier: name, ok: true });
        break;
      } catch (e) {
        attempts.push({ tier: name, ok: false, error: String(e.message || e) });
      }
    }

    if (!payload) {
      return new Response(JSON.stringify({
        success: false,
        error: 'all sources failed',
        attempts,
        updatedAt: new Date().toISOString(),
      }), { status: 502, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({
      success: true,
      updatedAt: new Date().toISOString(),
      updatedAtThai: payload.updatedAtThai,
      prices: payload.prices,
      change: payload.change,
      source: payload.source,
      attempts,
    }, null, 2), { headers: CORS_HEADERS });
  }
};
