/* ============================================================================
 * Fly GACA Design System — Core components (reference set)
 * File: SDfpLhiA1eLEhXxD2KB7Ij
 *
 * Builds 4 component sets that bind to the variables + styles created earlier:
 *   Button (Style x State), StatusPill (Tone), ProgressBar, Disclaimer (Variant)
 *
 * PREREQUISITE: run 01-finish-foundations.js first (needs effect/paint/text styles).
 * RUN: paste into the Scripter plugin and Run. Idempotent (skips pages that exist).
 * These were authored without live screenshot validation — verify each visually
 * and tweak. They are the template the remaining components follow.
 * ==========================================================================*/
(async () => {
  const RUN_ID = "flygaca-ds-20260624";
  const log = [];

  // ---- lookups -----------------------------------------------------------
  const allVars = await figma.variables.getLocalVariablesAsync();
  const byKey = {};
  for (const v of allVars) { const k = v.getSharedPluginData('dsb','key'); if (k) byKey[k] = v; }
  const V = (k) => { const v = byKey[k]; if (!v) throw new Error('missing var '+k); return v; };
  const effects = await figma.getLocalEffectStylesAsync();
  const paints  = await figma.getLocalPaintStylesAsync();
  const texts   = await figma.getLocalTextStylesAsync();
  const ES = (n) => effects.find(s => s.name === n);
  const PS = (n) => paints.find(s => s.name === n);
  const TS = (n) => texts.find(s => s.name === n);

  // ---- helpers -----------------------------------------------------------
  const solidVar = (colorKey) => figma.variables.setBoundVariableForPaint({ type:'SOLID', color:{r:0,g:0,b:0} }, 'color', V('color/'+colorKey));
  const RADII = ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'];
  const bindRadius = (n, key) => RADII.forEach(r => n.setBoundVariable(r, V(key)));
  const bindPad = (n, key) => ['paddingLeft','paddingRight','paddingTop','paddingBottom'].forEach(p => n.setBoundVariable(p, V(key)));
  const tag = (n, key) => { n.setSharedPluginData('dsb','run_id',RUN_ID); n.setSharedPluginData('dsb','key',key); };
  const ensurePage = (name) => { let p = figma.root.children.find(c => c.name === name && c.type==='PAGE'); if (!p) { p = figma.createPage(); p.name = name; } return p; };

  // load fonts used by the text styles we apply
  await Promise.all([
    {family:'Readex Pro',style:'Regular'},{family:'Readex Pro',style:'Medium'},
    {family:'Readex Pro',style:'SemiBold'},{family:'Readex Pro',style:'Bold'},
    {family:'JetBrains Mono',style:'Regular'},{family:'JetBrains Mono',style:'Medium'},
  ].map(f => figma.loadFontAsync(f)));

  const text = async (chars, styleName, colorKey) => {
    const t = figma.createText();
    await t.setTextStyleIdAsync(TS(styleName).id);
    t.characters = chars;
    t.fills = [solidVar(colorKey)];
    return t;
  };

  // ========================================================================
  // 1) BUTTON  — Style x State
  // ========================================================================
  if (ensurePage('Button').children.length === 0) {
    const page = ensurePage('Button');
    const styleSpec = {
      'primary':      { fill:'brand',          text:'text/on-brand', stroke:null,           sw:0 },
      'secondary':    { fill:null,             text:'link',          stroke:'brand',        sw:1 },
      'gold':         { fill:'gold',           text:'bg',            stroke:null,           sw:0 },
      'ghost':        { fill:null,             text:'text/primary',  stroke:'border-bright',sw:1 },
      'clay':         { fill:'surface-raised', text:'text/primary',  stroke:'brand',        sw:3, effect:'clay/base' },
      'clay-primary': { fill:'brand',          text:'text/on-brand', stroke:null,           sw:0, effect:'clay/base' },
    };
    const states = ['default','hover','pressed','disabled'];
    const comps = [];
    for (const [styleName, spec] of Object.entries(styleSpec)) {
      for (const state of states) {
        const c = figma.createComponent();
        c.name = `Style=${styleName}, State=${state}`;
        c.layoutMode = 'HORIZONTAL';
        c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
        c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER';
        bindPad(c, 'space/5'); c.setBoundVariable('paddingTop', V('space/3')); c.setBoundVariable('paddingBottom', V('space/3'));
        c.setBoundVariable('itemSpacing', V('space/2'));
        bindRadius(c, 'radius/pill');
        c.minHeight = 44;
        // fill
        let fillKey = spec.fill;
        if (state === 'hover' && (styleName === 'primary' || styleName === 'clay-primary')) fillKey = 'brand-hover';
        if (state === 'hover' && (styleName === 'secondary' || styleName === 'ghost')) fillKey = 'brand-tint';
        c.fills = fillKey ? [solidVar(fillKey)] : [];
        // stroke
        if (spec.stroke) { c.strokes = [solidVar(spec.stroke)]; c.strokeWeight = spec.sw; }
        // effect
        let effName = spec.effect || null;
        if (effName && state === 'hover') effName = 'clay/hover';
        if (effName && state === 'pressed') effName = 'clay/press';
        if (!effName && state === 'hover' && styleName !== 'secondary' && styleName !== 'ghost') effName = 'shadow/card';
        if (effName && ES(effName)) await c.setEffectStyleIdAsync(ES(effName).id);
        if (state === 'disabled') c.opacity = 0.45;
        // label
        const t = await text('Button', 'Small', spec.text);
        c.appendChild(t);
        tag(c, `component/button/${styleName}/${state}`);
        comps.push(c);
      }
    }
    const set = figma.combineAsVariants(comps, page);
    set.name = 'Button';
    // grid layout: rows = styles, cols = states
    const cols = states.length, colW = 200, rowH = 72;
    set.children.forEach((child, i) => { child.x = (i % cols) * colW + 24; child.y = Math.floor(i / cols) * rowH + 24; });
    tag(set, 'component-set/button');
    log.push('Button: '+comps.length+' variants');
  } else log.push('Button: skipped (page not empty)');

  // ========================================================================
  // 2) STATUSPILL  — Tone
  // ========================================================================
  if (ensurePage('StatusPill').children.length === 0) {
    const page = ensurePage('StatusPill');
    const tones = { live:'neon/green', data:'neon/cyan', success:'success', warning:'warning', danger:'danger' };
    const comps = [];
    for (const [tone, colorKey] of Object.entries(tones)) {
      const c = figma.createComponent();
      c.name = `Tone=${tone}`;
      c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode='AUTO'; c.counterAxisSizingMode='AUTO';
      c.counterAxisAlignItems='CENTER';
      c.setBoundVariable('paddingLeft', V('space/3')); c.setBoundVariable('paddingRight', V('space/3'));
      c.setBoundVariable('paddingTop', V('space/1')); c.setBoundVariable('paddingBottom', V('space/1'));
      c.setBoundVariable('itemSpacing', V('space/2'));
      bindRadius(c, 'radius/pill');
      const bg = solidVar(colorKey); bg.opacity = 0.14; c.fills = [bg];
      c.strokes = [solidVar(colorKey)]; c.strokeWeight = 1;
      const dot = figma.createEllipse(); dot.resize(8,8); dot.fills = [solidVar(colorKey)]; c.appendChild(dot);
      const t = await text('Status', 'XS', colorKey); c.appendChild(t);
      tag(c, `component/statuspill/${tone}`);
      comps.push(c);
    }
    const set = figma.combineAsVariants(comps, page);
    set.name = 'StatusPill';
    set.children.forEach((child, i) => { child.x = 24; child.y = i * 48 + 24; });
    tag(set, 'component-set/statuspill');
    log.push('StatusPill: '+comps.length+' variants');
  } else log.push('StatusPill: skipped (page not empty)');

  // ========================================================================
  // 3) PROGRESSBAR  — single component
  // ========================================================================
  if (ensurePage('ProgressBar').children.length === 0) {
    const page = ensurePage('ProgressBar');
    const c = figma.createComponent();
    c.name = 'ProgressBar'; c.resize(240, 8);
    bindRadius(c, 'radius/pill');
    c.fills = [solidVar('surface-raised')];
    c.clipsContent = true;
    const fill = figma.createRectangle(); fill.resize(150, 8); fill.x = 0; fill.y = 0;
    bindRadius(fill, 'radius/pill');
    if (PS('gradient/brand')) await fill.setFillStyleIdAsync(PS('gradient/brand').id);
    c.appendChild(fill);
    page.appendChild(c); c.x = 24; c.y = 24;
    tag(c, 'component/progressbar');
    log.push('ProgressBar: 1 component');
  } else log.push('ProgressBar: skipped (page not empty)');

  // ========================================================================
  // 4) DISCLAIMER  — Variant=full|compact
  // ========================================================================
  if (ensurePage('Disclaimer').children.length === 0) {
    const page = ensurePage('Disclaimer');
    // NOTE: load-bearing copy lives in src/i18n/{en,ar}.json (disclaimer.strong / disclaimer.body).
    // Use <Disclaimer /> in code; this is a visual placeholder only.
    const STRONG = 'Fly GACA is an independent educational platform, not affiliated with GACA.';
    const BODY = 'It helps you find and study regulation — it never replaces it. Always verify against the official GACA source.';
    const comps = [];
    for (const variant of ['full','compact']) {
      const c = figma.createComponent();
      c.name = `Variant=${variant}`;
      c.layoutMode='VERTICAL'; c.primaryAxisSizingMode='AUTO'; c.counterAxisSizingMode='FIXED';
      c.resize(360, 10);
      c.setBoundVariable('itemSpacing', V('space/1'));
      if (variant === 'full') {
        bindPad(c, 'space/4');
        c.fills = [solidVar('surface')];
        c.strokes = [solidVar('brand')]; c.strokeWeight = 3;
        bindRadius(c, 'radius/lg');
        if (ES('clay/base')) await c.setEffectStyleIdAsync(ES('clay/base').id);
      } else {
        c.setBoundVariable('paddingLeft', V('space/3')); c.setBoundVariable('paddingRight', V('space/3'));
        c.setBoundVariable('paddingTop', V('space/2')); c.setBoundVariable('paddingBottom', V('space/2'));
        c.fills = [];
      }
      const strong = await text(STRONG, 'XS', 'text/primary'); strong.layoutSizingHorizontal='FILL'; c.appendChild(strong); strong.layoutSizingHorizontal='FILL';
      const body = await text(BODY, 'XS', 'text/dim'); c.appendChild(body); body.layoutSizingHorizontal='FILL';
      tag(c, `component/disclaimer/${variant}`);
      comps.push(c);
    }
    const set = figma.combineAsVariants(comps, page);
    set.name = 'Disclaimer';
    set.children.forEach((child, i) => { child.x = 24; child.y = i * 160 + 24; });
    tag(set, 'component-set/disclaimer');
    log.push('Disclaimer: '+comps.length+' variants');
  } else log.push('Disclaimer: skipped (page not empty)');

  console.log('Core components:\n' + log.join('\n'));
  figma.closePlugin && figma.closePlugin(log.join(' | '));
})();
