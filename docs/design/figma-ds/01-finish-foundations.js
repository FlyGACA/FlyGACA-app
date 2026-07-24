/* ============================================================================
 * Fly GACA Design System — Foundations finisher
 * Completes Phase 1 in the Figma file: SDfpLhiA1eLEhXxD2KB7Ij
 *   ("Fly GACA — Design System", https://www.figma.com/design/SDfpLhiA1eLEhXxD2KB7Ij)
 *
 * Already created (via MCP, persisted in the file):
 *   - 5 collections: Primitives, Color, Spacing, Radius, Typography
 *   - 28 primitive colors, 34 semantic colors, 10 spacing, 5 radius vars
 *
 * THIS script adds the rest of the foundations:
 *   - Typography variables (font families, weights, sizes, line-heights)
 *   - Effect styles  (shadow/sm,card,pop,1,2,3 + clay/base,hover,press)
 *   - Paint styles   (gradient/brand,wing,stroke + glow/teal,sage,neon-green,neon-cyan)
 *   - Text styles    (Display,H1,H2,H3,Body-Lg,Body,Small,XS,Mono/Label,Mono/Value)
 *
 * HOW TO RUN (free, no MCP limit):
 *   1. Open the file in the Figma desktop/web app.
 *   2. Install the "Scripter" plugin (Figma Community).
 *   3. Paste this whole file into Scripter and Run.
 *   It is idempotent — safe to run more than once (skips anything already present).
 *
 * To run via the MCP `use_figma` tool instead: remove the `(async () => {`
 * wrapper and the trailing `})();`, and add `return summary;` at the end.
 *
 * Font fallbacks (this Figma account lacks these styles):
 *   Readex Pro has no Black(800) -> mapped to Bold(700)
 *   JetBrains Mono has no SemiBold(600) -> mapped to Medium(500)
 * ==========================================================================*/
