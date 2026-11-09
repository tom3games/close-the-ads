'use strict'
// うざい広告を閉じろ。スマホの画面そのものが舞台。広告を本物の×で閉じて、お題の行を押す
window.__jsUp = true
const $ = s => document.querySelector(s)
const STEP = 1 / 60
const BASE_DRAIN = 0.5          // 電池 %/秒
const LENS_SEC = 4
let lang = 'ja'
try { lang = localStorage.getItem('cta_lang') || ((navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en') } catch (e) { lang = (navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en' }
const T = () => DATA.ui[lang]
let seed = (Date.now() % 2147483646) + 1
const rnd = () => (seed = seed * 16807 % 2147483647, (seed - 1) / 2147483646)
const pick = a => a[Math.floor(rnd() * a.length)]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// ---- 音（全部録音素材）
Snd.def({
  pop: ['snd/pop1.mp3', 'snd/pop2.mp3', 'snd/pop3.mp3'], close: ['snd/close1.mp3', 'snd/close2.mp3', 'snd/close3.mp3'],
  err: ['snd/err1.mp3', 'snd/err2.mp3'], glitch: ['snd/glitch1.mp3', 'snd/glitch2.mp3'], zoom: 'snd/zoom.mp3', ok: 'snd/ok.mp3',
  coin: ['snd/coin1.mp3', 'snd/coin2.mp3', 'snd/coin3.mp3'], swish: ['snd/swish1.mp3', 'snd/swish2.mp3'], adj: ['snd/adjingle1.mp3', 'snd/adjingle2.mp3'],
  clear: 'snd/clear.mp3', result: 'snd/result.mp3', fail: 'snd/fail.mp3', paper: 'snd/paper.mp3', tick: 'snd/tick.mp3',
})
try { Snd.muted = localStorage.getItem('cta_mute') === '1' } catch (e) {}

// ---- 絵（広告の商品・アプリの中身）。全部手描きの SVG
const SV = b => `<svg viewBox="0 0 100 100" aria-hidden="true">${b}</svg>`
const ART = {
  neck: SV('<path d="M18 100 Q20 78 50 76 Q80 78 82 100Z" fill="#2f5fd0"/><rect x="43" y="26" width="14" height="52" fill="#f0c39c"/><path d="M43 40 h14 M43 54 h14 M43 66 h14" stroke="#d9a47a" stroke-width="1.5"/><circle cx="50" cy="20" r="13" fill="#f0c39c"/><path d="M37 16 Q40 4 52 6 Q63 7 63 17 Q56 10 44 12Z" fill="#2a1d14"/><circle cx="45" cy="20" r="1.8" fill="#222"/><circle cx="55" cy="20" r="1.8" fill="#222"/><path d="M45 26 Q50 30 55 26" stroke="#222" stroke-width="1.6" fill="none"/><path d="M24 30 L34 36 M76 30 L66 36 M22 48 L34 48 M78 48 L66 48" stroke="#fff" stroke-width="3.5"/>'),
  money: SV('<g transform="rotate(-8 50 60)"><rect x="14" y="56" width="66" height="30" fill="#4c9a3c" stroke="#24521b" stroke-width="2"/><rect x="18" y="48" width="66" height="30" fill="#5fb04c" stroke="#24521b" stroke-width="2"/><rect x="22" y="40" width="66" height="30" fill="#72c45e" stroke="#24521b" stroke-width="2"/><circle cx="55" cy="55" r="9" fill="none" stroke="#24521b" stroke-width="2"/></g><circle cx="26" cy="28" r="14" fill="#f6c400" stroke="#9a6d00" stroke-width="2.5"/><circle cx="26" cy="28" r="8" fill="none" stroke="#9a6d00" stroke-width="2"/><text x="72" y="30" font-size="22" font-weight="900" text-anchor="middle" fill="#fff" stroke="#c40c0c" stroke-width="1.2" font-family="sans-serif">8億</text>'),
  cattax: SV('<rect x="46" y="30" width="44" height="58" fill="#fff" stroke="#333" stroke-width="2" transform="rotate(6 68 59)"/><path d="M54 44 h28 M54 52 h28 M54 60 h22 M54 68 h26" stroke="#999" stroke-width="2" transform="rotate(6 68 59)"/><path d="M14 92 Q12 60 32 56 Q52 60 50 92Z" fill="#e2913b"/><path d="M18 40 L22 22 L32 34 L40 22 L44 40 Q46 58 31 58 Q16 58 18 40Z" fill="#e2913b"/><path d="M24 30 L26 36 M38 30 L36 36" stroke="#a85e1c" stroke-width="2"/><circle cx="26" cy="42" r="2.2" fill="#222"/><circle cx="37" cy="42" r="2.2" fill="#222"/><path d="M28 49 Q31 51 34 49" stroke="#222" stroke-width="1.5" fill="none"/><rect x="44" y="60" width="26" height="4" fill="#333" transform="rotate(-30 57 62)"/><path d="M12 46 h-8 M12 50 h-8" stroke="#555" stroke-width="1.3"/>'),
  glasses: SV('<circle cx="30" cy="52" r="18" fill="#cfefff" stroke="#111" stroke-width="5"/><circle cx="70" cy="52" r="18" fill="#cfefff" stroke="#111" stroke-width="5"/><path d="M48 50 Q50 46 52 50" stroke="#111" stroke-width="5" fill="none"/><path d="M12 48 L2 40 M88 48 L98 40" stroke="#111" stroke-width="4"/><path d="M22 44 Q26 40 30 40" stroke="#fff" stroke-width="3" fill="none"/><path d="M62 44 Q66 40 70 40" stroke="#fff" stroke-width="3" fill="none"/><path d="M50 14 L53 24 L63 24 L55 30 L58 40 L50 34 L42 40 L45 30 L37 24 L47 24Z" fill="#fff35a"/>'),
  knee: SV('<circle cx="52" cy="54" r="26" fill="#fff35a" opacity=".55"/><circle cx="52" cy="54" r="14" fill="#fffbd0" opacity=".9"/><path d="M30 8 L46 50 L30 92 L44 92 L62 52 L46 8Z" fill="#f0c39c" stroke="#b9845c" stroke-width="2"/><path d="M26 88 h22 v8 h-26Z" fill="#333"/><path d="M28 8 L48 8 L52 30 L36 32Z" fill="#2f5fd0"/>'),
  robot: SV('<g transform="rotate(28 50 70)"><rect x="30" y="40" width="40" height="40" fill="#b8c3cf" stroke="#4a5562" stroke-width="2.5"/><rect x="34" y="12" width="32" height="26" fill="#d5dde6" stroke="#4a5562" stroke-width="2.5"/><circle cx="43" cy="25" r="3.5" fill="#222"/><circle cx="57" cy="25" r="3.5" fill="#222"/><path d="M44 32 Q50 29 56 32" stroke="#222" stroke-width="2" fill="none"/><path d="M50 12 v-8" stroke="#4a5562" stroke-width="2.5"/><circle cx="50" cy="4" r="3" fill="#e2261c"/><rect x="22" y="44" width="8" height="26" fill="#9aa6b2"/><rect x="70" y="44" width="8" height="26" fill="#9aa6b2"/></g><path d="M10 92 h80" stroke="#4a5562" stroke-width="3"/><path d="M70 14 q6 -6 12 0 M76 22 q6 -6 12 0" stroke="#4aa3ff" stroke-width="2.5" fill="none"/>'),
  land: SV('<circle cx="46" cy="58" r="32" fill="#e7e2d3" stroke="#9c9682" stroke-width="2"/><circle cx="34" cy="50" r="6" fill="#cfc8b4"/><circle cx="56" cy="68" r="8" fill="#cfc8b4"/><circle cx="58" cy="44" r="4" fill="#cfc8b4"/><path d="M66 32 V6" stroke="#333" stroke-width="2.5"/><path d="M66 6 L90 12 L66 18Z" fill="#e2261c"/><rect x="58" y="28" width="16" height="6" fill="#8a6a40"/>'),
  ear: SV('<path d="M36 12 Q74 8 74 44 Q74 64 58 72 Q52 76 52 86 Q50 96 40 94 Q30 92 32 80" fill="#f0c39c" stroke="#b9845c" stroke-width="2.5"/><path d="M44 30 Q62 26 62 44 Q62 56 50 60 Q44 62 46 52 Q52 48 48 42" fill="none" stroke="#b9845c" stroke-width="3"/><circle cx="40" cy="86" r="8" fill="#f7cfae" stroke="#b9845c" stroke-width="2"/><path d="M20 86 L30 86 M18 78 L28 80 M18 94 L28 92" stroke="#e2261c" stroke-width="3"/>'),
  cloud: SV('<path d="M18 62 Q10 62 10 52 Q10 40 24 40 Q26 22 46 22 Q62 22 66 36 Q86 34 88 50 Q90 64 74 64Z" fill="#fff" stroke="#8aa7c8" stroke-width="2.5"/><circle cx="50" cy="78" r="14" fill="#f6c400" stroke="#9a6d00" stroke-width="2.5"/><text x="50" y="84" font-size="15" font-weight="900" text-anchor="middle" fill="#9a6d00" font-family="sans-serif">100</text><path d="M30 70 L34 80 M70 70 L66 80" stroke="#8aa7c8" stroke-width="2"/>'),
  castle: SV('<path d="M18 50 Q24 30 30 44 Q34 20 44 40 Q50 16 58 38 Q66 22 70 44 Q78 30 82 50Z" fill="#ff7a1a"/><path d="M26 50 Q32 38 36 48 Q42 32 50 46 Q58 32 64 48 Q70 38 74 50Z" fill="#ffd21a"/><rect x="20" y="50" width="60" height="42" fill="#8a8f99" stroke="#3b3f46" stroke-width="2"/><path d="M20 50 v-8 h8 v8 M36 50 v-8 h8 v8 M56 50 v-8 h8 v8 M72 50 v-8 h8 v8" fill="#8a8f99" stroke="#3b3f46" stroke-width="2"/><path d="M42 92 v-18 q8 -10 16 0 v18Z" fill="#3b2a1c"/><path d="M50 2 L54 12 L50 10 L46 12Z" fill="#ffd21a"/>'),
  candy: SV('<path d="M30 50 L8 34 L12 50 L8 66Z" fill="#ff5fa2" stroke="#9c1d55" stroke-width="2"/><path d="M70 50 L92 34 L88 50 L92 66Z" fill="#ff5fa2" stroke="#9c1d55" stroke-width="2"/><circle cx="50" cy="50" r="22" fill="#ff8fc0" stroke="#9c1d55" stroke-width="2.5"/><path d="M36 40 Q50 30 64 40 M34 52 Q50 42 66 52 M36 62 Q50 54 64 62" stroke="#fff" stroke-width="3" fill="none"/><path d="M66 12 q4 4 0 8 q-4 4 0 8" stroke="#555" stroke-width="2.5" fill="none"/>'),
  onigiri: SV('<path d="M50 12 Q60 12 80 52 Q92 80 72 86 L28 86 Q8 80 20 52 Q40 12 50 12Z" fill="#fff" stroke="#999" stroke-width="2.5"/><rect x="34" y="62" width="32" height="24" fill="#1d2b22"/><circle cx="40" cy="44" r="2" fill="#ddd"/><circle cx="58" cy="36" r="2" fill="#ddd"/><circle cx="62" cy="54" r="2" fill="#ddd"/><text x="50" y="52" font-size="11" font-weight="900" text-anchor="middle" fill="#c40c0c" font-family="sans-serif">具なし</text>'),
  crystal: SV('<circle cx="50" cy="46" r="30" fill="#a8d8ff" stroke="#3a6a9c" stroke-width="2.5"/><circle cx="50" cy="46" r="30" fill="#fff" opacity=".25"/><path d="M36 34 Q42 26 52 26" stroke="#fff" stroke-width="4" fill="none"/><rect x="40" y="52" width="20" height="16" rx="3" fill="#222"/><rect x="42" y="54" width="16" height="10" fill="#9fe0ff"/><path d="M26 92 L34 74 L66 74 L74 92Z" fill="#7a4a2a" stroke="#3b2414" stroke-width="2"/>'),
  phone: SV('<rect x="28" y="8" width="44" height="84" rx="7" fill="#222"/><rect x="32" y="16" width="36" height="66" fill="#eef3f8"/><rect x="34" y="34" width="32" height="26" fill="#ffd21a"/><text x="50" y="51" font-size="10" font-weight="900" text-anchor="middle" fill="#c40c0c" font-family="sans-serif">広告</text><circle cx="65" cy="35" r="2.5" fill="#888"/><path d="M8 30 L22 44 M22 30 L8 44" stroke="#e2261c" stroke-width="5"/>'),
  battery: SV('<rect x="20" y="20" width="50" height="76" rx="6" fill="#4a5562" stroke="#222" stroke-width="3"/><rect x="34" y="12" width="22" height="10" fill="#222"/><rect x="26" y="40" width="38" height="50" fill="#5fe06a"/><path d="M48 46 L36 68 L46 68 L42 86 L56 60 L46 60Z" fill="#fff"/><text x="80" y="32" font-size="13" font-weight="900" text-anchor="middle" fill="#fff" stroke="#222" stroke-width=".8" font-family="sans-serif">4kg</text>'),
  pillow: SV('<path d="M10 62 Q8 44 20 42 L80 40 Q92 42 90 60 Q92 78 80 80 L20 82 Q8 80 10 62Z" fill="#fff" stroke="#9aa6b2" stroke-width="2.5"/><path d="M20 42 Q16 40 14 46 M80 40 Q86 38 88 44" stroke="#9aa6b2" stroke-width="2" fill="none"/><rect x="48" y="6" width="44" height="26" rx="8" fill="#fff" stroke="#333" stroke-width="2"/><path d="M58 32 L54 40 L66 32" fill="#fff" stroke="#333" stroke-width="2"/><text x="70" y="24" font-size="11" font-weight="900" text-anchor="middle" fill="#333" font-family="sans-serif">むにゃ</text>'),
  bow: SV('<circle cx="62" cy="40" r="10" fill="#f0c39c"/><path d="M28 50 Q44 30 60 48 L52 60 Q40 52 32 62Z" fill="#555"/><path d="M30 60 L26 92 M40 58 L44 92" stroke="#555" stroke-width="7"/><path d="M60 50 L66 66" stroke="#555" stroke-width="6"/>'),
  ojisan: SV('<circle cx="50" cy="52" r="34" fill="#f0c39c" stroke="#b9845c" stroke-width="2"/><path d="M18 46 Q20 16 50 16 Q80 16 82 46 Q76 30 64 30 Q50 22 36 30 Q24 30 18 46Z" fill="#555"/><ellipse cx="38" cy="50" rx="7" ry="5" fill="#fff" stroke="#333" stroke-width="1.5"/><ellipse cx="62" cy="50" rx="7" ry="5" fill="#fff" stroke="#333" stroke-width="1.5"/><circle cx="41" cy="50" r="3" fill="#222"/><circle cx="65" cy="50" r="3" fill="#222"/><path d="M42 72 h16" stroke="#7a4a3a" stroke-width="3"/><path d="M30 42 l14 -2 M56 40 l14 2" stroke="#444" stroke-width="2.5"/>'),
}
const ART_EN = { '8億': '800M', '具なし': 'PLAIN', 'むにゃ': 'zzz', '>広告<': '>AD<' }
const art = k => { let h = ART[k]; if (lang !== 'ja') for (const j in ART_EN) h = h.split(j).join(ART_EN[j]); return h }
const STAR = '<svg viewBox="0 0 20 20"><polygon points="10,1 12.6,7 19,7.4 14,11.6 15.6,18 10,14.5 4.4,18 6,11.6 1,7.4 7.4,7" fill="#ffc400" stroke="#9a6d00" stroke-width="1"/></svg>'
const WX = {
  sun: '<svg class="wx" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#f5a623"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M4 20l3-3M17 7l3-3" stroke="#f5a623" stroke-width="2"/></svg>',
  cloud: '<svg class="wx" viewBox="0 0 24 24"><path d="M6 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.3 3.3 0 0 1 18 18z" fill="#9aa6b2"/></svg>',
  rain: '<svg class="wx" viewBox="0 0 24 24"><path d="M6 14a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.3 3.3 0 0 1 18 14z" fill="#7d8b99"/><path d="M8 17l-1 4M12 17l-1 4M16 17l-1 4" stroke="#2f80c9" stroke-width="2"/></svg>',
}
const CATC = ['#f4d9b0', '#cfe3f5', '#e7d5f0', '#d7efd0', '#f5d0d0', '#f1e8c4', '#d8dde6']
const catThumb = i => `<span class="thumb" style="background:${CATC[i % CATC.length]}"><svg viewBox="0 0 64 38"><path d="M20 34 Q18 20 28 18 L26 8 L33 15 L38 15 L44 8 L42 18 Q50 22 46 34Z" fill="${['#e2913b', '#555', '#f2f2f2', '#c9a57a', '#333', '#e8b46a', '#8a8f99'][i % 7]}" stroke="#333" stroke-width="1"/><path d="M46 30 Q58 28 54 18" stroke="#333" stroke-width="2.4" fill="none"/></svg></span>`
const PLAY = '<svg viewBox="0 0 12 12"><polygon points="2,1 11,6 2,11" fill="#fff"/></svg>'
const SPK = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M3 9h4l6-5v16l-6-5H3z"/></svg>'

// ---- 状態
const G = {
  scene: 'title', stage: 0, batt: 100, bill: [], miss: 0, fakeHits: 0, adSec: 0, lens: 3, lensT: 0, lensUsed: 0, clears: [false, false, false, false, false],
  ads: [], z: 10, spawnT: 0, t: 0, playT: 0, stageT: 0, intro: false, introT: 0, block: 0, blockKind: '', toastT: 0, fingerT: 0,
  target: -1, tut: 0, tutHold: false, tipsShown: {}, jank: null, inlineN: 0, mergeT: 0, ev: [], closed: 0, buyQueue: null, nextId: 1, shownMerge: false,
}
const phone = $('#phone'), layer = $('#layer'), rowsEl = $('#rows')
const LR = () => ({ w: layer.clientWidth, h: layer.clientHeight })
const ST = () => DATA.stages[G.stage]
const APP = () => DATA.apps[ST().app][lang]

function show(id) { for (const v of ['vTitle', 'vPlay', 'vEnd']) $('#' + v).hidden = v !== id; $('#corner').hidden = id === 'vPlay' }
function logEv(k) { G.ev.push([G.playT, k]) }

// ---- タイトル
function buildTitle() {
  const u = T()
  document.documentElement.lang = lang
  document.title = lang === 'ja' ? 'うざい広告を閉じろ｜偽物のバツと消えないスキップのゲーム' : 'Close the Annoying Ads'
  $('#tTitle').innerHTML = lang === 'ja' ? 'うざい<em>広告</em>を<br>閉じろ' : 'Close the<br>Annoying <em>Ads</em>'
  $('#tSub').textContent = u.sub
  $('#bStart').textContent = u.start
  $('#bHow').textContent = u.how
  $('#bLang').textContent = u.lang
  const ap = DATA.apps.weather[lang]
  $('#tScreen').innerHTML = `<div class="ts"><span>18:52</span><span>12%</span></div><div class="tb">${esc(ap.title)}</div>` +
    ap.rows.slice(0, 7).map(() => '<div class="tr"></div>').join('') +
    `<div class="mad b1" style="left:8%;top:22%;width:70%;height:24%;font-size:13px;transform:rotate(-2deg)">${esc(DATA.products[0][lang].h)}<i style="right:-3px;top:-3px"></i></div>` +
    `<div class="mad b3" style="left:24%;top:44%;width:66%;height:22%;font-size:12px">${esc(DATA.products[1][lang].h)}<i style="left:-3px;bottom:-3px"></i><b style="position:absolute;right:6px;top:6px;width:18px;height:18px;border-radius:50%;background:#fff;color:#111;font:900 12px/16px sans-serif;border:2px solid #111">×</b></div>` +
    `<div class="mad b4" style="left:0;right:0;bottom:0;height:20%;font-size:12px;border-radius:12px 12px 0 0">${esc(DATA.products[13][lang].h)}</div>`
}
function buildHow() {
  const u = T()
  $('#howH').textContent = u.howH
  const demo = `<div class="demo"><div class="b1" style="border-radius:2px">${esc(lang === 'ja' ? '今だけ' : 'Today only')}<i class="cx real dot" style="right:-5px;top:-5px;position:absolute">×</i><span class="lb">${lang === 'ja' ? '本物（小さい灰色）' : 'Real (tiny, gray)'}</span></div><div class="b3" style="border-radius:2px">${esc(lang === 'ja' ? '今だけ' : 'Today only')}<i class="cx fake big" style="right:4px;top:4px;position:absolute;width:26px;height:26px;font-size:16px;border-width:2px">×</i><span class="lb">${lang === 'ja' ? '偽物（絵の中）' : 'Fake (in the art)'}</span></div></div>`
  $('#howBody').innerHTML = `<p>${u.howBody[0]}</p>${demo}<p>${u.howBody[1]}</p><p>${u.howBody[2]}</p><small>${esc(u.credits)}<br><a href="privacy.html" target="_blank" rel="noopener">${u.privacy}</a></small>`
  $('#howClose').textContent = u.close
}
function setMuteIcons() { for (const b of document.querySelectorAll('.wv')) b.style.opacity = Snd.muted ? '0' : '1' }
function toggleMute() { Snd.setMute(!Snd.muted); try { localStorage.setItem('cta_mute', Snd.muted ? '1' : '0') } catch (e) {} setMuteIcons() }

// ---- ゲームの流れ
function startGame() {
  Snd.init()
  Snd.loop('amb', 'snd/amb_fridge.mp3', 0.2)
  Snd.loop('amb2', 'snd/amb_clock.mp3', 0.1)
  Object.assign(G, { scene: 'play', stage: 0, batt: 100, bill: [], miss: 0, fakeHits: 0, adSec: 0, lens: 3, lensT: 0, lensUsed: 0, clears: [false, false, false, false, false], t: 0, playT: 0, ev: [], closed: 0, block: 0, blockKind: '', shownMerge: false, buyQueue: null })
  phone.classList.remove('lens')
  for (const id of ['#deadOv', '#doneOv', '#buyOv', '#pageOv', '#finger', '#quiz']) $(id).hidden = true
  $('#toast').classList.remove('on'); G.toastT = 0; G.fingerT = 0; G.tut = 0; G.tutHold = false; G.jank = null
  show('vPlay')
  if (window.TM) TM.start()
  setupStage(0)
}
function clearAds() {
  for (const a of G.ads) a.el.remove()
  G.ads = []
  G.jank = null
  for (const s of rowsEl.querySelectorAll('.shimmer')) s.remove()
  Snd.loop('adsnd', null)
}
function setupStage(i) {
  G.stage = i
  clearAds()
  $('#doneOv').hidden = true; $('#quiz').hidden = true
  const st = ST(), ap = APP(), u = T()
  const rows = ap.rows
  G.target = ST().app === 'plan' ? rows.findIndex(r => r[2] === 1) : Math.floor(rnd() * rows.length)
  const tr = rows[G.target]
  G.q = ap.q(tr[0])
  G.step = 0
  G.fact = makeFact(ST().app, tr)
  G.doneText = G.fact.done
  $('#appT').textContent = ap.title
  $('#appSt').textContent = u.stageOf(i + 1, 5)
  $('#q').textContent = G.q
  document.documentElement.style.setProperty('--app', ['#2f80c9', '#d0542f', '#2e8b57', '#2b3a55', '#5a6270'][i])
  renderRows()
  const dots = document.querySelectorAll('#dots i')
  dots.forEach((d, k) => { d.className = k === i ? 'now' : (k < i ? (G.clears[k] ? 'ok' : 'ng') : '') })
  updateLens()
  G.intro = true; G.introT = 2.6
  const sd = st[lang]
  $('#intro').innerHTML = `<p class="n">${u.stageOf(i + 1, 5)}</p><p class="app">${esc(ap.title)}</p><p class="q">${esc(G.q)}</p><p class="trick"><b>${u.newTrick}</b>${esc(sd.trick)}</p><p class="tg">${u.tapToGo}</p>`
  $('#intro').hidden = false
  G.inlineN = 0; G.mergeT = 0; G.stageT = 0
}
function renderRows() {
  const ap = APP(), app = ST().app
  let h = ''
  if (app === 'recipe') h += `<div class="dish">${esc(ap.dish)}</div>`
  if (app === 'train') h += `<div class="route">${esc(ap.from)}</div>`
  ap.rows.forEach((r, i) => {
    let inner = ''
    if (app === 'weather') inner = `<span class="k">${esc(r[0])}</span>${WX[r[2]]}<span class="mid">${esc(r[1])}</span><span class="v">${r[3]}</span>`
    else if (app === 'cat') inner = `${catThumb(i).replace('</span>', `<i class="dur">${r[1]}</i></span>`)}<span class="mid">${esc(r[0])}</span>`
    else if (app === 'recipe') inner = `<span class="k" style="min-width:6em">${esc(r[0])}</span><span class="v">${esc(r[1])}</span>`
    else if (app === 'train') inner = `<span class="k">${r[0]}</span><span class="badge ${/快速|Rapid/.test(r[1]) ? 'r' : /急行|Express/.test(r[1]) ? 'e' : ''}">${esc(r[1])}</span><span class="v">${esc(r[2])}</span>`
    else inner = `<span class="mid">${esc(r[0])}</span>` + (r[2] === 1 ? `<span class="v">${esc(r[1])}</span><span class="apply">${lang === 'ja' ? '申し込む' : 'Subscribe'}</span>` : `<span class="v">${esc(r[1])}</span>`)
    h += `<div class="row" data-i="${i}">${inner}</div>`
  })
  rowsEl.innerHTML = h
  fitLayer()
}
function fitLayer() {
  const c = $('#content')
  layer.style.top = c.offsetTop + 'px'
  layer.style.height = c.offsetHeight + 'px'
}
function beginStage() {
  G.intro = false
  $('#intro').hidden = true
  G.spawnT = G.stage === 0 ? 0.6 : 0.5
  G.tut = 0
  if (G.stage === 0 && !G.tipsShown.x) { G.tut = 1; G.tutHold = true }
  else {
    // 開いた瞬間にもう広告がある（お題の行の上に）
    G.tutHold = false
    const n = [1, 2, 2, 3, 3][G.stage]
    for (let k = 0; k < n; k++) spawn(k === 0 && G.stage >= 1 ? pick(['fake', 'popup', 'flee']) : 'popup', { over: true, quiet: k > 0 })
    G.spawnT = ST().every
  }
  if (G.stage === 1 && !G.tipsShown.lens) {
    G.tipsShown.lens = 1
    toast(T().tipLens, 2.4)
    const b = $('#bLens').getBoundingClientRect(), p = phone.getBoundingClientRect()
    finger(b.left - p.left + b.width / 2, b.top - p.top - 10, 2.4)
    $('#bLens').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 600, iterations: 3 })
  }
  logEv('stage')
}
function clearStage() {
  G.clears[G.stage] = true
  Snd.play('clear', { vol: 0.8, jitter: 0 })
  clearAds()
  $('#doneOv').textContent = G.doneText
  $('#doneOv').classList.remove('ng')
  $('#doneOv').hidden = false
  block(1.5, 'done')
  logEv('clear')
}
function block(sec, kind) { G.block = sec; G.blockKind = kind }
function endBlock() {
  const k = G.blockKind; G.blockKind = ''; G.block = 0
  if (k === 'buy') {
    $('#buyOv').hidden = true
    // 戻ってきたら、さっきの広告はまだある。さらにおすすめが1つ
    if (G.ads.length < ST().max + 2 && rnd() < 0.6) spawn('reco')
  } else if (k === 'detail') {
    $('#pageOv').hidden = true
    openingAds()
  } else if (k === 'page') {
    $('#pageOv').hidden = true
    toast(T().wrong, 1.0)
  } else if (k === 'done') {
    $('#doneOv').hidden = true
    if (G.stage < 4) setupStage(G.stage + 1)
    else planGag()
  } else if (k === 'gag') { clearAds(); finish() }
  else if (k === 'dead') finish()
}
function planGag() {
  // 広告なしプランに入った記念の広告（最後のオチ）
  const ad = spawn('video', { product: DATA.products.find(p => p.id === 'noad'), gag: true })
  if (ad) { ad.cd = 99; const pill = ad.el.querySelector('.skipP'); if (pill) pill.textContent = T().planGag }
  block(2.2, 'gag')
}
function die() {
  G.batt = 0
  clearAds()
  Snd.play('fail', { vol: 0.7, jitter: 0 })
  $('#deadT').textContent = T().dead
  $('#deadOv').hidden = false
  block(1.8, 'dead')
  logEv('dead')
}

