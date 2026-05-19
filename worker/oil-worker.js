// Cloudflare Worker — Oil Price Proxy
// Source: Bangchak public API (ราคาขายปลีก กทม.)
// https://oil-price.bangchak.co.th/ApiOilPrice2/th
//
// ทำ mapping จากชื่อ Bangchak → key สั้นที่ frontend ใช้
// (Bangchak เรียก "แก๊สโซฮอล์ 95 S EVO" — frontend ใช้ "95")

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800',
};

const SOURCE_URL = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';

const FUEL_MAP = [
  { key: '95',         name: 'แก๊สโซฮอล์ 95',       match: /แก๊สโซฮอล์\s*95/ },
  { key: '91',         name: 'แก๊สโซฮอล์ 91',       match: /แก๊สโซฮอล์\s*91/ },
  { key: 'E20',        name: 'แก๊สโซฮอล์ E20',      match: /แก๊สโซฮอล์\s*E20/i },
  { key: 'E85',        name: 'แก๊สโซฮอล์ E85',      match: /แก๊สโซฮอล์\s*E85/i },
  { key: '98',         name: 'พรีเมียม 98',          match: /พรีเมียม\s*98/ },
  { key: 'B7',         name: 'ดีเซล (ไฮดีเซล S)',    match: /^ไฮดีเซล\s*S$/ },
  { key: 'B20',        name: 'ดีเซล B20',            match: /ดีเซล\s*B20/ },
  { key: 'พรีเมียม',   name: 'ดีเซลพรีเมียม',         match: /พรีเมียม.*ดีเซล/ },
];

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const r = await fetch(SOURCE_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ThaiFinanceBot/1.0)' },
        cf: { cacheTtl: 1800, cacheEverything: true },
      });
      if (!r.ok) throw new Error(`bangchak ${r.status}`);

      const raw = await r.json();
      const d = Array.isArray(raw) ? raw[0] : raw;
      if (!d?.OilList) throw new Error('bangchak schema');

      const oils = typeof d.OilList === 'string' ? JSON.parse(d.OilList) : d.OilList;
      const prices = {};
      const unmatched = [];

      for (const o of oils) {
        const slot = FUEL_MAP.find(m => m.match.test(o.OilName));
        if (!slot) { unmatched.push(o.OilName); continue; }
        if (prices[slot.key]) continue; // first-match wins
        prices[slot.key] = {
          name: slot.name,
          sourceName: o.OilName,
          today: Number(o.PriceToday),
          yesterday: Number(o.PriceYesterday),
          tomorrow: Number(o.PriceTomorrow),
          diff: Number(o.PriceDifYesterday),
        };
      }

      return new Response(JSON.stringify({
        success: true,
        updatedAt: new Date().toISOString(),
        updatedAtThai: `${d.OilPriceDate} ${d.OilPriceTime || ''}`.trim(),
        effective: d.OilRemark2 || '',
        remark: d.OilRemark || '',
        source: 'bangchak',
        prices,
        unmatched,
      }, null, 2), { headers: CORS_HEADERS });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        updatedAt: new Date().toISOString(),
      }), { status: 502, headers: CORS_HEADERS });
    }
  }
};
