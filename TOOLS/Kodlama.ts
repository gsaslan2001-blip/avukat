/**
 * Kodlama — mevzuat.gov.tr HTML'lerini çözer.
 *
 * Neden gerekli: Bun/Node'un TextDecoder'ı yalnızca WHATWG çekirdek kodlamalarını
 * destekler (utf-8, utf-16, latin1, ...). "windows-1254" ICU build'ine bağlı olarak
 * "Unsupported encoding label" hatası verir. mevzuat.gov.tr dosyaları ise
 * windows-1254 (Latin-5 / Türkçe) kodlamasındadır.
 *
 * Bu modül windows-1254 tablosunu açıkça taşır. UTF-8 geçerliyse UTF-8'e düşer.
 */

/** windows-1254'ün 0x80–0x9F aralığı (Latin-1'den farklı olan bölge). */
const CP1254_YUKSEK: Record<number, string> = {
  0x80: "€", // €
  0x82: "‚", // ‚
  0x83: "ƒ", // ƒ
  0x84: "„", // „
  0x85: "…", // …
  0x86: "†", // †
  0x87: "‡", // ‡
  0x88: "ˆ", // ˆ
  0x89: "‰", // ‰
  0x8a: "Š", // Š
  0x8b: "‹", // ‹
  0x8c: "Œ", // Œ
  0x91: "‘", // '
  0x92: "’", // '
  0x93: "“", // "
  0x94: "”", // "
  0x95: "•", // •
  0x96: "–", // –
  0x97: "—", // —
  0x98: "˜", // ˜
  0x99: "™", // ™
  0x9a: "š", // š
  0x9b: "›", // ›
  0x9c: "œ", // œ
  0x9f: "Ÿ", // Ÿ
};

/** Latin-5'te Latin-1'den sapan Türkçe harfler (0xA0–0xFF aralığı). */
const LATIN5_OZEL: Record<number, string> = {
  0xd0: "Ğ", // Ğ
  0xdd: "İ", // İ
  0xde: "Ş", // Ş
  0xf0: "ğ", // ğ
  0xfd: "ı", // ı
  0xfe: "ş", // ş
};

const tablo: string[] = new Array(256);
for (let b = 0; b < 256; b++) {
  if (b < 0x80) tablo[b] = String.fromCharCode(b);
  else if (LATIN5_OZEL[b]) tablo[b] = LATIN5_OZEL[b];
  else if (CP1254_YUKSEK[b]) tablo[b] = CP1254_YUKSEK[b];
  else tablo[b] = String.fromCharCode(b); // 0xA0–0xFF Latin-1 ile aynı
}

/** Baytları windows-1254 olarak çözer. */
export function windows1254Coz(buf: Uint8Array): string {
  let out = "";
  const CHUNK = 8192;
  for (let i = 0; i < buf.length; i += CHUNK) {
    const son = Math.min(i + CHUNK, buf.length);
    let parca = "";
    for (let j = i; j < son; j++) parca += tablo[buf[j]];
    out += parca;
  }
  return out;
}

/**
 * Akıllı çözücü: içerik geçerli UTF-8 ise UTF-8, değilse windows-1254.
 * mevzuat.gov.tr HTML'i her zaman geçerli UTF-8 DEĞİLDİR (0xFD gibi baytlar).
 */
export function coz(buf: Uint8Array): string {
  // UTF-8 geçerlilik testi
  try {
    const s = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    // Geçerli olsa bile Türkçe metin mi? Kontrol: yaygın Türkçe kelime
    if (/[şğıçöüŞĞİÇÖÜ]/.test(s) || /Madde|MADDE/.test(s)) return s;
  } catch {
    /* UTF-8 değil → cp1254 */
  }
  return windows1254Coz(buf);
}