// ---- 2段目: 行を押すとページが開く（開いた瞬間に全画面広告）。中身を覚えて答える
function makeFact(app, tr) {
  const ja = lang === 'ja', u3 = (v, list, fmt) => { const c = [v]; while (c.length < 3) { const x = pick(list); if (!c.includes(x)) c.push(x) } return { ans: fmt(v), choices: c.sort(() => rnd() - 0.5).map(fmt) } }
  if (app === 'weather') {
    const pop = pick([10, 20, 30, 40, 50, 60, 70, 80, 90]), r = u3(pop, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], n => n + '%')
    const hrs = [9, 12, 15, 18, 21].map(h => `<span><i>${ja ? h + '時' : h + ':00'}</i>${WX[pick(['sun', 'cloud', 'rain'])]}</span>`).join('')
    return { ...r, q: ja ? `${tr[0]}曜の降水確率は？` : `Chance of rain on ${tr[0]}?`, done: ja ? `${tr[0]}曜の降水確率は${pop}%` : `${tr[0]}: ${pop}% chance of rain`,
      html: `<div class="dcard"><div class="dh">${WX[tr[2]]}<b>${esc(tr[0])}${ja ? '曜' : ''}</b><span>${esc(tr[1])}</span><span class="tmp">${tr[3]}</span></div><div class="hours">${hrs}</div><div class="info">${ja ? '降水確率' : 'Chance of rain'} <b>${pop}%</b></div></div>` }
  }
  if (app === 'cat') {
    const names = ja ? ['もち', 'きなこ', 'だいふく', 'こむぎ', 'ちくわ', 'ごま', 'はんぺん', 'おはぎ'] : ['Mochi', 'Kinako', 'Daifuku', 'Komugi', 'Chikuwa', 'Goma', 'Hanpen', 'Ohagi']
    const nm = pick(names), r = u3(nm, names, s => s), i = DATA.apps.cat[lang].rows.indexOf(tr)
    return { ...r, q: ja ? 'この猫の名前は？' : "What is the cat's name?", done: ja ? `${nm}の動画を見られた` : `Watched ${nm}'s video`,
      html: `<div class="dcard"><div class="player" style="background:${CATC[i % CATC.length]}">${catThumb(i).replace('class="thumb"', 'class="thumb pl"')}<span class="play">${PLAY}</span></div><div class="vt">${esc(tr[0])}</div><div class="info">${ja ? 'この猫の名前は' : "This cat's name is"} <b>${esc(nm)}</b></div><div class="vm">${ja ? '再生回数 ' + (2 + Math.floor(rnd() * 80)) + '万回' : (2 + Math.floor(rnd() * 80)) * 10 + 'K views'}</div></div>` }
  }
  if (app === 'recipe') {
    const mins = pick([5, 10, 15, 20, 25, 30]), r = u3(mins, [5, 10, 15, 20, 25, 30, 40], n => ja ? n + '分' : n + ' min')
    const ap = DATA.apps.recipe[lang]
    return { ...r, q: ja ? '何分煮る？' : 'How long to simmer?', done: ja ? `${mins}分煮る。肉じゃがができた` : `Simmer ${mins} min. Nikujaga done`,
      html: `<div class="dcard"><div class="vt">${esc(ap.dish)}</div><ol class="steps"><li>${ja ? 'じゃがいもと玉ねぎを切る' : 'Cut potatoes and onion'}</li><li>${ja ? '牛肉を炒める' : 'Brown the beef'}</li></ol><div class="info">${ja ? `${esc(tr[0])} ${esc(tr[1])}を入れて <b>${mins}分</b> 煮る` : `Add ${esc(tr[1])} ${esc(tr[0].toLowerCase())}, simmer <b>${mins} min</b>`}</div></div>` }
  }
  if (app === 'train') {
    const [h, m] = tr[0].split(':').map(Number), add = 18 + Math.floor(rnd() * 16)
    const fmt = n => { const t = h * 60 + m + n; return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
    const r = u3(add, [add - 9, add - 6, add - 4, add + 3, add + 5, add + 8], fmt)
    const ap = DATA.apps.train[lang]
    return { ...r, q: ja ? '港町に着くのは何時？' : 'When do you reach Harbor?', done: ja ? `${fmt(add)}に港町。間に合った` : `Harbor at ${fmt(add)}. Made it`,
      html: `<div class="dcard"><div class="vt">${esc(ap.from)}</div><div class="leg"><b>${tr[0]}</b> ${ja ? '駅前 発' : 'dep. Station Sq.'}<span class="badge ${/快速|Rapid/.test(tr[1]) ? 'r' : /急行|Express/.test(tr[1]) ? 'e' : ''}">${esc(tr[1])}</span> ${esc(tr[2])}</div><div class="info"><b>${fmt(add)}</b> ${ja ? '港町 着' : 'arr. Harbor'}</div><div class="vm">${ja ? '運賃 ' + (180 + Math.floor(rnd() * 12) * 10) + '円' : 'Fare ' + (180 + Math.floor(rnd() * 12) * 10) + ' yen'}</div></div>` }
  }
  return { ans: '', choices: [], q: '', done: DATA.apps.plan[lang].done(),
    html: `<div class="dcard"><div class="vt">${ja ? '広告なしプラン' : 'Ad-free plan'}</div><div class="info">${ja ? '月 <b>480円</b>' : '<b>480 yen</b> / month'}</div><div class="vm">${ja ? 'このアプリの広告が出なくなります' : 'No more ads in this app'}</div></div>` }
}
function goDetail() {
  clearAds()
  G.step = 1; G.target = 'go'
  const plan = ST().app === 'plan'
  rowsEl.innerHTML = G.fact.html + `<div class="row go" data-i="go">${plan ? (lang === 'ja' ? '申し込む' : 'Subscribe') : (lang === 'ja' ? '覚えた' : 'Got it')}</div>`
  fitLayer()
  $('#pageT').textContent = T().loadingPage
  $('#pageOv').hidden = false
  Snd.play('tick', { vol: 0.5 })
  block(0.6, 'detail')
  logEv('detail')
}
function openingAds() {
  // ページを開いた瞬間の広告（あるある）
  const s = G.stage
  if (s === 0) spawn('popup', { over: true })
  else if (rnd() < 0.65) spawn(rnd() < 0.5 ? 'inter' : 'video')
  else { spawn(pick(['fake', 'flee', 'popup']), { over: true }); spawn('popup', { over: true, quiet: true }) }
  if (s >= 3 && !hasFull()) spawn(pick(['fake', 'sound']), { over: true, quiet: true })
  G.spawnT = ST().every
  if (!G.tipsShown.read) { G.tipsShown.read = 1; toast(T().tipRead, 2.2) }
}
function openQuiz() {
  const f = G.fact
  clearAds()
  $('#quiz').innerHTML = `<div class="qd"><small>${T().quizH}</small><p>${esc(f.q)}</p>${f.choices.map((c, k) => `<button class="qa" data-k="${k}">${esc(c)}</button>`).join('')}</div>`
  $('#quiz').hidden = false
  Snd.play('ok', { vol: 0.5 })
  block(999, 'quiz')
}
function answer(k) {
  const f = G.fact
  $('#quiz').hidden = true
  G.block = 0; G.blockKind = ''
  if (f.choices[k] === f.ans) { clearStage(); return }
  // うろ覚え: 用事は失敗。次へ
  G.clears[G.stage] = false
  Snd.play('fail', { vol: 0.6, jitter: 0 })
  clearAds()
  $('#doneOv').textContent = T().wrongAns(f.ans)
  $('#doneOv').classList.add('ng')
  $('#doneOv').hidden = false
  block(1.8, 'done')
  logEv('fail')
}

