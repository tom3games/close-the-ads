import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// うざい広告を閉じろ の検証。node verify.mjs
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5416
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, hasTouch: true, ...opts })
  await muteContext(ctx)
  await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0); await p.waitForFunction(() => window.__ctaReady, null, { timeout: 15000 })
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *, .ovl:not([hidden]) *')) {
    if (el.closest('[hidden]') || el.closest('.cx') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button, .ovl:not([hidden]) button, #tmSupport, #tmHome, .cx, .row')) {
    if (!el.offsetParent || el.closest('[hidden]') || el.closest('.out')) continue
    const r = el.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < -1 || r.right > innerWidth + 1 || r.left < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom))
  }
  return { H, over: over.slice(0, 6) }
})
// 本物の指で押す（座標）
const click = async (p, xy) => { await p.mouse.click(xy.x, xy.y) }
const step = (p, n) => p.evaluate(n => cta.dbg.step(n), n)
const skipIntro = async p => { await step(p, 200) }

const browser = await chromium.launch(MUTE_LAUNCH)
let p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r))
})
await t('OGP・canonical・横丁への転送がある', async () => {
  const r = await p.evaluate(() => ({ og: ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].every(k => document.querySelector(`meta[property="${k}"]`)), tw: !!document.querySelector('meta[name="twitter:card"]'), can: document.querySelector('link[rel=canonical]').href, gh: document.getElementById('ghMove').textContent }))
  expect(r.og && r.tw && r.can === 'https://tom3games.com/play/close-the-ads/' && /tom3games\.com\/play\/close-the-ads\//.test(r.gh), JSON.stringify(r))
})
await t('画面に AI・画像生成の語がない', async () => {
  const txt = await p.evaluate(() => document.body.innerText + JSON.stringify(DATA))
  expect(!/(\bAI\b|画像生成|生成AI|ChatGPT)/.test(txt), 'found')
})