(async () => {
  const RUN_ID = "flygaca-ds-20260624";
  const summary = { typographyVars: 0, effectStyles: 0, paintStyles: 0, textStyles: 0, skipped: [] };

  const hexToRgb = (hex) => {
    const c = hex.replace('#', '');
    return { r: parseInt(c.slice(0,2),16)/255, g: parseInt(c.slice(2,4),16)/255, b: parseInt(c.slice(4,6),16)/255 };
  };
  const rgba = (hex, a) => ({ ...hexToRgb(hex), a });
  // Approximate CSS-angle -> Figma gradientTransform (good enough for swatches)
  const gt = (angle) => {
    const r = angle * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [[c, s, (1 - c - s) / 2], [-s, c, (s - c + 1) / 2]];
  };

  // -------- 1. Typography variables --------------------------------------
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const typo = collections.find(c => c.getSharedPluginData('dsb','key') === 'collection/typography');
  if (!typo) throw new Error('Typography collection not found — run the MCP foundations first.');
  const typoMode = typo.modes[0].modeId;
  let allVars = await figma.variables.getLocalVariablesAsync();

  const typoItems = [
    ['font/sans','STRING','Readex Pro','FONT_FAMILY','--font-sans'],
    ['font/mono','STRING','JetBrains Mono','FONT_FAMILY','--font-mono'],
    ['weight/regular','STRING','Regular','FONT_STYLE','--fw-regular'],
    ['weight/medium','STRING','Medium','FONT_STYLE','--fw-medium'],
    ['weight/semibold','STRING','SemiBold','FONT_STYLE','--fw-semibold'],
    ['weight/bold','STRING','Bold','FONT_STYLE','--fw-bold'],
    ['weight/black','STRING','Bold','FONT_STYLE','--fw-black'],      // 800 -> Bold (fallback)
    ['size/display','FLOAT',73.6,'FONT_SIZE','--fs-display'],
    ['size/h1','FLOAT',48,'FONT_SIZE','--fs-h1'],
    ['size/h2','FLOAT',34.4,'FONT_SIZE','--fs-h2'],
    ['size/h3','FLOAT',20.8,'FONT_SIZE','--fs-h3'],
    ['size/lg','FLOAT',18.4,'FONT_SIZE','--fs-lg'],
    ['size/base','FLOAT',16,'FONT_SIZE','--fs-base'],
    ['size/sm','FLOAT',14.4,'FONT_SIZE','--fs-sm'],
    ['size/xs','FLOAT',12.48,'FONT_SIZE','--fs-xs'],
    ['lh/tight','FLOAT',115,'LINE_HEIGHT','--lh-tight'],
    ['lh/snug','FLOAT',135,'LINE_HEIGHT','--lh-snug'],
    ['lh/body','FLOAT',165,'LINE_HEIGHT','--lh-body'],
  ];
  for (const [name,type,val,scope,css] of typoItems) {
    if (allVars.find(v => v.variableCollectionId === typo.id && v.getSharedPluginData('dsb','key') === name)) {
      summary.skipped.push('var '+name); continue;
    }
    const v = figma.variables.createVariable(name, typo, type);
    v.setValueForMode(typoMode, val);
    v.scopes = [scope];
    v.setVariableCodeSyntax('WEB', `var(${css})`);
    v.setSharedPluginData('dsb','run_id',RUN_ID);
    v.setSharedPluginData('dsb','phase','phase1');
    v.setSharedPluginData('dsb','key',name);
    summary.typographyVars++;
  }

  // -------- 2. Effect styles (shadows + claymorphism) --------------------
  const DROP = (hex,a,x,y,radius,spread) => ({ type:'DROP_SHADOW', color:rgba(hex,a), offset:{x,y}, radius, spread, visible:true, blendMode:'NORMAL' });
  const INNER = (hex,a,x,y,radius,spread) => ({ type:'INNER_SHADOW', color:rgba(hex,a), offset:{x,y}, radius, spread, visible:true, blendMode:'NORMAL' });
  const COOL = '#0f1a24'; // rgba(15,26,36,*) cool shadow for light surfaces
  const effectDefs = [
    ['shadow/sm',   [DROP('#000000',0.40,0,1,2,0)]],
    ['shadow/card', [DROP('#000000',0.45,0,8,28,0)]],
    ['shadow/pop',  [DROP('#000000',0.55,0,18,50,0)]],
    ['shadow/1',    [DROP(COOL,0.04,0,1,2,0), DROP(COOL,0.06,0,1,3,0)]],
    ['shadow/2',    [DROP(COOL,0.08,0,4,8,-2), DROP(COOL,0.04,0,2,4,-2)]],
    ['shadow/3',    [DROP(COOL,0.14,0,12,24,-8), DROP(COOL,0.06,0,4,8,-4)]],
    ['clay/base',   [DROP('#000000',0.35,0,6,20,0), INNER('#ffffff',0.08,0,1,0,0)]],
    ['clay/hover',  [DROP('#000000',0.45,0,10,28,0), INNER('#ffffff',0.12,0,1,0,0)]],
    ['clay/press',  [DROP('#000000',0.30,0,2,8,0), INNER('#000000',0.20,0,2,4,0)]],
  ];
  let effectStyles = await figma.getLocalEffectStylesAsync();
  for (const [name, effects] of effectDefs) {
    if (effectStyles.find(s => s.name === name)) { summary.skipped.push('effect '+name); continue; }
    const st = figma.createEffectStyle();
    st.name = name; st.effects = effects;
    st.setSharedPluginData('dsb','run_id',RUN_ID);
    st.setSharedPluginData('dsb','key',`effect-style/${name}`);
    summary.effectStyles++;
  }

  // -------- 3. Paint styles (gradients + glows) --------------------------
  const linear = (angle, stops) => ({ type:'GRADIENT_LINEAR', gradientTransform: gt(angle), gradientStops: stops });
  const radial = (stops) => ({ type:'GRADIENT_RADIAL', gradientTransform: [[1,0,0],[0,1,0]], gradientStops: stops });
  const paintDefs = [
    ['gradient/brand',  linear(102, [{position:0,color:rgba('#2d6e8a',1)},{position:1,color:rgba('#8fc9a8',1)}])],
    ['gradient/wing',   linear(155, [{position:0,color:rgba('#4a9cb8',1)},{position:1,color:rgba('#8fc9a8',1)}])],
    ['gradient/stroke', linear(135, [{position:0,color:rgba('#0a0e12',1)},{position:0.35,color:rgba('#1a3548',1)},{position:0.70,color:rgba('#2d6e8a',1)},{position:1,color:rgba('#4a9cb8',1)}])],
    ['glow/teal',       radial([{position:0,color:rgba('#2d6e8a',0.55)},{position:0.7,color:rgba('#2d6e8a',0)},{position:1,color:rgba('#2d6e8a',0)}])],
    ['glow/sage',       radial([{position:0,color:rgba('#8fc9a8',0.40)},{position:0.7,color:rgba('#8fc9a8',0)},{position:1,color:rgba('#8fc9a8',0)}])],
    ['glow/neon-green', radial([{position:0,color:rgba('#2bffb0',0.35)},{position:0.7,color:rgba('#2bffb0',0)},{position:1,color:rgba('#2bffb0',0)}])],
    ['glow/neon-cyan',  radial([{position:0,color:rgba('#3fe0ff',0.35)},{position:0.7,color:rgba('#3fe0ff',0)},{position:1,color:rgba('#3fe0ff',0)}])],
  ];
  let paintStyles = await figma.getLocalPaintStylesAsync();
  for (const [name, paint] of paintDefs) {
    if (paintStyles.find(s => s.name === name)) { summary.skipped.push('paint '+name); continue; }
    const st = figma.createPaintStyle();
    st.name = name; st.paints = [paint];
    st.setSharedPluginData('dsb','run_id',RUN_ID);
    st.setSharedPluginData('dsb','key',`paint-style/${name}`);
    summary.paintStyles++;
  }

  // -------- 4. Text styles ----------------------------------------------
  // family, style, size(px), lineHeight(%)  — line height as PERCENT (= CSS unitless * 100)
  const textDefs = [
    ['Display',    'Readex Pro','Bold',     73.6, 115],
    ['H1',         'Readex Pro','Bold',     48,   115],
    ['H2',         'Readex Pro','Bold',     34.4, 115],
    ['H3',         'Readex Pro','SemiBold', 20.8, 135],
    ['Body-Lg',    'Readex Pro','Regular',  18.4, 165],
    ['Body',       'Readex Pro','Regular',  16,   165],
    ['Small',      'Readex Pro','Regular',  14.4, 135],
    ['XS',         'Readex Pro','Medium',   12.48,135],
    ['Mono/Label', 'JetBrains Mono','Medium', 12.48,135],
    ['Mono/Value', 'JetBrains Mono','Regular',16,   135],
  ];
  // verify + load fonts
  const avail = await figma.listAvailableFontsAsync();
  const has = (f,s) => avail.some(a => a.fontName.family === f && a.fontName.style === s);
  const fontSet = {};
  for (const [, fam, sty] of textDefs) {
    if (!has(fam, sty)) throw new Error(`Font not available: ${fam} ${sty}`);
    fontSet[fam+'|'+sty] = { family: fam, style: sty };
  }
  await Promise.all(Object.values(fontSet).map(fn => figma.loadFontAsync(fn)));
  let textStyles = await figma.getLocalTextStylesAsync();
  for (const [name, family, style, size, lhPct] of textDefs) {
    if (textStyles.find(s => s.name === name)) { summary.skipped.push('text '+name); continue; }
    const ts = figma.createTextStyle();
    ts.name = name;
    ts.fontName = { family, style };
    ts.fontSize = size;
    ts.lineHeight = { unit: 'PERCENT', value: lhPct };
    ts.letterSpacing = { unit: 'PERCENT', value: 0 };
    ts.setSharedPluginData('dsb','run_id',RUN_ID);
    ts.setSharedPluginData('dsb','key',`text-style/${name}`);
    summary.textStyles++;
  }

  console.log('Fly GACA foundations finisher complete:', JSON.stringify(summary, null, 2));
  figma.closePlugin && figma.closePlugin('Foundations finished: '
    + summary.typographyVars + ' type vars, '
    + summary.effectStyles + ' effect, '
    + summary.paintStyles + ' paint, '
    + summary.textStyles + ' text styles.');
})();