// ---- 広告を作る
function productFor() {
  if (rnd() < 0.06) return pick(DATA.rare.filter(r => r.id !== 'honest'))
  if (rnd() < 0.18) return pick(DATA.looks)
  let p
  do { p = pick(DATA.products) } while (G.ads.some(a => a.p === p) && rnd() < 0.8)
  return p
}
function infoRect() {
  const r = rowsEl.querySelector('.info'); if (!r) return null
  const a = r.getBoundingClientRect(), l = layer.getBoundingClientRect()
  return { x: a.left - l.left, y: a.top - l.top, w: a.width, h: a.height, cx: a.left - l.left + a.width / 2, cy: a.top - l.top + a.height / 2 }
}
function targetRowEl() { return rowsEl.querySelector(`.row[data-i="${G.target}"]`) }
function targetRect() {
  const r = targetRowEl(); if (!r) return null
  const a = r.getBoundingClientRect(), l = layer.getBoundingClientRect()
  return { x: a.left - l.left, y: a.top - l.top, w: a.width, h: a.height, cx: a.left - l.left + a.width / 2, cy: a.top - l.top + a.height / 2 }
}
function place(w, h, over) {
  const { w: LW, h: LH } = LR(), m = 12
  w = Math.min(w, LW - 2 * m); h = Math.min(h, LH - 2 * m)
  let x, y
  const t = over ? (G.step === 1 && rnd() < 0.55 ? infoRect() : targetRect()) : null
  if (t && t.cy < LH) { x = clamp(t.cx - w / 2 + (rnd() - 0.5) * 70, m, LW - w - m); y = clamp(t.cy - h * (0.25 + 0.5 * rnd()), m, LH - h - m) }
  else { x = m + rnd() * (LW - w - 2 * m); y = m + rnd() * (LH - h - 2 * m) }
  return { x, y, w, h }
}
const CORNERS = ['tr', 'tl', 'br', 'bl']
function cornerXY(c, w, h, s = 13) {
  const o = -5
  return { x: c[1] === 'r' ? w - s - o : o, y: c[0] === 't' ? o : h - s - o }
}
function addCloser(ad, opt) {
  const el = document.createElement('i')
  el.className = 'cx ' + (opt.real ? 'real' : 'fake') + (opt.html == null ? (opt.real ? ' dot' : ' big') : '') + (opt.faint ? ' faint' : '') + (opt.cls ? ' ' + opt.cls : '')
  if (opt.html != null) el.innerHTML = opt.html; else el.textContent = '×'
  const c = { el, real: !!opt.real, type: opt.type || 'x', flee: opt.flee || 0, corner: opt.corner }
  if (opt.corner) { const p = cornerXY(opt.corner, ad.w, ad.h); el.style.left = p.x + 'px'; el.style.top = p.y + 'px' }
  if (opt.style) el.style.cssText += opt.style
  ad.el.appendChild(el)
  ad.closers.push(c)
  return c
}
const WARN = '<svg viewBox="0 0 24 24"><path d="M12 2 L23 21 H1Z" fill="#f5b400" stroke="#8a5a00" stroke-width="1"/><rect x="11" y="8" width="2.4" height="7" fill="#222"/><rect x="11" y="17" width="2.4" height="2.4" fill="#222"/></svg>'
function adBody(p, kind) {
  const t = p[lang]
  if (p.look === 'sys' && !['banner', 'inline', 'reco'].includes(kind)) return `<div class="sh">${WARN}${esc(t.h)}</div><div class="sb">${esc(t.s)}</div><div class="sm">${esc(t.more)}</div><div class="sbtn">${esc(t.btn)}</div>`
  if (p.look === 'chat' && !['banner', 'inline', 'reco'].includes(kind)) return `<div class="ch"><i></i>${esc(t.h)}</div><div class="cb">${esc(t.s)}</div><div class="cb2">${esc(t.more)}</div><div class="cr">${esc(t.btn)}</div>`
  const stars = rnd() < 0.5 ? `<div class="stars">${STAR.repeat(5)}<span>&nbsp;4.${8 + Math.floor(rnd() * 2)}</span></div>` : ''
  if (kind === 'banner' || kind === 'inline') return `<span class="tag">${T().ad}</span><div class="art">${art(p.art)}</div><div><div class="h">${esc(t.h)}</div><div class="s">${esc(t.s)}</div></div><div class="cta">${T().buy}</div>`
  if (kind === 'reco') return `<div class="rh">${T().reco}</div><div class="art">${art(p.art)}</div><div class="h">${esc(t.h)}</div>`
  return `<span class="tag">${T().ad}</span><div class="art">${art(p.art)}</div><div class="h">${esc(t.h)}</div><div class="s">${esc(t.s)}</div>${kind === 'sound' ? '' : stars}${kind === 'sound' ? '' : `<div class="cta">${kind === 'video' ? T().more : T().buy}</div>`}`
}
function floating() { return G.ads.filter(a => a.kind !== 'inline').length }
function hasFull() { return G.ads.some(a => a.full) }
function spawn(kind, o = {}) {
  const st = ST(), { w: LW, h: LH } = LR()
  const p = o.product || productFor()
  const ad = { id: G.nextId++, kind, p, closers: [], age: 0, drain: 0, full: false, x: 0, y: 0, w: 0, h: 0 }
  if (p.id === 'honest' && kind !== 'inline') ad.kind = kind = 'honest'
  const el = ad.el = document.createElement('div')
  el.dataset.id = ad.id
  const s2 = G.stage >= 1
  if (kind === 'inline') {
    el.className = `ad inline ${p.bg}`
    el.innerHTML = adBody(p, 'inline')
    ad.w = rowsEl.clientWidth; ad.h = 76
    el.style.height = ad.h + 'px'
    const tr = targetRowEl()
    const sh = rowsEl.querySelector('.shimmer')
    if (sh) sh.replaceWith(el); else rowsEl.insertBefore(el, tr)
    addCloser(ad, { real: true, style: 'right:-5px;top:-5px' })
    G.ads.push(ad); G.inlineN++
    logEv('inline')
    return ad
  }
  let r
  if (kind === 'banner') { r = { x: 12, w: LW - 24, h: 64, y: rnd() < 0.5 ? (rnd() < 0.5 ? 12 : LH - 76) : 0 }; if (!r.y) { const t = targetRect(); r.y = clamp(t ? t.cy - 32 : 100, 12, LH - 76) } }
  else if (kind === 'popup' || kind === 'fake' || kind === 'flee' || kind === 'honest') r = place(Math.min(LW - 28, 300), 230 + rnd() * 50, o.over || rnd() < 0.8)
  else if (kind === 'sound') r = place(Math.min(LW - 36, 280), 200, rnd() < 0.6)
  else if (kind === 'reco') r = o.at || place(Math.min((LW - 36) / 2, 170), 118, rnd() < 0.5)
  else if (kind === 'confirm') { const w = Math.min(LW - 48, 290), h = 196; r = { x: (LW - w) / 2, y: clamp(LH * 0.3 - h / 2 + rnd() * LH * 0.3, 12, LH - h - 12), w, h } }
  else if (kind === 'sheet') r = { x: 0, w: LW, h: 84, y: LH - 84 }
  else if (kind === 'giant') r = o.rect
  else r = { x: 0, y: 0, w: LW, h: LH }   // inter / video
  Object.assign(ad, r)
  const full = ad.full = kind === 'inter' || kind === 'video'
  el.className = `ad ${kind} ${p.bg}` + (full ? ' full' : '') + (p.look && !['banner', 'reco'].includes(kind) ? ' lk-' + p.look : '')
  if (kind === 'confirm') {
    el.className = `ad confirm`
    el.innerHTML = `<div class="qh">${T().sure}</div><div class="qs">${esc(p[lang].more || '')}</div>`
  } else if (kind === 'honest') {
    el.innerHTML = `<div class="art">${art(p.art)}</div><div class="h">${esc(p[lang].h)}</div><div class="s">${esc(p[lang].s)}</div>`
  } else el.innerHTML = adBody(p, full ? (kind === 'video' ? 'video' : 'inter') : kind)
  el.style.cssText = `left:${ad.x}px;top:${ad.y}px;width:${ad.w}px;height:${ad.h}px;z-index:${++G.z}`
  layer.appendChild(el)
  // 閉じるボタン
  if (kind === 'banner') addCloser(ad, { real: true, corner: 'tr' })
  else if (kind === 'popup' || kind === 'giant') {
    addCloser(ad, { real: true, corner: G.stage === 0 && G.tut ? 'tr' : (s2 ? pick(CORNERS) : 'tr') })
    if (kind === 'giant') { const n = 2 + Math.floor(rnd() * 2); for (let k = 0; k < n; k++) addCloser(ad, { real: false, style: `left:${10 + rnd() * (ad.w - 60)}px;top:${10 + rnd() * (ad.h - 60)}px`, cls: rnd() < 0.5 ? 'dark' : '' }); el.insertAdjacentHTML('beforeend', '<span class="gl"></span>') }
  } else if (kind === 'fake') {
    const fc = pick(['tr', 'tl'])
    addCloser(ad, { real: false, style: fc === 'tr' ? 'right:8px;top:8px' : 'left:8px;top:8px', cls: rnd() < 0.4 ? 'dark' : '' })
    addCloser(ad, { real: true, corner: pick(fc === 'tr' ? ['bl', 'br', 'tl'] : ['bl', 'br', 'tr']), faint: rnd() < 0.5 })
  } else if (kind === 'flee') addCloser(ad, { real: true, corner: pick(CORNERS), flee: 1 + (rnd() < 0.5 ? 1 : 0) })
  else if (kind === 'sound') {
    el.insertAdjacentHTML('beforeend', `<div class="spk"><i></i><i></i><i></i>${SPK}</div>`)
    addCloser(ad, { real: false, type: 'mute', cls: 'mute', html: `${SPK.replace('#fff', '#222')}${T().mute}`, style: 'position:relative;width:auto;height:auto;border:0;border-radius:6px;box-shadow:none;font:700 14px/1 var(--sys);background:#fff;color:#222' })
    addCloser(ad, { real: true, corner: pick(CORNERS) })
    ad.drain = 0.6
  } else if (kind === 'reco') addCloser(ad, { real: true, corner: 'tr' })
  else if (kind === 'confirm') {
    const w = addCloser(ad, { real: false, type: 'watch', cls: 'watch', html: esc(T().watch), style: 'position:relative;width:100%;height:auto;border:0;border-radius:8px;font:700 17px/1 var(--sys);background:#e8231a;color:#fff' })
    const c = addCloser(ad, { real: true, type: 'close', cls: 'cls', html: esc(T().doClose), style: 'position:relative;width:auto;height:auto;border-radius:0;background:none;color:#b9bcc2;font:500 11px/1 var(--sys);padding:8px 12px' })
    if (rnd() < 0.5) el.insertBefore(c.el, w.el)
  } else if (kind === 'sheet') {
    el.insertAdjacentHTML('afterbegin', '<span class="grab"></span>')
    addCloser(ad, { real: true, style: 'left:10px;top:4px' })
  } else if (kind === 'honest') addCloser(ad, { real: true, type: 'honest', cls: 'hb', html: esc(p[lang].btn), style: 'position:relative;width:auto;height:auto;border-radius:8px;background:#333;color:#fff;font:700 16px/1 var(--sys);padding:14px 30px;margin-top:10px' })
  else if (full) {
    // カウントダウン。終わると「スキップ」が本物になる。隅に薄い本物の×が隠れていることがある
    ad.cd = kind === 'video' ? 5 : (G.stage === 0 ? 3 : 4)
    ad.ext = s2 && rnd() < 0.55
    ad.lastN = -1
    el.insertAdjacentHTML('beforeend', `<div class="skipP">${T().skipIn(Math.ceil(ad.cd))}</div>${kind === 'video' ? '<div class="bar"><i></i></div>' : ''}`)
    if (s2 && rnd() < 0.6) addCloser(ad, { real: true, faint: true, style: `${rnd() < 0.5 ? 'left' : 'right'}:10px;top:10px` })
    if (kind === 'video') { ad.drain = 0.9; if (!o.gag) Snd.play('adj', { vol: 0.55 }) }
    if (s2 && kind === 'inter' && rnd() < 0.5) addCloser(ad, { real: false, style: 'right:10px;top:10px', cls: 'dark' })
    if (G.lensT > 0 && !ad.closers.some(c => c.real)) addCloser(ad, { real: true, faint: true, style: 'left:10px;top:10px' })
  }
  G.ads.push(ad)
  if (!o.quiet) Snd.play('pop', { vol: 0.6 })
  if (kind === 'sound') soundLoop()
  logEv(kind)
  return ad
}
function soundLoop() { Snd.loop('adsnd', G.ads.some(a => a.kind === 'sound') ? 'snd/sax.mp3' : null, 0.4, 0.15) }
function removeAd(ad) {
  const i = G.ads.indexOf(ad); if (i < 0) return
  G.ads.splice(i, 1)
  const el = ad.el
  if (ad.kind === 'inline') el.remove()
  else { el.classList.add('out'); setTimeout(() => el.remove(), 160) }
  if (ad.kind === 'sound') soundLoop()
}
function closeAd(ad, byPlayer) {
  removeAd(ad)
  if (!byPlayer) return
  G.closed++
  Snd.play('close', { vol: 0.7 })
  logEv('close')
  if (G.tut === 1) { G.tut = 2; G.tutHold = false; G.tipsShown.x = 1; hideFinger(); toast(T().tipRow, 2.2); const t = targetRect(); if (t && t.cy < LR().h) finger(t.cx + 30, layer.offsetTop + t.cy - 6, 2.2); G.spawnT = 2.4; return }
  const st = ST()
  if (['confirm', 'reco', 'honest'].includes(ad.kind)) return
  if (st.confirm && rnd() < st.confirm) { spawn('confirm', { product: ad.p, quiet: true }); return }
  if (st.reco && rnd() < st.reco) {
    const { w: LW, h: LH } = LR(), w = Math.min((LW - 36) / 2, 170), y = clamp(ad.y + ad.h / 2 - 59 + (rnd() - 0.5) * 60, 12, LH - 130)
    spawn('reco', { at: { x: 12, y, w, h: 118 } }); spawn('reco', { at: { x: LW - w - 12, y: clamp(y + 40 * (rnd() - 0.5), 12, LH - 130), w, h: 118 }, quiet: true })
  }
}
function fleeCloser(ad, c) {
  c.flee--
  const opts = CORNERS.filter(k => k !== c.corner)
  c.corner = pick(opts)
  const p = cornerXY(c.corner, ad.w, ad.h)
  c.el.style.left = p.x + 'px'; c.el.style.top = p.y + 'px'
  Snd.play('swish', { vol: 0.6 })
  logEv('flee')
}