// ---- 遊びの通し（本物のポインタ）
await p.evaluate(() => { cta.seed(11); cta.dbg.pause(true) })
await click(p, await p.evaluate(() => { const r = document.querySelector('#bStart').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
await t('無音: 始めた後も実際には鳴っていない（Chromium）', async () => { const r = await p.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls })); expect(r.ok && r.calls > 0, JSON.stringify(r)); return r })
await skipIntro(p)
await t('最初の広告と指の案内が出る', async () => { const r = await p.evaluate(() => ({ ads: cta.state().ads.length, tut: cta.state().tut, finger: !document.querySelector('#finger').hidden, toast: document.querySelector('#toast').textContent })); expect(r.ads === 1 && r.tut === 1 && r.finger && r.toast, JSON.stringify(r)); return r })
await t('米粒の×を実座標で押すと閉じる（13px の点）', async () => {
  const c = (await p.evaluate(() => cta.closers()))[0]
  expect(c.real && c.w < 16, JSON.stringify(c))
  await click(p, c)
  const r = await p.evaluate(() => ({ ads: cta.state().ads.length, closed: cta.G.closed }))
  expect(r.ads === 0 && r.closed === 1, JSON.stringify(r)); return { w: Math.round(c.w), ...r }
})
await t('偽物の×を押すと買ってしまい請求に乗る・広告は残る', async () => {
  await p.evaluate(() => cta.spawn('fake'))
  await p.waitForTimeout(250)
  const f = (await p.evaluate(() => cta.closers())).find(c => !c.real)
  await click(p, f)
  const r = await p.evaluate(() => ({ bill: cta.state().bill, buy: !document.querySelector('#buyOv').hidden, ads: cta.state().ads.length, block: cta.state().blockKind }))
  expect(r.bill > 0 && r.buy && r.ads === 1 && r.block === 'buy', JSON.stringify(r))
  await step(p, 90)
  return r
})
await t('買った画面の間は押しても進まない・戻ったら続く', async () => {
  const r = await p.evaluate(() => ({ block: cta.state().block, buy: document.querySelector('#buyOv').hidden }))
  expect(r.block <= 0 && r.buy, JSON.stringify(r))
})
await t('虫めがね: 押すと×が大きくなり残り2回', async () => {
  await click(p, await p.evaluate(() => cta.lensXY()))
  await p.waitForTimeout(250)
  const r = await p.evaluate(() => ({ lens: cta.state().lens, on: document.querySelector('#phone').classList.contains('lens'), w: Math.max(...cta.closers().filter(c => c.real).map(c => c.w)) }))
  expect(r.lens === 2 && r.on && r.w > 30, JSON.stringify(r)); return r
})
await t('虫めがね中は逃げる×も逃げない・全画面広告に隠し×が出る', async () => {
  const r = await p.evaluate(() => { for (const a of [...cta.G.ads]) a.el.remove(); cta.G.ads = []; cta.spawn('flee'); const c = cta.closers().find(c => c.real); const res = cta.tap(c.x, c.y); cta.spawn('video'); const v = cta.closers().filter(c => c.kind === 'video' && c.real).length; return { res, v } })
  expect(r.res === 'close' && r.v >= 1, JSON.stringify(r))
  await step(p, 260)
  return r
})
await t('指示と違う操作で固まらない（スワイプ・連打・長押し・2本指・背景に回す）', async () => {
  await p.evaluate(() => { for (const a of [...cta.G.ads]) a.el.remove(); cta.G.ads = [] })
  await p.mouse.move(200, 400); await p.mouse.down(); await p.mouse.move(200, 200, { steps: 6 }); await p.mouse.up()
  for (let i = 0; i < 6; i++) await p.mouse.click(30 + i * 50, 300)
  await p.mouse.move(100, 500); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up()
  await p.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e) })
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) })
  await step(p, 120)
  const r = await p.evaluate(() => ({ scene: cta.state().scene, t: cta.state().playT, block: cta.state().block }))
  expect(r.scene === 'play' && r.block < 2 && p.errs.length === 0, JSON.stringify(r) + p.errs.join('|')); return r
})
await t('お題の行→ページ→覚えた→正解でクリア（全部本物のポインタ）', async () => {
  await step(p, 120)
  for (let k = 0; k < 40; k++) {
    const st = await p.evaluate(() => cta.state())
    if (st.clears[0] || st.stage > 0) break
    if (st.blockKind === 'quiz') { await click(p, (await p.evaluate(() => cta.quizXY())).find(q => q.ok)); continue }
    if (st.block > 0) { await step(p, 30); continue }
    const c = (await p.evaluate(() => cta.closers().filter(c => c.real && cta.topAt(c.x, c.y) === 'real').sort((a, b) => b.z - a.z)))[0]
    if (c) { await click(p, c); await step(p, 5); continue }
    const tg = await p.evaluate(() => { const t = cta.targetXY(); return t && cta.topAt(t.x, t.y).startsWith('row') ? t : null })
    if (tg) { await click(p, tg); await step(p, 50); continue }
    await step(p, 30)
  }
  const r = await p.evaluate(() => cta.state().clears)
  expect(r[0], JSON.stringify(r)); return r
})
await p.close()

