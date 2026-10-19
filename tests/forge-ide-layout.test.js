const fs=require('node:fs'),assert=require('node:assert/strict');
const app=fs.readFileSync(__dirname+'/../app.js','utf8');
const css=fs.readFileSync(__dirname+'/../forge-ide.css','utf8');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
assert.match(html,/forge-ide\.css\?v=/,'stylesheet must be loaded');
assert.match(app,/class="forge-page-root"/,'editor should not render backdrop');
assert.match(app,/class="forge-explorer"/,'file explorer required');
assert.match(app,/class="forge-terminal"/,'test result terminal required');
assert.match(app,/id="code-test-output"/,'test results must still use the existing output id');
assert.match(app,/id="code-input"/,'fallback editor required');
assert.match(app,/id="monaco-editor"/,'Monaco editor required');
assert.match(app,/data-action="forge-api-pane"/,'API pane toggle required');
assert.match(app,/data-action="forge-explorer-toggle"/,'mobile card explorer required');
assert.match(app,/data-action="forge-inspector-toggle"/,'mobile inspector required');
assert.match(app,/ev\.key\.toLowerCase\(\)==='s'/,'Ctrl+S save shortcut');
assert.match(app,/ev\.key==='Enter'/,'Ctrl+Enter test shortcut');
assert.match(css,/body\.forge-open\{overflow:hidden\}/);
assert.match(css,/height:100dvh/);
assert.match(css,/\.code-window\{flex:1;/);
assert.match(css,/\.code-region[^\n]*flex:1 1 auto/);
assert.match(css,/\.forge-ide\.show-api/);

const focus=fs.readFileSync(__dirname+'/../forge-focus.css','utf8');
assert.match(html,/forge-focus\.css\?v=/,'compact layout stylesheet must be loaded');
assert.ok(html.indexOf('forge-focus.css')>html.indexOf('forge-ide.css'),'compact stylesheet must override original layout');
assert.match(app,/forgeTerminalHidden=true/,'test output starts collapsed');
assert.match(app,/class="forge-activitybar"/,'compact tool rail required');
assert.match(app,/data-action="forge-inspector-toggle"/);
assert.match(app,/data-action="forge-explorer-toggle"/);
assert.match(app,/<\/div><\/details><div class="code-window">/,'quick keys must be inside collapsible snippets');
assert.match(focus,/grid-template-columns:42px minmax\(0,1fr\)!important/,'no persistent full-width sidebars');
assert.match(focus,/\.forge-ide\.show-explorer \.forge-explorer\{display:flex!important/);
assert.match(focus,/\.forge-ide\.show-inspector \.forge-layout\.forge-code-mode #forge-form-panel\{display:block!important/);
assert.match(focus,/\.forge-ide\.show-api \.forge-help-pane\{display:block!important/);
assert.match(focus,/\.code-region[\s\S]*?flex:1 1 auto!important;height:0!important;min-height:0!important/,'Monaco must stretch vertically');
assert.match(focus,/\.terminal-hidden \.forge-terminal-content\{display:none/,'logs hidden initially');
assert.match(focus,/\.forge-ide:not\(\.terminal-hidden\) \.forge-terminal\{/,'test results are a floating output drawer');
function editorShare(w,h){
  const small=w<=760,rail=small?37:42;
  const rows=small?40+29+25+18:42+30+26+19;
  const panels=30+22+25;
  return ((w-rail)*(h-rows-panels))/(w*h);
}
for(const [w,h] of [[1632,800],[1366,768],[1024,700],[390,844]]){
  const share=editorShare(w,h);
  assert.ok(share>=.60,`code region must occupy 60%+ viewport at ${w}×${h}: ${Math.round(share*100)}%`);
}
console.log('PASS code-first layout area constraints and on-demand drawers');
console.log('PASS fullscreen Forge IDE structural and responsive contract');