// ---- 押した
function tap(x, y) {
  if (G.scene !== 'play') return 'none'
  if (G.intro) { if (G.introT < 2.3) G.introT = 0; return 'intro' }
  if (G.blockKind === 'quiz') { const e = document.elementFromPoint(x, y), qa = e && e.closest('.qa'); if (qa) { answer(+qa.dataset.k); return 'answer' } return 'blocked' }
  if (G.block > 0) return 'blocked'
  const el = document.elementFromPoint(x, y)
  if (!el || !phone.contains(el)) return 'none'
  if (el.closest('#bLens')) { useLens(); return 'lens' }
  if (el.closest('#bMute2')) { toggleMute(); return 'mute' }
  const adEl = el.closest('.ad')
  if (adEl) {
    const ad = G.ads.find(a => a.el === adEl); if (!ad) return 'none'
    const cxEl = el.closest('.cx')
    if (cxEl) {
      const c = ad.closers.find(k => k.el === cxEl)
      if (c && c.real) {
        if (c.flee > 0 && G.lensT <= 0) { fleeCloser(ad, c); return 'flee' }
        closeAd(ad, true); return 'close'
      }
      G.fakeHits++
      misTap(ad, true); return 'fake'
    }
    if (el.closest('.skipP')) return 'wait'
    if (ad.kind === 'honest') { closeAd(ad, true); return 'close' }
    misTap(ad, false); return 'body'
  }
  const row = el.closest('.row')
  if (row) {
    // 読み込み中の帯が出ている時に押すと、その瞬間に広告が差し込まれて押した所がずれる
    if (G.jank && row.dataset.i === String(G.target)) { landJank(); const e2 = document.elementFromPoint(x, y); const a2 = e2 && e2.closest('.ad'); const ad2 = a2 && G.ads.find(a => a.el === a2); if (ad2) { misTap(ad2, false); return 'jank' } }
    if (row.dataset.i === String(G.target)) {
      row.classList.add('hit')
      if (G.step === 0) { goDetail(); return 'open' }
      if (ST().app === 'plan') { clearStage(); return 'clear' }
      openQuiz(); return 'quiz'
    }
    if (G.step === 1) return 'none'
    row.classList.remove('nope'); void row.offsetWidth; row.classList.add('nope')
    G.batt -= 1.5
    $('#pageT').textContent = T().loadingPage
    $('#pageOv').hidden = false
    block(0.9, 'page')
    Snd.play('err', { vol: 0.5 })
    return 'wrong'
  }
  return 'none'
}
function misTap(ad, fake) {
  const p = ad.p
  G.miss++
  logEv('miss')
  Snd.play(fake ? 'glitch' : 'err', { vol: 0.5 })
  if (!p || !p.price) return
  G.bill.push({ p, price: p.price })
  G.batt -= 2
  const u = T()
  $('#bArt').innerHTML = art(p.art)
  $('#bT').textContent = fake ? u.fakeX : u.bought
  $('#bI').textContent = p[lang].item
  $('#bP').textContent = u.yen(p.price)
  $('#bS').textContent = /定期|月|monthly|subscription/i.test(p[lang].item) ? u.subscribed : (p[lang].more || '')
  $('#buyOv').classList.toggle('fx', fake)
  $('#buyOv').hidden = false
  phone.classList.remove('shake'); void phone.offsetWidth; phone.classList.add('shake')
  setTimeout(() => Snd.play('coin', { vol: 0.8 }), 120)
  block(1.25, 'buy')
}
function useLens() {
  if (G.lens <= 0 || G.lensT > 0) { Snd.play('err', { vol: 0.4 }); return }
  G.lens--; G.lensUsed++; G.lensT = LENS_SEC
  phone.classList.add('lens')
  // 全画面の広告は、隅に隠れた本物の×が見つかる（カウントダウンを待たなくていい）
  for (const a of G.ads) if (a.full && !a.closers.some(c => c.real && c.el.isConnected)) addCloser(a, { real: true, faint: true, style: 'left:10px;top:10px' })
  Snd.play('zoom', { vol: 0.7, jitter: 0 })
  updateLens()
  logEv('lens')
}
function updateLens() { $('#lensN').textContent = G.lens; $('#bLens').disabled = G.lens <= 0 && G.lensT <= 0; $('#bLens').classList.toggle('on', G.lensT > 0) }
function landJank() {
  if (!G.jank) return
  G.jank = null
  spawn('inline')
}

