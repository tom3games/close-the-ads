import './mute-auto.mjs'
// 遊び方ごとの分布。node sim.mjs [回数=12]
// 上手い（虫めがねあり/なし）・普通・全部押す・何もしない を種を変えて回し、
// 「上手い>普通>全部押す・何もしない」「虫めがねを使う方が得」「何もしないは最低評価」を数字で見る
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const PORT = 5418
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const N = +(process.argv[2] || 12)
const BOTS = {
  pro: { sigma: 5.5, react: 0.8, know: 0.92, lens: true, waitJank: true },
  proNoLens: { sigma: 5.5, react: 0.8, know: 0.92, lens: false, waitJank: true },
  normal: { sigma: 6.5, react: 1.0, know: 0.75, lens: true, waitJank: false, impatient: 14 },
  normalNoLens: { sigma: 6.5, react: 1.0, know: 0.75, lens: false, waitJank: false, impatient: 14 },
  mash: { mash: true, react: 0.5 },
  idle: { idle: true },
}
const b = await chromium.launch()
const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } })
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/`)
await p.waitForFunction(() => window.__ctaReady)
await p.addStyleTag({ content: '*{animation:none!important;transition:none!important}' })
const out = {}
for (const [name, bot] of Object.entries(BOTS)) {
  out[name] = []
  for (let i = 0; i < N; i++) {
    const r = await p.evaluate(([bot, sd]) => {
      cta.dbg.pause(true); cta.seed(sd)
      // 案内は1回目だけ出るので、毎回出す（同じ条件で比べる）
      cta.G.tipsShown = {}
      cta.startGame()
      let s2 = sd * 7 + 3; const R = () => (s2 = s2 * 16807 % 2147483647) / 2147483647
      const gauss = () => { let u = 0, v = 0; while (!u) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
      const tapN = (x, y, sg) => cta.tap(x + gauss() * sg, y + gauss() * sg)
      let guard = 0, wait = 0, read = false, impatient = 0, lastStage = -1, lastStep = -1, idleN = 0, idles = {}, stall = '', lastAds = '', lastCl = '', lastTgt = ''
      while (cta.G.scene === 'play' && guard++ < 40000) {
        const fr = Math.max(1, Math.round((bot.react || 1) * 60 * (0.8 + 0.4 * R())))
        cta.dbg.step(fr)
        if (cta.G.scene !== 'play' || bot.idle) continue
        const st = cta.state()
        lastAds = st.ads.map(a => a.kind).join(','); lastCl = cta.closers().map(c => c.kind + ':' + (c.real ? 'R' : 'F') + ':' + cta.topAt(c.x, c.y) + ':' + Math.round(c.x) + ',' + Math.round(c.y)).join(' '); const tt = cta.targetXY(); lastTgt = tt ? Math.round(tt.y) + ':' + cta.topAt(tt.x, tt.y) : 'none'
        if (st.blockKind === 'quiz') { const qs = cta.quizXY(); const q = (read ? qs.find(q => q.ok) : null) || qs[Math.floor(R() * qs.length)]; cta.tap(q.x, q.y); read = false; impatient = 0; continue }
        if (st.block > 0) continue
        if (st.stage !== lastStage || st.step !== lastStep) { read = false; impatient = 0; lastStage = st.stage; lastStep = st.step }
        if (st.step === 1) { const inf = cta.infoXY(); if (inf && /^other/.test(cta.topAt(inf.x, inf.y))) read = true; impatient++ }
        if (st.intro) { cta.tap(195, 400); continue }
        const tgt = cta.targetXY()
        const tgtFree = tgt && cta.topAt(tgt.x, tgt.y) === 'row:' + cta.G.target && tgt.y < innerHeight - 70 && (st.step === 0 || read || cta.G.stage === 4 || (bot.impatient && impatient > bot.impatient))
        if (bot.mash) {
          const ads = cta.adRects().sort((a, b) => b.w * b.h - a.w * a.h)
          if (ads.length) { const a = ads[0]; cta.tap(a.x, a.y + a.h * 0.25) } else if (tgtFree) cta.tap(tgt.x, tgt.y)
          continue
        }
        if (tgtFree && !(bot.waitJank && st.jank)) { tapN(tgt.x, tgt.y, bot.sigma); continue }
        // 見えている本物の×（いちばん上の広告から）
        const cs = cta.closers().filter(c => { const t = cta.topAt(c.x, c.y); return t === 'real' || t === 'fake' }).sort((a, b) => b.z - a.z)
        const real = cs.filter(c => c.real && cta.topAt(c.x, c.y) === 'real')
        const fake = cs.filter(c => !c.real)
        // 虫めがね: 全画面広告で×が見えない時、または偽の×がある時（残りの場面に1回ずつくらい配る）
        const fullNoX = st.ads.some(a => a.full) && !real.length
        const left = 5 - st.stage
        const useLens = bot.lens && st.lens > 0 && st.lensT <= 0 && (fullNoX || (fake.length && st.lens >= left))
        if (useLens) { const l = cta.lensXY(); cta.tap(l.x, l.y); continue }
        if (st.lensT <= 0 && R() > bot.know && fake.length) {
          // だまされる: 大きい偽の×か、広告の目立つボタンを押す
          if (fake.length) tapN(fake[0].x, fake[0].y, bot.sigma)
          else { const a = cta.adRects().sort((a, b) => b.z - a.z)[0]; tapN(a.x, a.y + a.h * 0.2, bot.sigma) }
          continue
        }
        if (real.length) { const c = real[0]; tapN(c.x, c.y, c.w > 20 ? 2 : bot.sigma); idleN = 0 } else { idleN++; const k = lastAds + ' | ' + lastCl + ' | ' + lastTgt + ' st' + st.stage + (st.jank ? ' JANK' : ''); idles[k] = (idles[k] || 0) + 1 }
      }
      const res = cta.result()
      const dbgInfo = Object.entries(idles).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[1] + 'x ' + e[0]).join('\n   ')
      return { dbgInfo, clears: res.clears, bill: res.sum, rank: res.rank, batt: res.batt, adSec: res.adSec, miss: res.miss, lens: res.lens, t: Math.round(cta.G.playT), gap: +cta.maxGap().toFixed(1) }
    }, [bot, 1000 + i * 37])
    out[name].push(r)
  }
}
const avg = (a, k) => +(a.reduce((s, r) => s + r[k], 0) / a.length).toFixed(1)
if (process.env.DBG) for (const [name, rs] of Object.entries(out)) for (const r of rs) if (r.dbgInfo) console.log(name, r.dbgInfo)
for (const [name, rs] of Object.entries(out)) {
  const ranks = [0, 0, 0, 0, 0]; for (const r of rs) ranks[r.rank]++
  console.log(`${name.padEnd(10)} clears ${avg(rs, 'clears')}  bill ${avg(rs, 'bill')}  batt ${avg(rs, 'batt')}  miss ${avg(rs, 'miss')}  lens ${avg(rs, 'lens')}  adSec ${avg(rs, 'adSec')}  t ${avg(rs, 't')}  gapMax ${Math.max(...rs.map(r => r.gap))}  ranks(仙人..上得意) ${ranks.join('/')}`)
}
await b.close(); server.kill()
