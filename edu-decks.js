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
  function archive(cards) {
    if (!Array.isArray(cards) || !cards.length) throw Error('保存済みカードがありません');
    if (cards.length > MAX_CARDS) throw Error('カードは100枚までです');
    const clean = cards.map(card => Object.fromEntries(fields.filter(k => card[k] !== undefined).map(k => [k, card[k]])));
    const json = JSON.stringify({ format: 'chaos-relic-edu-deck', version: 1, cards: clean }, null, 2);
    const data = encoder.encode(json);
    if (data.length > MAX_UNPACKED) throw Error('ZIPに含めるカードが大きすぎます');
    const items = [zipEntry('chaos-relic-deck.json', data),
      zipEntry('README.txt', encoder.encode('CHAOS RELIC EDU deck. Import this ZIP using the card workshop. No personal information is required.\n'))];
    const parts = [], central = []; let offset = 0, centralSize = 0;
    for (const it of items) {
      parts.push(it.local, it.data);
      const h = new Uint8Array(46 + it.name.length), v = new DataView(h.buffer);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true); v.setUint16(6, 20, true);
      v.setUint16(8, 0x800, true);
      v.setUint32(16, it.crc, true); v.setUint32(20, it.data.length, true);
      v.setUint32(24, it.data.length, true); v.setUint16(28, it.name.length, true);
      v.setUint32(42, offset, true); h.set(it.name, 46);
      central.push(h); centralSize += h.length;
      offset += it.local.length + it.data.length;
    }
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, items.length, true); ev.setUint16(10, items.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  function download(cards, filename = 'chaos-relic-class-deck.zip') {
    const blob = archive(cards), url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function readZip(file) {
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
      if (!name.endsWith('.json') || name.startsWith('__MACOSX/') || name.startsWith('.')) continue;
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
          unpacked = new Uint8Array(await new Response(stream).arrayBuffer());
        } catch { throw Error('ZIPの解凍に失敗しました。Chrome/Edgeまたは無圧縮ZIPを試してください'); }
      }
      if (unpacked.length !== plainSize || crc32(unpacked) !== u32(view, pos - (46 + nameLen + extraLen + commentLen) + 16)) {
        throw Error('ZIP内のファイルの整合性チェックに失敗しました');
      }
      entries.push({ name, text: decoder.decode(unpacked) });
    }
    const combined = entries.find(x => /(^|\/)chaos-relic-deck\.json$/i.test(x.name));
    return combined ? [combined.text] : entries.map(x => x.text);
  }
  async function readFiles(files) {
    const selected = Array.from(files || []);
    if (!selected.length) throw Error('ファイルを選択してください');
    if (selected.length > 100) throw Error('ファイルは一度に100件までです');
    const texts = [];
    for (const f of selected) {
      if (/\.zip$/i.test(f.name)) texts.push(...await readZip(f));
      else if (/\.json$/i.test(f.name)) {
        if (f.size > MAX_UNPACKED) throw Error('JSONファイルが大きすぎます');
        texts.push(await f.text());
      } else throw Error('対応形式はZIPまたはJSONです：' + f.name);
    }
    const rawCards = [];
    for (const text of texts) {
      const obj = JSON.parse(text);
      const cards = Array.isArray(obj) ? obj : Array.isArray(obj.cards) ? obj.cards : [obj];
      rawCards.push(...cards);
    }
    if (!rawCards.length || rawCards.length > MAX_CARDS) throw Error('カードは1～100枚まで読み込めます');
    // Recompile every card before allowing it into the local library.
    return rawCards.map(raw => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('カードの形式が不正です');
      const normalized = root.GameEngine.card(raw, '提出作品');
      return {
        ...Object.fromEntries(fields.filter(k => normalized[k] !== undefined).map(k => [k, normalized[k]])),
        localId: root.crypto.randomUUID()
      };
    });
  }
  root.EduDecks = { archive, download, readFiles };
})(typeof window !== 'undefined' ? window : globalThis);