// ---- 毎フレーム
function update(dt) {
  if (G.scene !== 'play' || G.bg) return
  G.t += dt
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('#toast').classList.remove('on') }
  if (G.fingerT > 0) { G.fingerT -= dt; if (G.fingerT <= 0 && G.tut !== 1) hideFinger() }
  if (G.intro) { G.introT -= dt; if (G.introT <= 0) beginStage(); return }
  if (G.block > 0) { G.block -= dt; if (G.block <= 0) endBlock(); return }
  G.playT += dt; G.stageT += dt
  const st = ST()
  // 電池
  let drain = BASE_DRAIN
  for (const a of G.ads) drain += a.drain
  G.batt -= drain * dt
  if (G.ads.length) G.adSec += dt
  if (G.batt <= 0) { die(); return }
  // 虫めがね
  if (G.lensT > 0) { G.lensT -= dt; if (G.lensT <= 0) { phone.classList.remove('lens'); updateLens() } }
  // 広告ごと
  for (const a of [...G.ads]) {
    a.age += dt
    if (a.full && a.cd != null) {
      if (a.ext && !a.extended && a.cd <= 1) { a.extended = true; a.cd += 3; a.extT = 0.9; Snd.play('tick', { vol: 0.6 }); logEv('extend') }
      a.cd -= dt
      if (a.extT > 0) a.extT -= dt
      const pill = a.el.querySelector('.skipP')
      if (a.cd > 0) {
        const n = Math.ceil(a.cd)
        const key = n + (a.extT > 0 ? 'x' : '')
        if (pill && key !== a.lastN) { a.lastN = key; pill.textContent = a.extT > 0 ? T().extended : T().skipIn(n); pill.classList.toggle('ext', a.extT > 0) }
      } else if (pill) {
        pill.remove()
        addCloser(a, { real: true, type: 'skip', cls: 'skip', html: `${T().skip}${PLAY}`, style: 'width:auto;height:auto;border-radius:0' })
        logEv('skip')
      }
      const bar = a.el.querySelector('.bar i'); if (bar) bar.style.width = Math.min(100, a.age / (a.age + Math.max(0, a.cd)) * 100) + '%'
    }
    if (a.kind === 'sheet') {
      const LH = LR().h
      a.h = Math.min(LH, 84 + (LH - 84) * a.age / 6)
      a.y = LH - a.h
      a.el.style.top = a.y + 'px'; a.el.style.height = a.h + 'px'
      if (a.h >= LH - 0.5) { removeAd(a); spawn('video', { product: a.p, quiet: true }) }
    }
  }
  // 行の上に「読み込み中」の帯。0.8秒後に広告が差し込まれて行がずれる
  if (G.jank) { G.jank.t -= dt; if (G.jank.t <= 0) landJank() }
  // 合体（最後の場面）
  if (st.merge) {
    G.mergeT += dt
    if (G.mergeT > 2.4) { G.mergeT = 0; tryMerge() }
  }
  // 次の広告
  if (!G.tutHold || G.tut === 1) {
    G.spawnT -= dt
    if (G.spawnT <= 0) {
      if (G.tut === 1) { if (!G.ads.length) { spawn('popup', { product: DATA.products[0] }); const c = G.ads[0].closers[0].el.getBoundingClientRect(), p = phone.getBoundingClientRect(); finger(c.left - p.left - 8, c.top - p.top + 10, 99); toast(T().tipX, 99) } G.spawnT = 99 }
      else { if (!hasFull() && floating() < st.max) spawnRandom(); G.spawnT = st.every * (0.8 + 0.4 * rnd()) }
    }
  }
  // 時計（8秒で1分進む）
  const m = 52 + Math.floor(G.t / 8), hh = 18 + Math.floor(m / 60)
  const ck = `${hh}:${String(m % 60).padStart(2, '0')}`
  if ($('#clock').textContent !== ck) $('#clock').textContent = ck
}
function spawnRandom() {
  const st = ST(), ks = Object.entries(st.kinds)
  let sum = 0; for (const [, w] of ks) sum += w
  let r = rnd() * sum, kind = ks[0][0]
  for (const [k, w] of ks) { r -= w; if (r <= 0) { kind = k; break } }
  if (kind === 'inline') {
    const t = targetRect()
    if (!G.jank && G.inlineN < 2 && t && t.cy < LR().h && !G.ads.some(a => a.kind === 'inline')) {
      const sh = document.createElement('div'); sh.className = 'shimmer'
      rowsEl.insertBefore(sh, targetRowEl())
      G.jank = { t: 0.8 }
      logEv('shimmer')
      return
    }
    kind = 'popup'
  }
  if ((kind === 'video' || kind === 'inter') && G.ads.some(a => a.kind === 'sheet')) kind = 'popup'
  if (kind === 'sheet' && G.ads.some(a => a.kind === 'sheet')) kind = 'fake'
  spawn(kind)
}
function tryMerge() {
  const fl = G.ads.filter(a => !a.full && !['inline', 'confirm', 'sheet', 'honest'].includes(a.kind))
  for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) {
    const a = fl[i], b = fl[j]
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
      const { w: LW, h: LH } = LR(), m = 12
      const x = Math.max(m, Math.min(a.x, b.x)), y = Math.max(m, Math.min(a.y, b.y))
      const r = { x, y, w: Math.min(LW - m, Math.max(a.x + a.w, b.x + b.w) + 10) - x, h: Math.min(LH - m, Math.max(a.y + a.h, b.y + b.h) + 10) - y }
      removeAd(a); removeAd(b)
      spawn('giant', { rect: r, product: b.p, quiet: true })
      Snd.play('glitch', { vol: 0.6 })
      if (!G.shownMerge) { G.shownMerge = true; toast(T().merged, 1.4) }
      logEv('merge')
      return
    }
  }
}

