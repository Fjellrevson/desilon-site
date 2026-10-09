/* Render real Evade frames for the site. Reads Project Evade/evade.html (never changes it), writes a
   temp copy with test hooks (like its tests/smoke.test.js), stats to a fake endpoint so the sheet stays clean.
   Needs Playwright from the Evade repo (npm install there). Pick frames by eye, copy them to source/screenshots/.
   Usage: node tools/stage_shots.js <outdir> menu
          node tools/stage_shots.js <outdir> run <startSec> <seconds> <seed> <sub> <module> [fireEvery]
   fireEvery (s): fill the charge and fire the module that often, and save a frame every 0.15 s while it runs (m in the name).
   With the Siren it also saves every step where a torpedo is 18-70 u from the lure and over 120 u from the sub (L = u to the lure).
   A run is invincible on autopilot (the menu's S-bends), seeded. It saves a frame at three moments of every
   sonar ping (the ring at 45, 60 and 75% of its reach, echoes fresh) and just after every kill, then keeps
   only frames the sub would survive: no hit from 1 s before to 3 s after (owner 2026-10-09: no stills just
   before a death, no faded sonar). File names: time, k = how far the ring has run, n = torpedoes, s = shield up. */
const fs = require('fs'), path = require('path');
const EVADE = path.resolve(__dirname, '..', '..', 'Project Evade');   // the game repo sits next to this folder
const { chromium } = require(path.join(EVADE, 'node_modules', 'playwright'));

const [outDir, mode, ...rest] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const SRC = fs.readFileSync(EVADE + '/evade.html', 'utf8');
const BUILD = SRC.match(/const BUILD='([^']*)'/)[1];

const HOOKS = 'window.__G=()=>G;window.__store=()=>store;window.__state=()=>state;window.__draw=()=>{draw();hudUpdate();};window.__live=()=>MODULES[store.module].live(G)>0||(G.allies||[]).length>0;window.__lure=()=>{const g=G; if(!g.siren||g.sirenT<=0)return null; let b=null; for(const t of g.torps){if(t.dead)continue; const dL=Math.hypot(t.x-g.siren.x,t.y-g.siren.y), dS=Math.hypot(t.x-g.sub.x,t.y-g.sub.y); if(!b||dL<b.dL)b={dL,dS};} return b;};\n';
const STEPPER = `window.__step=sec=>{
  for(let i=0,n=Math.round(sec*120);i<n;i++){
    let dt=STEP;
    if(state==='play'){ dt*=store.fast?RATE_FAST:RATE_NORMAL;
      if(G&&!G.sub.alive&&G.deadT>=0){G.slow=0.22; dt*=G.slow;} else if(G)G.slow=1; }
    update(dt); if(i%2===1)hudUpdate();
  }
  hudUpdate();
};
function frame(now){ if(window.__frozen){last=now; requestAnimationFrame(frame); return;}\n`;
const SPLICES = [
  ['function ping(){', HOOKS + 'function ping(){'],
  ['function frame(now){\n', STEPPER],
  ['const turn=g.demo?demoTurn(g):turnInput();', 'const turn=(g.demo||window.__auto)?demoTurn(g):turnInput();'], // autopilot
  ['  if(G.god)return false;', '  if(G.god){(window.__hits=window.__hits||[]).push(G.t); return false;}'], // log would-be hits
];
let html = SRC;
for (const [a, b] of SPLICES) { if (!html.includes(a)) throw new Error('anchor missing: ' + a); html = html.replace(a, b); }
html = html.replace(/const STATS_URL='[^']*';/, "const STATS_URL='https://stats.test/exec';");
const tmp = path.join(outDir, '_evade-stage.html');
fs.writeFileSync(tmp, html);

const BOARD = { normal: [['AAAA', 'Kees', 5200], ['DSLN', 'Desilon', 3120], ['BBBB', 'Fenna', 2410]], fast: [['AAAA', 'Kees', 3100]] };