// ---- 通しの分布（内部の時計を止めて、本物のポインタで最後まで）
async function playThrough(kind, seed) {
  const q = await open(browser)
  await q.addStyleTag({ content: '*{animation:none!important;transition:none!important}' })
  await q.evaluate(s => { cta.seed(s); cta.dbg.pause(true); cta.startGame() }, seed)
  for (let k = 0; k < 900; k++) {
    const st = await q.evaluate(() => cta.state())
    if (st.scene !== 'play') break
    if (kind === 'idle') { await step(q, 120); continue }
    if (st.intro) { await click(q, { x: 195, y: 420 }); await step(q, 20); continue }
    if (st.blockKind === 'quiz') { await click(q, (await q.evaluate(() => cta.quizXY())).find(x => x.ok)); continue }
    if (st.block > 0) { await step(q, 20); continue }
    if (kind === 'mash') { const a = (await q.evaluate(() => cta.adRects().sort((a, b) => b.w * b.h - a.w * a.h)))[0]; if (a) await click(q, { x: a.x, y: a.y + a.h * 0.25 }); await step(q, 30); continue }
    const tg = await q.evaluate(() => { const t = cta.targetXY(); const inf = cta.infoXY(); const ok = t && cta.topAt(t.x, t.y).startsWith('row') && !cta.state().jank && (!inf || /^other/.test(cta.topAt(inf.x, inf.y)) || cta.state().stage === 4); return ok ? t : null })
    if (tg) { await click(q, tg); await step(q, 30); continue }
    const c = (await q.evaluate(() => cta.closers().filter(c => c.real && cta.topAt(c.x, c.y) === 'real').sort((a, b) => b.z - a.z)))[0]
    if (c) { await click(q, c) }
    await step(q, 40)
  }
  await step(q, 400)
  const r = await q.evaluate(() => ({ scene: cta.G.scene, ...cta.result() }))
  r.errs = q.errs.length
  if (kind === 'good') { await q.waitForTimeout(900); await q.screenshot({ path: `${ROOT}/shots/v-end-good.png` }) }
  await q.close()
  return r
}
const good = [], idle = [], mash = []
for (const s of [3, 21, 77]) good.push(await playThrough('good', s))
for (const s of [3, 21]) idle.push(await playThrough('idle', s))
for (const s of [3, 21]) mash.push(await playThrough('mash', s))
await t('上手い通し: 5つ全部・上位の評価・エラーなし', async () => { expect(good.every(r => r.scene === 'end' && r.clears === 5 && r.rank <= 1 && !r.errs), JSON.stringify(good.map(r => [r.clears, r.rank, r.sum, r.batt, r.errs]))); return good.map(r => ({ clears: r.clears, rank: r.rank, batt: r.batt, adSec: r.adSec })) })
await t('何もしない通し: 用事0・最低の評価', async () => { expect(idle.every(r => r.scene === 'end' && r.clears === 0 && r.rank === 4), JSON.stringify(idle)); return idle.map(r => ({ clears: r.clears, rank: r.rank })) })
await t('全部押す通し: 請求がふくらみ最低の評価', async () => { expect(mash.every(r => r.scene === 'end' && r.rank === 4 && r.sum > 100000), JSON.stringify(mash.map(r => [r.clears, r.rank, r.sum]))); return mash.map(r => ({ rank: r.rank, bill: r.sum })) })

// ---- 間違えた答え・結果画面
p = await open(browser)
await t('間違えた答えは用事失敗で次へ進む', async () => {
  const r = await p.evaluate(() => { cta.dbg.pause(true); cta.startGame(); cta.dbg.step(200); for (const a of [...cta.G.ads]) a.el.remove(); cta.G.ads = []; cta.G.tut = 0; cta.G.tutHold = false; const t = cta.targetXY(); cta.tap(t.x, t.y); cta.dbg.step(40); for (const a of [...cta.G.ads]) a.el.remove(); cta.G.ads = []; const g = cta.targetXY(); cta.tap(g.x, g.y); const q = cta.quizXY().find(q => !q.ok); cta.tap(q.x, q.y); const ng = document.querySelector('#doneOv').classList.contains('ng'); cta.dbg.step(200); return { ng, stage: cta.state().stage, clears: cta.state().clears[0] } })
  expect(r.ng && r.stage === 1 && r.clears === false, JSON.stringify(r)); return r
})
await t('結果: 明細・はんこ・支援・横丁へ戻る・画像が描ける・Xの本文', async () => {
  const r = await p.evaluate(() => {
    const G = cta.G; G.bill.push({ p: DATA.products[1], price: 29800 }); G.clears = [true, true, false, true, true]; cta.finish()
    let url = ''; window.open = u => { url = u }
    document.querySelector('#bPost').click()
    const c = document.querySelector('#card'); // 画像
    return { bill: document.querySelector('#bill').innerText.includes('29,800'), stamp: !!document.querySelector('#stamp'), sup: !!document.querySelector('#tmSupport'), home: !!document.querySelector('#tmHome'), url }
  })
  const v = await p.evaluate(() => { const c = cta.G && document.querySelector('#card'); window.__d = null; return null })
  const varc = await p.evaluate(() => { const c = cta.drawCard(); const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i]; s += v; s2 += v * v; n++ } return Math.round(s2 / n - (s / n) ** 2) })
  expect(r.bill && r.stamp && r.sup && r.home && /x\.com\/intent\/post/.test(r.url) && /tom3games\.com%2Fplay%2Fclose-the-ads/.test(r.url) && varc > 500, JSON.stringify({ ...r, varc })); return { varc }
})
await t('英語に切り替えても動く', async () => {
  await p.evaluate(() => document.querySelector('#bLang').click())
  const r = await p.evaluate(() => { cta.startGame(); cta.dbg.step(200); return { q: document.querySelector('#q').textContent, title: document.querySelector('#bStart').textContent, intro: document.querySelector('#appT').textContent } })
  expect(/weather|Mon|Tue|Wed|Thu|Fri|Sat|Sun/.test(r.q) && r.title === 'Unlock phone' && p.errs.length === 0, JSON.stringify(r) + p.errs.join('|')); return r
})
await p.close()