// ---- 表示の小物
function toast(t, sec) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); G.toastT = sec }
function finger(x, y, sec) { const f = $('#finger'); f.style.left = (x - 6) + 'px'; f.style.top = y + 'px'; f.hidden = false; G.fingerT = sec }
function hideFinger() { $('#finger').hidden = true; if (G.tut !== 1 && G.toastT > 50) { G.toastT = 0; $('#toast').classList.remove('on') } }
function render() {
  if (G.scene !== 'play') return
  const b = Math.max(0, Math.ceil(G.batt))
  const bt = $('#batt b'); if (bt.textContent !== b + '%') { bt.textContent = b + '%'; $('#battFill').style.width = b + '%' }
  $('#batt').classList.toggle('low', b <= 20)
  $('#batt').classList.toggle('drain', G.ads.some(a => a.drain > 0))
  updateLens()
}

// ---- 結果（ご利用明細）
function result() {
  const clears = G.clears.filter(Boolean).length
  const sum = G.bill.reduce((s, b) => s + b.price, 0)
  const plan = G.clears[4] ? 480 : 0
  let r = clears === 5 && G.miss === 0 ? 0 : clears === 5 ? 1 : clears >= 4 ? 2 : clears >= 2 ? 3 : 4
  if (sum >= 60000) r = Math.min(4, r + 1)
  if (sum >= 150000) r = 4
  const groups = {}
  for (const b of G.bill) { const k = b.p.id; groups[k] = groups[k] || { p: b.p, n: 0, sum: 0 }; groups[k].n++; groups[k].sum += b.price }
  const lines = Object.values(groups).sort((a, b) => b.sum - a.sum)
  return { clears, sum, plan, total: sum + plan, rank: r, lines, adSec: Math.round(G.adSec), batt: Math.max(0, Math.round(G.batt)), miss: G.miss, lens: G.lensUsed }
}
function finish() {
  G.scene = 'end'
  clearAds()
  Snd.loop('amb', null); Snd.loop('amb2', null)
  const R = G.R = result()
  if (window.TM) TM.end(R.clears * 1000 - R.sum, R.clears === 5)
  renderBill()
  show('vEnd')
  Snd.play('paper', { vol: 0.8 })
  setTimeout(() => Snd.play('result', { vol: 0.8, jitter: 0 }), 650)
}
function renderBill() {
  const R = G.R, u = T(), rk = DATA.ranks[R.rank]
  const max = innerHeight < 700 ? 3 : 5
  let lines = ''
  if (!R.lines.length) lines = `<div class="ln none"><span class="it">${u.billNone}</span><span class="pr">0</span></div>`
  const shown = R.lines.length > max ? R.lines.slice(0, max - 1) : R.lines
  for (const g of shown) lines += `<div class="ln"><span class="it">${esc(g.p[lang].item)}${g.n > 1 ? ' x' + g.n : ''}</span><span class="pr">${u.yen(g.sum)}</span></div>`
  if (R.lines.length > shown.length) { const rest = R.lines.slice(shown.length); lines += `<div class="ln"><span class="it">${u.billMore(rest.reduce((s, g) => s + g.n, 0))}</span><span class="pr">${u.yen(rest.reduce((s, g) => s + g.sum, 0))}</span></div>` }
  if (R.plan) lines += `<div class="ln plan"><span class="it">${u.billPlan}</span><span class="pr">${u.yen(R.plan)}</span></div>`
  const goals = u.stageNames.map((n, i) => `<i class="${G.clears[i] ? '' : 'ng'}">${esc(n)}</i>`).join('')
  const mo = new Date().getMonth() + 1
  $('#bill').innerHTML = `<div class="bh"><b>${u.billH}</b><span>${u.billMonth(mo)}</span></div>${lines}<div class="tot"><span>${u.billTotal}</span><b>${u.yen(R.total)}</b></div>` +
    `<div class="st"><span>${u.goal}</span><span class="goals">${goals}</span></div><div class="st"><span>${u.adSec}</span><span>${R.adSec}${u.sec}</span></div><div class="st"><span>${u.battLeft}</span><span>${R.batt}%</span></div>` +
    `<div class="rank"><div id="stamp">${lang === 'ja' ? esc(rk.st).replace(/\n/g, '<br>') : esc(rk.en)}</div><p class="rc">${esc(rk[lang + 'C'])}</p></div>`
  $('#bill').classList.remove('in'); void $('#bill').offsetWidth; $('#bill').classList.add('in')
  setTimeout(() => { const s = $('#stamp'); if (s) { s.classList.add('in'); Snd.play('tick', { vol: 0.7, rate: 0.7 }) } }, 600)
  $('#bAgain').textContent = u.again; $('#bSave').textContent = u.save; $('#bPost').textContent = u.post
}
function drawCard() {
  const c = $('#card'), x = c.getContext('2d'), R = G.R, u = T(), rk = DATA.ranks[R.rank]
  const W = c.width, H = c.height
  x.fillStyle = '#2f241c'; x.fillRect(0, 0, W, H)
  x.save(); x.translate(W / 2, H / 2); x.rotate(-0.02); x.translate(-W / 2, -H / 2)
  x.fillStyle = '#fbfaf6'; x.fillRect(110, 70, W - 220, H - 140)
  const F = s => `${s}px "BIZ UDGothic","Hiragino Sans",monospace`
  x.fillStyle = '#222'; x.font = F(54); x.textBaseline = 'alphabetic'
  x.fillText(u.billH, 160, 170)
  x.font = F(34); x.fillStyle = '#555'; x.textAlign = 'right'; x.fillText(u.billMonth(new Date().getMonth() + 1), W - 160, 170); x.textAlign = 'left'
  x.fillStyle = '#222'; x.fillRect(160, 195, W - 320, 5)
  let y = 270
  const rows = R.lines.slice(0, 5).map(g => [g.p[lang].item + (g.n > 1 ? ' x' + g.n : ''), u.yen(g.sum)])
  if (!rows.length) rows.push([u.billNone, '0'])
  if (R.plan) rows.push([u.billPlan, u.yen(R.plan)])
  x.font = F(36)
  for (const [a, b] of rows) {
    let t = a; while (x.measureText(t).width > W - 640 && t.length > 2) t = t.slice(0, -1); if (t !== a) t += '...'
    x.fillStyle = '#222'; x.fillText(t, 160, y); x.textAlign = 'right'; x.fillText(b, W - 160, y); x.textAlign = 'left'; y += 62
  }
  x.setLineDash([12, 10]); x.strokeStyle = '#555'; x.lineWidth = 3; x.beginPath(); x.moveTo(160, y - 20); x.lineTo(W - 160, y - 20); x.stroke(); x.setLineDash([])
  y += 60; x.font = F(40); x.fillStyle = '#222'; x.fillText(u.billTotal, 160, y)
  x.font = F(96); x.fillStyle = '#c4140c'; x.textAlign = 'right'; x.fillText(u.yen(R.total), W - 160, y + 10); x.textAlign = 'left'
  y += 100; x.font = F(36); x.fillStyle = '#333'
  x.fillText(`${u.goal} ${R.clears}/5`, 160, y); x.textAlign = 'right'; x.fillText(`${u.adSec} ${R.adSec}${u.sec}`, W - 160, y); x.textAlign = 'left'
  // はんこ
  const cx = 330, cy = y + 230
  x.save(); x.translate(cx, cy); x.rotate(-0.25)
  x.strokeStyle = '#c4140c'; x.lineWidth = 9; x.beginPath(); x.arc(0, 0, 150, 0, 7); x.stroke(); x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 132, 0, 7); x.stroke()
  x.fillStyle = '#c4140c'; x.textAlign = 'center'; x.font = F(lang === 'ja' ? 44 : 38)
  const words = lang === 'ja' ? rk.st.split('\n') : rk.en.split(' ').reduce((a, w) => { if (a.length && (a[a.length - 1] + ' ' + w).length <= 10) a[a.length - 1] += ' ' + w; else a.push(w); return a }, [])
  words.forEach((w, i) => x.fillText(w, 0, (i - (words.length - 1) / 2) * 52 + 14))
  x.restore(); x.textAlign = 'left'
  x.fillStyle = '#333'; x.font = `700 38px "Hiragino Sans",sans-serif`
  const cm = rk[lang + 'C']; let line = '', ly = cy - 40
  for (const ch of (lang === 'ja' ? [...cm] : cm.split(' ').map((w, i, a) => i < a.length - 1 ? w + ' ' : w))) { if (x.measureText(line + ch).width > W - 640) { x.fillText(line, 520, ly); ly += 54; line = '' } line += ch }
  x.fillText(line, 520, ly)
  x.font = F(30); x.fillStyle = '#999'; x.fillText(lang === 'ja' ? 'うざい広告を閉じろ  tom3games.com' : 'Close the Annoying Ads  tom3games.com', 160, H - 120)
  x.restore()
  return c
}
async function saveCard() {
  const c = drawCard()
  if (window.TM) TM.share('save')
  const blob = await new Promise(r => c.toBlob(r, 'image/png'))
  if (!blob) return
  const file = new File([blob], 'close-the-ads.png', { type: 'image/png' })
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return } } catch (e) { if (e && e.name === 'AbortError') return }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'close-the-ads.png'; document.body.appendChild(a); a.click(); a.remove()
}
function postX() {
  const R = G.R, u = T()
  if (window.TM) TM.share('x')
  const text = u.share(DATA.ranks[R.rank][lang], R.clears, R.total.toLocaleString(), R.adSec) + (lang === 'ja' ? ' #うざい広告を閉じろ' : ' #tom3games')
  window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.com/play/close-the-ads/'), '_blank', 'noopener')
}

