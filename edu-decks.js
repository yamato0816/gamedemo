/* Portable, account-free class decks. Files never leave this browser. */
(function (root) {
  'use strict';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const MAX_CARDS = 100, MAX_UNPACKED = 8 * 1024 * 1024;
  const fields = ['name', 'description', 'type', 'emoji', 'power', 'cost', 'resource', 'element', 'weight', 'effect', 'script'];
  const u16 = (view, n) => view.getUint16(n, true);
  const u32 = (view, n) => view.getUint32(n, true);
  function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ -1) >>> 0;
  }
  function zipEntry(name, data) {
    const encodedName = encoder.encode(name);
    const local = new Uint8Array(30 + encodedName.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true); // UTF-8
    v.setUint32(14, crc32(data), true); v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true); v.setUint16(26, encodedName.length, true);
    local.set(encodedName, 30);
    return { name: encodedName, data, local, crc: crc32(data) };
  }
  function zipFiles(items) {
    const entries = items.map(item=>zipEntry(item.name,item.data));
    const parts=[],central=[];let offset=0,centralSize=0;
    for(const it of entries){
      parts.push(it.local,it.data);
      const h=new Uint8Array(46+it.name.length),v=new DataView(h.buffer);
      v.setUint32(0,0x02014b50,true);
      v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);
      v.setUint32(16,it.crc,true);v.setUint32(20,it.data.length,true);
      v.setUint32(24,it.data.length,true);v.setUint16(28,it.name.length,true);
      v.setUint32(42,offset,true);h.set(it.name,46);
      central.push(h);centralSize+=h.length;
      offset+=it.local.length+it.data.length;
    }
    const end=new Uint8Array(22),v=new DataView(end.buffer);
    v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);
    v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    return new Blob([...parts,...central,end],{type:'application/zip'});
  }
  async function archive(cards,password) {
    if(!Array.isArray(cards)||!cards.length)throw Error('保存済みカードがありません');
    if(cards.length>MAX_CARDS)throw Error('暗号化ZIPは100枚までです');
    const items=[];
    for(let i=0;i<cards.length;i++){
      const blob=await root.EduCardCrypto.encrypt(cards[i],password);
      items.push({name:'card-'+String(i+1).padStart(3,'0')+'.crcard',
        data:new Uint8Array(await blob.arrayBuffer())});
    }
    items.push({name:'README.txt',data:encoder.encode('CHAOS RELIC EDU encrypted card ZIP. Import using the game and the classroom submission password.\n')});
    return zipFiles(items);
  }
  async function download(cards,password,filename='chaos-relic-class-deck.zip'){
    const blob=await archive(cards,password),url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function readZip(file, depth = 0, budget = { bytes: 0 }) {
    if (file.size > MAX_UNPACKED) throw Error('ZIPファイルが大きすぎます（上限8MB）');
    const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (u32(view, i) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw Error('ZIPの終端情報を読み取れません');
    const count = u16(view, end + 10), dirSize = u32(view, end + 12), dirOffset = u32(view, end + 16);
    if (count > 120 || dirOffset + dirSize > end) throw Error('ZIPの構造またはファイル数が不正です');
    let pos = dirOffset, total = 0;
    const entries = [];
    for (let i = 0; i < count; i++) {
      if (pos + 46 > bytes.length || u32(view, pos) !== 0x02014b50) throw Error('ZIPのファイル一覧が壊れています');
      const flags = u16(view, pos + 8), method = u16(view, pos + 10);
      const size = u32(view, pos + 20), plainSize = u32(view, pos + 24);
      const nameLen = u16(view, pos + 28), extraLen = u16(view, pos + 30), commentLen = u16(view, pos + 32);
      const localOffset = u32(view, pos + 42);
      if (pos + 46 + nameLen + extraLen + commentLen > bytes.length) throw Error('ZIPのファイル名が不正です');
      const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
      pos += 46 + nameLen + extraLen + commentLen;
      const isJson = /\.json$/i.test(name), isCard = /\.crcard$/i.test(name), isNested = depth === 0 && /\.zip$/i.test(name);
      if ((!isJson && !isCard && !isNested) || name.startsWith('__MACOSX/') || name.startsWith('.')) continue;
      if (flags & 1 || ![0, 8].includes(method)) throw Error('暗号化・非対応形式のZIPは読み込めません');
      if (plainSize > MAX_UNPACKED || (total += plainSize) > MAX_UNPACKED) throw Error('解凍後のサイズが大きすぎます');
      if (localOffset + 30 > bytes.length || u32(view, localOffset) !== 0x04034b50) throw Error('ZIP内のファイル位置が不正です');
      const begin = localOffset + 30 + u16(view, localOffset + 26) + u16(view, localOffset + 28);
      if (begin + size > bytes.length) throw Error('ZIP内のファイルが途中で切れています');
      const raw = bytes.slice(begin, begin + size);
      let unpacked;
      if (method === 0) unpacked = raw;
      else {
        if (typeof DecompressionStream === 'undefined') throw Error('このブラウザーでは圧縮ZIPを解凍できません。Chrome/Edgeを使うかJSONファイルを読み込んでください');
        try {
          const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          const reader = stream.getReader(), output = new Uint8Array(plainSize);
          let written = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (written + value.length > plainSize) {
              await reader.cancel();
              throw Error('展開サイズが宣言値を超えています');
            }
            output.set(value, written); written += value.length;
          }
          unpacked = output.subarray(0, written);
        } catch { throw Error('ZIPの解凍に失敗しました。Chrome/Edgeまたは無圧縮ZIPを試してください'); }
      }
      if (unpacked.length !== plainSize || crc32(unpacked) !== u32(view, pos - (46 + nameLen + extraLen + commentLen) + 16)) {
        throw Error('ZIP内のファイルの整合性チェックに失敗しました');
      }
      budget.bytes += unpacked.length;
      if (budget.bytes > MAX_UNPACKED) throw Error('読み込み全体の展開サイズが8MBを超えました');
      entries.push({ name, bytes: unpacked, isNested, isCard });
    }
    const combined = entries.find(x => !x.isNested && !x.isCard && /(^|\/)chaos-relic-deck\.json$/i.test(x.name));
    if (combined) return [{ kind:'json', data:decoder.decode(combined.bytes) }];
    const result=[];
    for(const entry of entries){
      if(entry.isNested){
        result.push(...await readZip({size:entry.bytes.length,
          arrayBuffer:async()=>entry.bytes.slice().buffer},depth+1,budget));
      }else if(entry.isCard) result.push({kind:'card',data:entry.bytes});
      else result.push({kind:'json',data:decoder.decode(entry.bytes)});
    }
    return result;
  }
  async function readFiles(files, opts = {}) {
    const selected=Array.from(files||[]);
    if(!selected.length)throw Error('ファイルを選択してください');
    if(selected.length>100)throw Error('一度に100ファイルまで読み込めます');
    const entries=[], budget={bytes:0};
    for(const file of selected){
      if(/\.zip$/i.test(file.name))entries.push(...await readZip(file,0,budget));
      else if(/\.crcard$/i.test(file.name)){
        if((budget.bytes+=file.size)>MAX_UNPACKED)throw Error('読み込み合計が8MBを超えました');
        entries.push({kind:'card',data:new Uint8Array(await file.arrayBuffer())});
      }else if(/\.json$/i.test(file.name)){
        if((budget.bytes+=file.size)>MAX_UNPACKED)throw Error('読み込み合計が8MBを超えました');
        entries.push({kind:'json',data:await file.text()});
      }else throw Error('対応形式は.crcard、ZIP、JSONです：'+file.name);
    }
    if(entries.length>MAX_CARDS)throw Error('提出物は100件まで読み込めます');
    const rawCards=[];
    let password=typeof opts.password==='string'?opts.password:'';
    for(const entry of entries){
      if(entry.kind==='card'){
        if(!password&&typeof opts.requestPassword==='function')password=opts.requestPassword()||'';
        if(!password)throw Error('暗号化カードの読み込みには提出パスワードが必要です');
        rawCards.push(await root.EduCardCrypto.decrypt(entry.data,password));
      }else{
        const obj=JSON.parse(entry.data);
        const cards=Array.isArray(obj)?obj:Array.isArray(obj.cards)?obj.cards:[obj];
        rawCards.push(...cards);
      }
    }
    if(!rawCards.length||rawCards.length>MAX_CARDS)throw Error('読み込めるカードは1～100枚です');
    // Data is parsed and validated as game data; never eval strings or execute JS.
    return rawCards.map(raw=>{
      if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('カードの形式が不正です');
      const normalized=root.GameEngine.card(raw,'提出作品');
      return {...Object.fromEntries(fields.filter(k=>normalized[k]!==undefined).map(k=>[k,normalized[k]])),
        localId:root.crypto.randomUUID()};
    });
  }
  root.EduDecks = { archive, download, readFiles };
})(typeof window !== 'undefined' ? window : globalThis);
