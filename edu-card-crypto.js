/* CHAOS RELIC EDU - encrypted single-card submission format.
 * Authenticated encryption is for confidentiality/integrity, NOT author identity.
 * A pupil who knows the shared class password can create a different valid card.
 */
(function (root) {
  'use strict';
  const utf8 = new TextEncoder(), decode = new TextDecoder('utf-8', { fatal: true });
  const MAGIC = utf8.encode('CRCARD01');
  const SALT_LEN = 16, IV_LEN = 12, ITERATIONS = 250000, MAX_BYTES = 128 * 1024;
  const fields = ['name','description','type','emoji','power','cost','resource','element','weight','effect','script'];
  function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 12)
      throw Error('提出パスワードは12文字以上にしてください（先生が指定したものを使います）');
  }
  async function derive(password, salt, usage) {
    const subtle = root.crypto?.subtle;
    if (!subtle) throw Error('暗号化にはHTTPSとWeb Cryptoに対応したブラウザーが必要です');
    const base = await subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base,
      { name:'AES-GCM', length: 256 }, false, [usage]);
  }
  function isEncrypted(bytes) {
    return bytes && bytes.length >= MAGIC.length &&
      MAGIC.every((byte, i) => bytes[i] === byte);
  }
  async function encrypt(card, password) {
    validatePassword(password);
    if (!card || typeof card !== 'object') throw Error('カードのデータが不正です');
    const payload = Object.fromEntries(fields.filter(k => card[k] !== undefined).map(k => [k,card[k]]));
    const plain = utf8.encode(JSON.stringify({ format:'chaos-relic-edu-card',version:1,card:payload }));
    if (plain.length > MAX_BYTES) throw Error('カードのデータ量が上限128KBを超えています');
    const salt=root.crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv=root.crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key=await derive(password, salt, 'encrypt');
    const cipher = new Uint8Array(await root.crypto.subtle.encrypt(
      {name:'AES-GCM',iv,additionalData:MAGIC,tagLength:128}, key, plain));
    const envelope = new Uint8Array(MAGIC.length + salt.length + iv.length + cipher.length);
    envelope.set(MAGIC,0);envelope.set(salt,MAGIC.length);
    envelope.set(iv,MAGIC.length+salt.length);envelope.set(cipher,MAGIC.length+salt.length+iv.length);
    return new Blob([envelope],{type:'application/octet-stream'});
  }
  async function decrypt(input, password) {
    validatePassword(password);
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (!isEncrypted(bytes)) throw Error('暗号化されたカード形式ではありません');
    if (bytes.length < MAGIC.length + SALT_LEN + IV_LEN + 16 || bytes.length > MAX_BYTES + 100)
      throw Error('カードファイルのサイズが不正です');
    const offset=MAGIC.length;
    const salt=bytes.slice(offset,offset+SALT_LEN), iv=bytes.slice(offset+SALT_LEN,offset+SALT_LEN+IV_LEN);
    const key=await derive(password,salt,'decrypt');
    let plain;
    try {
      plain = await root.crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:MAGIC,tagLength:128},key,bytes.slice(offset+SALT_LEN+IV_LEN));
    } catch {
      throw Error('復号に失敗しました。パスワードが違うか、提出ファイルが変更されています');
    }
    const obj=JSON.parse(decode.decode(plain));
    if (obj?.format!=='chaos-relic-edu-card'||obj.version!==1||!obj.card||
        typeof obj.card!=='object'||Array.isArray(obj.card)) throw Error('カード形式が不正です');
    return obj.card;
  }
  function download(blob,filename) {
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function exportCard(card,password) {
    const blob=await encrypt(card,password);
    download(blob,'chaos-relic-card-'+root.crypto.randomUUID().slice(0,8)+'.crcard');
  }
  root.EduCardCrypto={encrypt,decrypt,exportCard,isEncrypted};
})(typeof window !== 'undefined'?window:globalThis);