// ---- 入力と画面のつなぎ
phone.addEventListener('pointerdown', e => { if (e.isPrimary === false) return; e.preventDefault(); tap(e.clientX, e.clientY) })
phone.addEventListener('contextmenu', e => e.preventDefault())
$('#bStart').addEventListener('click', () => { Snd.play('ok', { vol: 0.6 }); startGame() })
$('#bHow').addEventListener('click', () => { buildHow(); $('#how').hidden = false })
$('#howClose').addEventListener('click', () => { $('#how').hidden = true })
$('#bLang').addEventListener('click', () => { lang = lang === 'ja' ? 'en' : 'ja'; try { localStorage.setItem('cta_lang', lang) } catch (e) {} buildTitle(); buildHow(); if (G.scene === 'end') renderBill() })
$('#bMute').addEventListener('click', () => { Snd.init(); toggleMute() })
$('#bAgain').addEventListener('click', () => { Snd.play('ok', { vol: 0.6 }); startGame() })
$('#bSave').addEventListener('click', saveCard)
$('#bPost').addEventListener('click', postX)
addEventListener('resize', () => { if (G.scene === 'play') fitLayer() })
document.addEventListener('visibilitychange', () => { G.bg = document.hidden; if (!document.hidden) last = performance.now() })

// ---- 時計（固定60Hz・performance.now で数える）
let acc = 0, last = performance.now(), paused = false
function frame() {
  const now = performance.now()
  let d = (now - last) / 1000; last = now
  if (d > 0.25) d = 0.25
  if (!paused) { acc += d; while (acc >= STEP) { update(STEP); acc -= STEP } }
  render()
  requestAnimationFrame(frame)
}

