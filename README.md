# ThaiFinance

รวมเครื่องมือการเงินไทย — ราคาทอง น้ำมัน คริปโต ภาษี ผ่อนบ้าน ค่าไฟ โซล่า DCA เงินฝาก ค่าเดินทาง

Static PWA สำหรับคนไทย — ฟรี ไม่ต้องสมัคร ไม่เก็บข้อมูล

## Tools

| Page | คำอธิบาย |
| --- | --- |
| `gold.html` | ราคาทอง 96.5% / 99.99% / รูปพรรณ |
| `oil.html` | ราคาน้ำมันทุกเกรด |
| `electricity.html` | คำนวณค่าไฟ กฟน./กฟภ. |
| `solar.html` | คุ้มไหม กี่ปีคืนทุน |
| `crypto.html` | ราคา BTC/ETH/BNB real-time |
| `dca.html` | DCA Calculator |
| `savings.html` | เปรียบเทียบดอกเบี้ยเงินฝาก |
| `travel.html` | รถ vs BTS vs Grab |
| `tax.html` | ภาษีเงินได้บุคคลธรรมดา 2568 |
| `mortgage.html` | ตารางผ่อนบ้าน |

## Deploy

- Hosting: Cloudflare Pages (auto-deploy จาก `main`)
- Gold worker: `worker/gold-worker.js` — deploy แยกที่ Cloudflare Workers

## Stack

Vanilla HTML/CSS/JS — ไม่มี build step, ไม่มี framework
