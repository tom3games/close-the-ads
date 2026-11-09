import './mute-auto.mjs'
// og.png（1200x630）を作る。遊んでいる画面（広告だらけ）＋請求書＋題名。node og.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const PORT = 5415
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch()
const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/`)
await p.waitForFunction(() => window.__ctaReady)
await p.evaluate(() => document.fonts.ready)
await p.evaluate(() => {
  cta.seed(42); cta.dbg.pause(true); cta.startGame(); cta.setup(1); cta.G.intro = false; document.querySelector('#intro').hidden = true
  const P = DATA.products
  cta.spawn('popup', { product: P[0] }); cta.spawn('fake', { product: P[1] }); cta.spawn('banner', { product: P[13] }); cta.spawn('sound', { product: P[7] })
  cta.G.batt = 23; cta.dbg.step(2)
})
await p.waitForTimeout(400)
const shot = (await p.screenshot({ type: 'png' })).toString('base64')
await p.evaluate(() => { const G = cta.G; G.bill.push({ p: DATA.products[1], price: 29800 }, { p: DATA.products[0], price: 3980 }, { p: DATA.products[0], price: 3980 }, { p: DATA.products[5], price: 19800 }, { p: DATA.products[9], price: 980 }); G.clears = [true, true, false, true, true]; G.adSec = 92; cta.finish() })
await p.waitForTimeout(1200)
const bill = (await p.locator('#bill').screenshot({ type: 'png' })).toString('base64')
const og = await (await b.newContext({ viewport: { width: 1200, height: 630 } })).newPage()
await og.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&display=swap" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;position:relative;background:radial-gradient(120% 90% at 30% 0%,#5a4636,#2a2018);font-family:"Mochiy Pop One",sans-serif}
body::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(91deg,rgba(0,0,0,.07) 0 3px,transparent 3px 11px)}
.ph{position:absolute;left:520px;top:28px;width:300px;height:585px;border-radius:30px;background:#111;padding:8px;transform:rotate(-5deg);box-shadow:0 26px 40px rgba(0,0,0,.6)}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:22px;display:block}
.bill{position:absolute;right:18px;top:150px;width:310px;transform:rotate(4deg);box-shadow:0 18px 30px rgba(0,0,0,.55)}
.bill img{width:100%;display:block}
h1{position:absolute;left:46px;top:150px;color:#fff;font-weight:400;font-size:66px;line-height:1.14;text-shadow:0 5px 0 #000}
h1 em{font-style:normal;color:#ffd84a}
p{position:absolute;left:50px;top:350px;color:#f1e6d8;font:700 28px/1.5 "Hiragino Sans",sans-serif}
p b{color:#ffd84a}
</style></head><body><h1>うざい<em>広告</em>を<br>閉じろ</h1><p>本物の×は<b>米粒</b>くらい。<br>誤タップの請求は<br>最後に届く。</p>
<div class="ph"><img src="data:image/png;base64,${shot}"></div><div class="bill"><img src="data:image/png;base64,${bill}"></div></body></html>`)
await og.evaluate(() => document.fonts.ready)
await og.waitForTimeout(500)
await og.screenshot({ path: ROOT + '/og.png' })
await b.close(); server.kill()
console.log('og.png')