// ---- 検証用の窓口
const rectOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } }
window.cta = {
  G, tap, startGame, result: () => result(), setup: i => setupStage(i), finish: () => finish(), drawCard: () => drawCard(),
  seed: n => { seed = n % 2147483646 + 1 },
  state: () => ({ scene: G.scene, stage: G.stage, batt: G.batt, intro: G.intro, block: G.block, blockKind: G.blockKind, ads: G.ads.map(a => ({ id: a.id, kind: a.kind, full: a.full, cd: a.cd })), lens: G.lens, lensT: G.lensT, clears: G.clears.slice(), miss: G.miss, bill: G.bill.reduce((s, b) => s + b.price, 0), jank: !!G.jank, playT: G.playT, tut: G.tut, step: G.step }),
  closers: () => G.ads.flatMap(a => a.closers.filter(c => c.el.isConnected).map(c => ({ ad: a.id, kind: a.kind, real: c.real, type: c.type, flee: c.flee, z: +a.el.style.zIndex || 0, ...rectOf(c.el) }))),
  adRects: () => G.ads.map(a => ({ id: a.id, kind: a.kind, full: a.full, z: +a.el.style.zIndex || 0, ...rectOf(a.el) })),
  infoXY: () => { const r = rowsEl.querySelector('.info'); return r ? rectOf(r) : null },
  quizXY: () => [...document.querySelectorAll('#quiz .qa')].map(b => ({ k: +b.dataset.k, ok: b.textContent === G.fact.ans, ...rectOf(b) })),
  targetXY: () => { const r = targetRowEl(); return r ? rectOf(r) : null },
  rowXY: i => { const r = rowsEl.querySelector(`.row[data-i="${i}"]`); return r ? rectOf(r) : null },
  lensXY: () => rectOf($('#bLens')),
  topAt: (x, y) => { const e = document.elementFromPoint(x, y); if (!e) return 'none'; if (e.closest('.cx')) return e.closest('.cx').classList.contains('real') ? 'real' : 'fake'; if (e.closest('.ad')) return 'ad'; if (e.closest('.row')) return 'row:' + e.closest('.row').dataset.i; return 'other:' + (e.id || e.className || e.tagName) },
  spawn: (k, o) => spawn(k, o), maxGap: () => { const t = G.ev.map(e => e[0]).sort((a, b) => a - b); let m = 0; for (let i = 1; i < t.length; i++) m = Math.max(m, t[i] - t[i - 1]); return m },
  events: () => G.ev.slice(),
  dbg: { pause: on => { paused = !!on; last = performance.now(); acc = 0 }, step: n => { for (let i = 0; i < (n || 1); i++) update(STEP); render() } },
}

// ---- 起動（ロード画面は本物の読み込み数で進む。12秒で必ず消す）
buildTitle(); buildHow(); setMuteIcons()
show('vTitle')
requestAnimationFrame(frame)
;(function boot() {
  const jobs = []
  if (document.fonts && document.fonts.load) {
    jobs.push(document.fonts.load('20px "Mochiy Pop One"', 'うざい広告を閉じろ今だけスマホを開く'))
    jobs.push(document.fonts.load('16px "BIZ UDGothic"', 'ご利用明細合計円'))
  }
  let done = 0
  const bar = $('#loadBar i'), total = jobs.length + 1
  const step = () => { done++; bar.style.width = Math.round(done / total * 100) + '%' }
  step()
  const cap = new Promise(r => setTimeout(r, 2500))
  Promise.race([Promise.all(jobs.map(j => j.then(step, step))), cap]).then(() => {
    bar.style.width = '100%'
    const l = $('#loading'); l.style.opacity = '0'
    setTimeout(() => { l.hidden = true; window.__ctaReady = true }, 250)
  })
  setTimeout(() => { const l = $('#loading'); if (!l.hidden) { l.hidden = true; window.__ctaReady = true } }, 12000)
})()
