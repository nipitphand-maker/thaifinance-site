// Cloudflare Worker — Gold Price Proxy
// Deploy ที่: https://workers.cloudflare.com
// วิธี deploy: copy code นี้ไปใส่ใน Worker editor แล้วกด Deploy

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800', // cache 30 นาที
};

export default {
  async fetch(request, env, ctx) {

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // ดึงราคาทองจากสมาคมค้าทองคำ
      const response = await fetch('https://www.goldtraders.or.th/api/Price', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GoldPriceBot/1.0)',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.goldtraders.or.th/',
        },
        cf: {
          cacheTtl: 1800, // Cloudflare edge cache 30 นาที
          cacheEverything: true,
        }
      });

      if (!response.ok) {
        throw new Error(`Source returned ${response.status}`);
      }

      const data = await response.json();

      // แปลงข้อมูลให้ใช้งานง่าย
      const result = {
        success: true,
        updatedAt: new Date().toISOString(),
        updatedAtThai: new Date().toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        prices: {
          bar965: {
            buy: data?.BuyBarWeight1 ?? null,   // ทองแท่ง 96.5% รับซื้อ
            sell: data?.SellBarWeight1 ?? null,  // ทองแท่ง 96.5% ขายออก
          },
          bar9999: {
            buy: data?.BuyBarWeight2 ?? null,    // ทองแท่ง 99.99%
            sell: data?.SellBarWeight2 ?? null,
          },
          jewelry: {
            buy: data?.BuyOrnament ?? null,      // ทองรูปพรรณ รับซื้อ
            sell: data?.SellOrnament ?? null,    // ทองรูปพรรณ ขายออก
          },
        },
        change: {
          amount: data?.Change ?? null,          // เปลี่ยนแปลง (บาท)
          status: data?.ChangeStatus ?? null,    // UP / DOWN / NOCHANGE
        },
        raw: data, // ข้อมูลดิบทั้งหมดจาก API
      };

      return new Response(JSON.stringify(result, null, 2), {
        headers: CORS_HEADERS,
      });

    } catch (error) {

      // Fallback: ถ้าดึงไม่ได้ ให้ return error ชัดๆ
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        updatedAt: new Date().toISOString(),
      }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  }
};