// ---- 3サイズ × 全画面で一画面に収まる
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'max']]
for (const [w, h, name] of SIZES) {
  const q = await open(browser, { viewport: { width: w, height: h } })
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await q.click('#bHow'); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` }); await q.click('#howClose')
  await q.evaluate(() => { cta.seed(5); cta.dbg.pause(true); cta.startGame(); cta.dbg.step(10) }); views.intro = await fit(q)
  await q.evaluate(() => { cta.dbg.step(200); cta.G.tut = 0; cta.G.tutHold = false; for (const k of ['popup', 'fake', 'banner', 'sound', 'reco', 'sheet']) cta.spawn(k); cta.dbg.step(10) })
  await q.waitForTimeout(250); views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  await q.evaluate(() => { cta.spawn('confirm'); cta.spawn('video'); cta.dbg.step(10) }); await q.waitForTimeout(250); views.full = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-full.png` })
  await q.evaluate(() => { for (const a of [...cta.G.ads]) a.el.remove(); cta.G.ads = []; const t = cta.targetXY(); cta.tap(t.x, t.y); cta.dbg.step(40); cta.spawn('inline'); cta.dbg.step(5) })
  await q.waitForTimeout(250); views.detail = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-detail.png` })
  await q.evaluate(() => { for (const a of [...cta.G.ads]) a.el.remove(); cta.G.ads = []; const t = cta.targetXY(); cta.tap(t.x, t.y) }); views.quiz = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-quiz.png` })
  await q.evaluate(() => { const qq = cta.quizXY().find(x => x.ok); cta.tap(qq.x, qq.y); cta.dbg.step(120); const a = cta.spawn('popup'); cta.dbg.step(200) })
  await q.evaluate(() => { const a = cta.adRects().find(a => !a.full); if (a) cta.tap(a.x, a.y + 20) }); views.buy = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-buy.png` })
  await q.evaluate(() => { const G = cta.G; for (const pp of DATA.products.slice(0, 7)) G.bill.push({ p: pp, price: pp.price }); G.clears = [true, true, false, true, true]; G.block = 0; cta.finish() })
  await q.waitForTimeout(1300); views.end = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-end.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify(o) + q.errs.join('|')) })
  await q.close()
}
await browser.close()

// ---- WebKit（iPhone 相当）でタッチ
const wb = await webkit.launch()
const wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: タップで始めて、米粒の×をタッチで閉じる', async () => {
  await wp.evaluate(() => { cta.seed(9); cta.dbg.pause(true) })
  const b = await wp.evaluate(() => { const r = document.querySelector('#bStart').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await wp.touchscreen.tap(b.x, b.y)
  await wp.evaluate(() => cta.dbg.step(200))
  await wp.waitForTimeout(250)
  const c = (await wp.evaluate(() => cta.closers()))[0]
  await wp.touchscreen.tap(c.x, c.y)
  const r = await wp.evaluate(() => ({ ads: cta.state().ads.length, closed: cta.G.closed, scene: cta.G.scene }))
  expect(r.scene === 'play' && r.closed === 1 && r.ads === 0, JSON.stringify(r)); return r
})
await t('WebKit: 実際には無音', async () => { const r = await wp.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls })); expect(r.ok && r.calls > 0, JSON.stringify(r)); return r })
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: 結果画面まで行ける', async () => {
  await wp.evaluate(() => { cta.G.batt = 0.01; cta.dbg.step(300) })
  await wp.waitForTimeout(900)
  await wp.screenshot({ path: `${ROOT}/shots/v-webkit-end.png` })
  const r = await wp.evaluate(() => cta.G.scene)
  expect(r === 'end', r)
})
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
// ---- ページを離れた時の音（2026-11-11 横丁へ移っても BGM が鳴り続けた不具合の再発防止）
await t('WebKit: 裏に回ると BGM と環境音が止まり suspend。戻っても触るまで鳴らない（bfcache の pageshow でも）', async () => {
  const r = await wp.evaluate(async () => {
    if (!Snd.ctx) Snd.init()
    const url = Object.values(Snd.files).flat()[0]; Snd.loop('vtest', url, 0.2)
    for (let i = 0; i < 30 && !Snd.playing().includes('vtest'); i++) await new Promise(r => setTimeout(r, 100))
    const c = Snd.ctx; let sus = 0; const os = c.suspend.bind(c); c.suspend = () => { sus++; return os() }
    const before = Snd.playing().length, wake0 = Snd.life.wake
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'))
    const hid = { away: Snd.away, playing: Snd.playing().length, sus, gain: Snd.master.gain.value }
    const name = Object.keys(Snd.files)[0], src = Snd.play(name); Snd.loop('vtest2', url, 0.2);    // 裏にいる間の音は鳴らさない
    await new Promise(r => setTimeout(r, 400)); const quiet = Snd.playing().length
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    await new Promise(r => setTimeout(r, 400)); const back = { away: Snd.away, playing: Snd.playing().length, gain: Snd.master.gain.value }
    Snd.loop('vtest2', null)
    return { before, wake0, hid, src: src === null, quiet, back }
  })
  // ボタンでない所を1回タップ（触ったら鳴らし直す）
  const pt = await wp.evaluate(() => { for (let y = 0.5; y < 0.98; y += 0.06) for (let x = 0.08; x < 0.95; x += 0.12) { const X = innerWidth * x, Y = innerHeight * y, e = document.elementFromPoint(X, Y); if (e && !e.closest('button,a,input,select,textarea,label,[onclick],[role=button],[tabindex]')) return { x: X, y: Y } } return null })
  if (pt) await wp.touchscreen.tap(pt.x, pt.y); else await wp.keyboard.press('Shift')
  await wp.waitForTimeout(700)
  const after = await wp.evaluate(() => ({ away: Snd.away, playing: Snd.playing().length, wake: Snd.life.wake, mute: window.__muteOk() }))
  await wp.evaluate(() => Snd.loop('vtest', null))
  expect(r.before >= 1 && r.hid.away && r.hid.playing === 0 && r.hid.sus === 1 && r.hid.gain === 0 && r.src && r.quiet === 0 && r.back.away && r.back.playing === 0 && r.back.gain === 0 && !after.away && after.playing >= r.before && after.wake === r.wake0 + 1 && after.mute, JSON.stringify({ r, after, pt })); return { before: r.before, after: after.playing }
})
await t('WebKit: 別のページへ移る（pagehide）と止まり、戻るで戻っても鳴っていない・エラーなし', async () => {
  await wp.evaluate(() => addEventListener('pagehide', () => { try { sessionStorage.setItem('vHide', JSON.stringify({ away: Snd.away, playing: Snd.playing().length, hide: Snd.life.hide })) } catch (e) {} }))
  await wp.evaluate(() => { if (!Snd.ctx) Snd.init(); Snd.loop('vtest', Object.values(Snd.files).flat()[0], 0.2) }); await wp.waitForTimeout(500)
  const pre = await wp.evaluate(() => Snd.playing().length)
  await wp.goto(URL0 + 'privacy.html'); await wp.waitForTimeout(300)
  const hid = await wp.evaluate(() => sessionStorage.getItem('vHide'))
  await wp.goBack(); await wp.waitForFunction(() => window.__ctaReady, null, { timeout: 15000 }); await wp.waitForTimeout(800)
  const back = await wp.evaluate(() => ({ playing: typeof Snd === 'undefined' ? 0 : Snd.playing().length, mute: window.__muteOk() }))
  const h = JSON.parse(hid || '{}')
  expect(pre >= 1 && h.away && h.playing === 0 && back.playing === 0 && back.mute && wp.errs.length === 0, JSON.stringify({ pre, h, back, e: wp.errs })); return { pre, h, back }
})
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
