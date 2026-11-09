import './mute-auto.mjs'
// 画面を撮って目で見る用。node shot.mjs [幅x高さ] [webkit]
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5417
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const [w, h] = (process.argv[2] || '390x844').split('x').map(Number)
const B = process.argv[3] === 'webkit' ? webkit : chromium
const b = await B.launch()
const ctx = await b.newContext({ locale: process.env.LANG_EN ? 'en-US' : 'ja-JP', viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: B === webkit })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push('pageerror ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()) })
await p.goto(`http://localhost:${PORT}/`)
await p.waitForFunction(() => window.__ctaReady, null, { timeout: 15000 })
const tag = `${w}x${h}${process.env.LANG_EN ? '-en' : ''}`
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-0title.png` })
await p.click('#bHow'); await p.screenshot({ path: `${ROOT}/shots/s-${tag}-1how.png` }); await p.click('#howClose')
await p.evaluate(() => { cta.seed(7); cta.dbg.pause(true) })
await p.click('#bStart')
await p.evaluate(() => cta.dbg.step(10))
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-2intro.png` })
await p.evaluate(() => cta.dbg.step(170))
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-3tut.png` })
// 各場面で広告をいくつか出して撮る
const kinds = [['popup', 'banner', 'inter'], ['fake', 'flee', 'video'], ['inline', 'sound', 'confirm'], ['sheet', 'reco', 'fake'], ['popup', 'fake', 'giant']]
for (let s = 0; s < 5; s++) {
  await p.evaluate(([s, ks]) => {
    cta.setup(s); cta.G.intro = false; document.querySelector('#intro').hidden = true
    for (const k of ks) {
      if (k === 'giant') { const L = document.querySelector('#layer'); cta.spawn('giant', { rect: { x: 12, y: 40, w: L.clientWidth - 24, h: L.clientHeight * 0.7 } }) }
      else if (k !== 'inter' && k !== 'video') cta.spawn(k)
    }
    cta.dbg.step(30)
  }, [s, kinds[s]])
  await p.waitForTimeout(250); await p.screenshot({ path: `${ROOT}/shots/s-${tag}-4stage${s}.png` })
  const full = kinds[s].find(k => k === 'inter' || k === 'video')
  if (full) { await p.evaluate(k => { cta.spawn(k); cta.dbg.step(60) }, full); await p.waitForTimeout(250); await p.screenshot({ path: `${ROOT}/shots/s-${tag}-4stage${s}-full.png` }) }
}
for (const st of [0, 1, 2, 3]) {
  await p.evaluate(st => { cta.setup(st); cta.G.intro = false; document.querySelector('#intro').hidden = true; const t = cta.targetXY(); cta.tap(t.x, t.y); cta.dbg.step(45) }, st)
  await p.waitForTimeout(250); await p.screenshot({ path: `${ROOT}/shots/s-${tag}-8detail${st}.png` })
}
await p.evaluate(() => { for (const a of [...cta.G.ads]) a.el.remove(); cta.G.ads = []; const t = cta.targetXY(); cta.tap(t.x, t.y); cta.dbg.step(5) })
await p.waitForTimeout(200); await p.screenshot({ path: `${ROOT}/shots/s-${tag}-9quiz.png` })
await p.evaluate(() => { const q = cta.quizXY().find(q => !q.ok); cta.tap(q.x, q.y); cta.dbg.step(5) })
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-9wrong.png` })
await p.evaluate(() => { cta.setup(4); cta.G.intro = false; document.querySelector('#intro').hidden = true; cta.spawn('fake'); cta.spawn('video'); cta.dbg.step(5) })
await p.evaluate(() => { const r = cta.lensXY(); cta.tap(r.x, r.y); cta.dbg.step(5) })
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-5lens.png` })
// 誤タップ
await p.evaluate(() => { const a = cta.adRects().find(a => !a.full); if (a) cta.tap(a.x, a.y + 10); cta.dbg.step(5) })
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-6buy.png` })
await p.evaluate(() => { const G = cta.G; G.bill.push({ p: DATA.products[1], price: 29800 }, { p: DATA.products[0], price: 3980 }, { p: DATA.products[0], price: 3980 }, { p: DATA.products[9], price: 980 }); G.clears = [true, true, true, false, true]; G.adSec = 87.3; G.miss = 4; G.block = 0; window.cta.finish() })
await p.waitForTimeout(1200)
await p.screenshot({ path: `${ROOT}/shots/s-${tag}-7end.png` })
console.log(errs.join('\n') || 'no errors')
await b.close(); server.kill()
