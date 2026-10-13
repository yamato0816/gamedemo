from playwright.sync_api import sync_playwright
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<script\s+[^>]*src="[^"]*"[^>]*></script>','',html)
html=re.sub(r'<link\s+rel="stylesheet"[^>]*>','',html)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda ex:errors.append(str(ex)))
 page.set_content(html)
 page.evaluate('''() => {
  const memory = new Map();
  Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,''+v),removeItem:k=>memory.delete(k)}});
  window.history.replaceState=()=>{};
  if (!crypto.randomUUID) crypto.randomUUID=()=> '11111111-1111-4111-a111-'+Math.random().toString(36).slice(2).padEnd(12,'0');
 }''')
 page.add_style_tag(content=re.sub(r'^@import[^;]+;','',(ROOT/'style.css').read_text()))
 for file in ['tests/mock-peer.js','pycards.js','engine.js','network.js','app.js']:
  page.add_script_tag(content=(ROOT/file).read_text())
 assert '一枚で' in page.locator('h1').inner_text()
 page.screenshot(path=str(ROOT/'preview-home.png'),full_page=True)
 page.locator('#player-name').fill('研究室の魔王')
 page.locator('[data-action="create"]').click()
 page.locator('.room-code strong').wait_for(timeout=8000)
 code=page.locator('.room-code strong').inner_text();print('created room:',code)
 # simulate second player joining host authoritative engine to confirm lobby UI
 page.evaluate("() => { GameEngine.join(net.room,'friend0123456','剣士');net._broadcast() }")
 page.get_by_text('剣士',exact=True).first.wait_for()
 page.screenshot(path=str(ROOT/'preview-lobby.png'),full_page=True)
 page.locator('[data-action="editor"]').first.click()
 page.locator('#edit-name').fill('月夜の吸血槍')
 page.locator('#code-input').fill('def on_hit():\n    dealt = damage_dealt()\n    heal("self", min(8, dealt // 2))')
 page.locator('[data-action="validate"]').click()
 assert '構文OK' in page.locator('#code-feedback').inner_text(),page.locator('#code-feedback').inner_text()
 page.screenshot(path=str(ROOT/'preview-forge.png'))
 page.locator('[data-action="save-card"]').click()
 page.get_by_text('月夜の吸血槍').last.wait_for()
 page.locator('[data-action="publish"]').first.click()
 assert page.get_by_text('月夜の吸血槍').count()>=2
 page.locator('[data-action="start"]').click()
 page.locator('.arena').wait_for(timeout=5000)
 page.screenshot(path=str(ROOT/'preview-battle.png'),full_page=True)
 print('battle cards:',page.locator('.card').count())
 assert page.locator('.card').count()>=9
 assert not errors,errors
 page.set_viewport_size({'width':390,'height':844})
 page.screenshot(path=str(ROOT/'preview-mobile-battle.png'),full_page=True)
 page.locator('[data-action="editor"]').first.click()
 page.screenshot(path=str(ROOT/'preview-mobile-forge.png'),full_page=True)
 print('browser testing okay, errors:',errors)
 browser.close()
