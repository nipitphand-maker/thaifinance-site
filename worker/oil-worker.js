// Cloudflare Worker — Oil Price Proxy
// Source: Bangchak public API
// https://oil-price.bangchak.co.th/ApiOilPrice2/th
//
// หมายเหตุสำคัญเรื่อง schema ของ Bangchak:
//   - OilRemark2 = ข้อความ effective date ("ราคามีผล ณ วันที่ XX")
//   - PriceToday      = ราคาที่ใช้/กำลังจะใช้ตาม effective date
//   - PriceYesterday  = Bangchak ส่งเท่า PriceToday เสมอ → ไม่ใช้
//   - PriceTomorrow   = ราคาวันถัดไป (เปลี่ยนเฉพาะถ้ามีประกาศล่วงหน้า)
//
// API ของ Bangchak ไม่ track diff vs ราคาก่อนหน้า → เลยไม่ส่ง diff ออกไป
// frontend แสดงเฉพาะราคาปัจจุบัน + ราคาวันถัดไป (ถ้าต่าง)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800',
};

const SOURCE_URL = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';

const FUEL_MAP = [
  { key: '95',         name: 'แก๊สโซฮอล์ 95',          match: /แก๊สโซฮอล์\s*95/, group: 'main' },
  { key: '91',         name: 'แก๊สโซฮอล์ 91',          match: /แก๊สโซฮอล์\s*91/, group: 'main' },
  { key: 'E20',        name: 'แก๊สโซฮอล์ E20',         match: /แก๊สโซฮอล์\s*E20/i, group: 'main' },
  { key: 'E85',        name: 'แก๊สโซฮอล์ E85',         match: /แก๊สโซฮอล์\s*E85/i, group: 'main' },
  { key: 'B7',         name: 'ดีเซล',                   match: /^ไฮดีเซล\s*S$/, group: 'main' },
  { key: 'B20',        name: 'ดีเซล B20',               match: /ดีเซล\s*B20/, group: 'main' },
  { key: 'พรีเมียม',   name: 'ดีเซลพรีเมียม (Bangchak)', match: /พรีเมียม.*ดีเซล/, group: 'premium' },
  { key: '98',         name: 'Hi Premium 98 (Bangchak)', match: /พรีเมียม\s*98/, group: 'premium' },
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
        if (prices[slot.key]) continue;
        const price = Number(o.PriceToday);
        const nextDay = Number(o.PriceTomorrow);
        prices[slot.key] = {
          name: slot.name,
          sourceName: o.OilName,
          group: slot.group,
          price,
          nextDay,
          nextDiff: +(nextDay - price).toFixed(2),
        };
      }

      return new Response(JSON.stringify({
        success: true,
        updatedAt: new Date().toISOString(),
        announcedAt: `${d.OilPriceDate} ${d.OilPriceTime || ''}`.trim(),
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
