// Cloudflare Worker — Oil Price Proxy
// Source: Bangchak public API
// https://oil-price.bangchak.co.th/ApiOilPrice2/th
//
// สำคัญเรื่อง schema ของ Bangchak:
//   - PriceToday      = ราคาที่กำลังจะมีผล (อิงตาม OilRemark2 — เช่น 05:00 พรุ่งนี้)
//   - PriceYesterday  = ราคาเดิมก่อนการประกาศใหม่ (ที่ยังใช้อยู่จนถึงเวลา effective)
//   - PriceTomorrow   = ราคาวันถัดไปอีก (มักเท่ากับ today)
//   - PriceDifYesterday = ไม่น่าเชื่อถือ (Bangchak ส่ง 0.00 บ่อย) → เราคำนวณเอง

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800',
};

const SOURCE_URL = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';

// แมพชื่อ Bangchak → key สั้น + ป้ายชื่อที่ผู้ใช้คุ้นเคย
// "98" = Hi Premium 98 plus เป็น brand เฉพาะ Bangchak (ไม่ใช่เบนซิน 98 ทั่วไป)
const FUEL_MAP = [
  { key: '95',         name: 'แก๊สโซฮอล์ 95',                  match: /แก๊สโซฮอล์\s*95/, group: 'main' },
  { key: '91',         name: 'แก๊สโซฮอล์ 91',                  match: /แก๊สโซฮอล์\s*91/, group: 'main' },
  { key: 'E20',        name: 'แก๊สโซฮอล์ E20',                 match: /แก๊สโซฮอล์\s*E20/i, group: 'main' },
  { key: 'E85',        name: 'แก๊สโซฮอล์ E85',                 match: /แก๊สโซฮอล์\s*E85/i, group: 'main' },
  { key: 'B7',         name: 'ดีเซล',                          match: /^ไฮดีเซล\s*S$/, group: 'main' },
  { key: 'B20',        name: 'ดีเซล B20',                      match: /ดีเซล\s*B20/, group: 'main' },
  { key: 'พรีเมียม',   name: 'ดีเซลพรีเมียม (Bangchak)',         match: /พรีเมียม.*ดีเซล/, group: 'premium' },
  { key: '98',         name: 'Hi Premium 98 (Bangchak)',         match: /พรีเมียม\s*98/, group: 'premium' },
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
        const today = Number(o.PriceToday);
        const yesterday = Number(o.PriceYesterday);
        const tomorrow = Number(o.PriceTomorrow);
        prices[slot.key] = {
          name: slot.name,
          sourceName: o.OilName,
          group: slot.group,
          effective: today,        // ราคาใหม่ที่จะมีผล (หรือใช้แล้ว ตาม OilRemark2)
          previous: yesterday,     // ราคาที่ใช้ก่อนหน้านี้
          nextDay: tomorrow,       // ราคาวันถัดไป (มักเท่ากับ effective)
          diff: +(today - yesterday).toFixed(2),       // ของจริง (Bangchak field 0 บ่อย)
          nextDiff: +(tomorrow - today).toFixed(2),    // เปลี่ยนวันถัดไป
        };
      }

      return new Response(JSON.stringify({
        success: true,
        updatedAt: new Date().toISOString(),
        announcedAt: `${d.OilPriceDate} ${d.OilPriceTime || ''}`.trim(),
        effective: d.OilRemark2 || '',  // เช่น "ราคามีผล ณ วันที่ 20 พ.ค. 69 เวลา 05.00 น."
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