(async () => {
  const b = await chromium.launch();
  const page = async (init, query, frozen, seed) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, hasTouch: true });
    await ctx.route('https://stats.test/**', rt => {
      if (rt.request().method() === 'GET') return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(new URL(rt.request().url()).searchParams.has('save') ? {} : BOARD) });
      rt.fulfill({ status: 200, body: 'ok' });
    });
    await ctx.addInitScript(({ frozen, seed }) => {
      if (frozen) window.__frozen = true;
      let a = seed >>> 0; Math.random = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }, { frozen, seed });
    await ctx.addInitScript(init);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///' + tmp.replace(/\\/g, '/') + query);
    await p.evaluate(() => document.fonts.ready);
    await p.addStyleTag({ content: '#hud-debug{display:none!important}' });
    p.errs = errs; return p;
  };
  const save = (extra) => `localStorage.setItem('evade-v1', ${JSON.stringify(JSON.stringify(Object.assign({
    pearls: 1450, best: 3120, bestFast: 1980, bestBuild: BUILD, played: true, name: 'Desilon', nameAsk: 999, econ: 999,
    owned: ['minnow', 'ray', 'marlin'], sel: 'minnow', mods: ['overdrive', 'siren', 'infrared', 'wolfpack'], module: 'overdrive'
  }, extra)))})`;

  if (mode === 'menu') {
    const p = await page(save({}), '', false, 7);
    for (const ms of [2500, 4000, 5500, 7000]) {
      await p.waitForTimeout(ms === 2500 ? 2500 : 1500);
      await p.screenshot({ path: path.join(outDir, `menu-${ms}.png`) });
    }
    console.log('menu done', p.errs.join(' | '));
  } else {
    const [start, secs, seed, sub, mod, fireEvery] = rest;
    const p = await page(save({ sel: sub, module: mod }), `?debug&t=${start}`, true, Number(seed));
    await p.click('#menu-dive');
    await p.evaluate(() => { __G().god = true; window.__auto = true; window.__hits = []; });
    const total = Number(secs), dt = 0.05, KS = [0.45, 0.6, 0.75];
    const shots = []; let kills = 0, killAt = -1, ping = null, done = new Set(), nextFire = Number(fireEvery) || Infinity, lastLive = -1;
    for (let t = 0; t < total; t += dt) {
      await p.evaluate(s => __step(s), dt);
      if (t >= nextFire && t < total - 3 && !(await p.evaluate(() => __live()))) {
        await p.evaluate(() => { __G().charge = 100; __step(0.02); document.querySelector('#hud-module').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
        nextFire += Number(fireEvery);
      }
      const live = await p.evaluate(() => __live());
      const lure = mod === 'siren' ? await p.evaluate(() => __lure()) : null;
      const lureShot = !!lure && lure.dL > 18 && lure.dL < 70 && lure.dS > 120;
      const modShot = live && (lastLive < 0 || t - lastLive >= 0.15 - 1e-6);
      if (modShot) lastLive = t; else if (!live) lastLive = -1;
      const g = await p.evaluate(() => { const g = __G(), pg = g.pings[g.pings.length - 1];
        return { k: g.kills || 0, t: g.t, n: g.torps.length, s: g.sub.shield > 0, pk: pg ? pg.r / pg.max : -1, pid: g.pings.length && pg ? pg.max + ':' + Math.round(pg.x) + ':' + Math.round(pg.y) : null }; });
      if (g.pid !== ping) { ping = g.pid; done = new Set(); }
      const due = KS.find(k => g.pk >= k && !done.has(k));
      if (g.k > kills) { kills = g.k; killAt = g.t; }
      const afterKill = killAt >= 0 && g.t - killAt >= 0.1 && g.t - killAt < 0.1 + dt + 1e-6;
      const afterKill2 = killAt >= 0 && g.t - killAt >= 0.25 && g.t - killAt < 0.25 + dt + 1e-6;
      if (t > total - 3) continue; // the last 3 s only look ahead for hits
      if (due !== undefined || afterKill || afterKill2 || modShot || lureShot) {
        if (due !== undefined) KS.filter(k => k <= g.pk).forEach(k => done.add(k));
        await p.evaluate(() => __draw());
        const tag = `${start}-${seed}-${g.t.toFixed(2).padStart(6, '0')}-k${g.pk < 0 ? 'x' : Math.round(g.pk * 100)}${afterKill || afterKill2 ? '-kill' : ''}${live ? '-m' : ''}${lureShot ? '-L' + Math.round(lure.dL) : ''}-n${g.n}${g.s ? '-s' : ''}.png`;
        await p.screenshot({ path: path.join(outDir, tag) }); shots.push({ tag, t: g.t });
      }
    }
    const hits = await p.evaluate(() => window.__hits);
    let kept = 0;
    for (const s of shots) {
      if (hits.some(h => h >= s.t - 1 && h <= s.t + 3)) fs.unlinkSync(path.join(outDir, s.tag)); else kept++;
    }
    console.log(`run ${start}/${seed}: ${shots.length} frames, ${hits.length} hit steps, kept ${kept}`, p.errs.join(' | '));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
