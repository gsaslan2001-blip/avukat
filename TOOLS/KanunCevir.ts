#!/usr/bin/env bun
/**
 * KanunCevir — mevzuat.gov.tr HTML'ini madde-bazlı, aranabilir Markdown'a çevirir.
 *
 * Kullanım:
 *   bun TOOLS/KanunCevir.ts <girdi.htm> <cikti.md> [--ad "Kanun Adı"] [--no "5237"]
 *   bun TOOLS/KanunCevir.ts --tumu                 # .tmp/ altındaki tüm .htm dosyalarını çevir
 *
 * Kaynak kodlama windows-1254 (Latin-5). UTF-8 decode Türkçe karakterleri bozar.
 * Çıktı biçimi: `## Madde N` başlıkları + yapısal başlıklar `### ...` olarak.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { coz } from "./Kodlama.ts";

// ---------------------------------------------------------------------------
// Kanun kataloğu: kaynak URL parçası → künye
// ---------------------------------------------------------------------------
export interface KanunMeta {
  no: string;
  ad: string;
  kisa: string;
  kabul: string;
  tertip: string; // ör. "1.5" (Tertip 5)
  dosya: string;  // çıktı dosya adı (uzantısız)
  alan: string;   // hukuk alanı
}

export const KANUNLAR: KanunMeta[] = [
  { no: "5237", ad: "Türk Ceza Kanunu", kisa: "TCK", kabul: "26/09/2004", tertip: "1.5", dosya: "5237_TCK_Turk_Ceza_Kanunu", alan: "Ceza" },
  { no: "5271", ad: "Ceza Muhakemesi Kanunu", kisa: "CMK", kabul: "04/12/2004", tertip: "1.5", dosya: "5271_CMK_Ceza_Muhakemesi_Kanunu", alan: "Ceza" },
  { no: "5275", ad: "Ceza ve Güvenlik Tedbirlerinin İnfazı Hakkında Kanun", kisa: "CGTİHK", kabul: "13/12/2004", tertip: "1.5", dosya: "5275_CGTIHK_Infaz_Kanunu", alan: "Ceza" },
  { no: "6100", ad: "Hukuk Muhakemeleri Kanunu", kisa: "HMK", kabul: "12/01/2011", tertip: "1.5", dosya: "6100_HMK_Hukuk_Muhakemeleri_Kanunu", alan: "Usul" },
  { no: "6098", ad: "Türk Borçlar Kanunu", kisa: "TBK", kabul: "11/01/2011", tertip: "1.5", dosya: "6098_TBK_Turk_Borclar_Kanunu", alan: "Özel Hukuk" },
  { no: "6102", ad: "Türk Ticaret Kanunu", kisa: "TTK", kabul: "13/01/2011", tertip: "1.5", dosya: "6102_TTK_Turk_Ticaret_Kanunu", alan: "Ticaret" },
  { no: "4721", ad: "Türk Medenî Kanunu", kisa: "TMK", kabul: "22/11/2001", tertip: "1.5", dosya: "4721_TMK_Turk_Medeni_Kanunu", alan: "Özel Hukuk" },
  { no: "2004", ad: "İcra ve İflâs Kanunu", kisa: "İİK", kabul: "09/06/1932", tertip: "1.3", dosya: "2004_IIK_Icra_ve_Iflas_Kanunu", alan: "İcra" },
  { no: "4857", ad: "İş Kanunu", kisa: "İşK", kabul: "22/05/2003", tertip: "1.5", dosya: "4857_Is_Kanunu", alan: "İş" },
  { no: "6502", ad: "Tüketicinin Korunması Hakkında Kanun", kisa: "TKHK", kabul: "07/11/2013", tertip: "1.5", dosya: "6502_TKHK_Tuketici_Kanunu", alan: "Tüketici" },
  { no: "2577", ad: "İdari Yargılama Usulü Kanunu", kisa: "İYUK", kabul: "06/01/1982", tertip: "1.5", dosya: "2577_IYUK_Idari_Yargilama_Usulu", alan: "İdari" },
  { no: "6325", ad: "Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu", kisa: "Arabuluculuk", kabul: "07/06/2012", tertip: "1.5", dosya: "6325_Arabuluculuk_Kanunu", alan: "Usul" },
  { no: "7036", ad: "İş Mahkemeleri Kanunu", kisa: "İMK", kabul: "20/10/2017", tertip: "1.5", dosya: "7036_Is_Mahkemeleri_Kanunu", alan: "İş" },
  { no: "634", ad: "Kat Mülkiyeti Kanunu", kisa: "KMK", kabul: "23/06/1965", tertip: "1.4", dosya: "634_KMK_Kat_Mulkiyeti_Kanunu", alan: "Özel Hukuk" },
  { no: "6183", ad: "Amme Alacaklarının Tahsil Usulü Hakkında Kanun", kisa: "AATUHK", kabul: "21/07/1953", tertip: "1.3", dosya: "6183_AATUHK_Amme_Alacaklari", alan: "Vergi" },
  { no: "1136", ad: "Avukatlık Kanunu", kisa: "AvK", kabul: "19/03/1969", tertip: "1.4", dosya: "1136_Avukatlik_Kanunu", alan: "Meslek" },
  { no: "7201", ad: "Tebligat Kanunu", kisa: "TebK", kabul: "11/02/1959", tertip: "1.3", dosya: "7201_Tebligat_Kanunu", alan: "Usul" },
  { no: "3095", ad: "Belirli ve Sabit Olmayan Sürelerde Faiz Yürütülmesi Hakkında Kanun", kisa: "FaizK", kabul: "19/12/1984", tertip: "1.5", dosya: "3095_Faiz_Kanunu", alan: "Usul" },
  { no: "5235", ad: "Adlî Yargı İlk Derece Mahkemeleri ile Bölge Adliye Mahkemelerinin Kuruluş, Görev ve Yetkileri Hakkında Kanun", kisa: "AdlîYargıK", kabul: "26/09/2004", tertip: "1.5", dosya: "5235_Adli_Yargi_Kanunu", alan: "Usul" },
  // --- Üst normlar ve özel ceza kanunları ---
  { no: "2709", ad: "Türkiye Cumhuriyeti Anayasası", kisa: "AY", kabul: "18/10/1982", tertip: "1.5", dosya: "2709_Anayasa", alan: "Anayasal" },
  { no: "5326", ad: "Kabahatler Kanunu", kisa: "KabK", kabul: "30/03/2005", tertip: "1.5", dosya: "5326_Kabahatler_Kanunu", alan: "Ceza" },
  { no: "6136", ad: "Ateşli Silahlar ve Bıçaklar ile Diğer Aletler Hakkında Kanun", kisa: "6136", kabul: "10/07/1953", tertip: "1.5", dosya: "6136_Atesli_Silahlar_Kanunu", alan: "Ceza" },
  { no: "5607", ad: "Kaçakçılıkla Mücadele Kanunu", kisa: "KaçK", kabul: "21/03/2007", tertip: "1.5", dosya: "5607_Kacakcilik_Kanunu", alan: "Ceza" },
  { no: "2918", ad: "Karayolları Trafik Kanunu", kisa: "KTK", kabul: "13/10/1983", tertip: "1.5", dosya: "2918_Karayollari_Trafik_Kanunu", alan: "Ceza" },
  { no: "6284", ad: "Ailenin Korunması ve Kadına Karşı Şiddetin Önlenmesine Dair Kanun", kisa: "6284", kabul: "08/03/2012", tertip: "1.5", dosya: "6284_Ailenin_Korunmasi_Kanunu", alan: "Aile/Ceza" },
];

// ---------------------------------------------------------------------------
// Metin temizleme
// ---------------------------------------------------------------------------
const ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&apos;": "'", "&ouml;": "ö", "&uuml;": "ü", "&ccedil;": "ç", "&sect;": "§",
  "&deg;": "°", "&frac12;": "½", "&hellip;": "…", "&ndash;": "–", "&mdash;": "—",
};

function decodeEntities(s: string): string {
  let out = s;
  for (const [k, v] of Object.entries(ENTITIES)) out = out.split(k).join(v);
  // sayısal entityler
  out = out.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return out;
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "));
}

function normWs(s: string): string {
  return s.replace(/[\r\n\t\u00a0]+/g, " ").replace(/[ ]{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Yapısal başlık tanıma
// ---------------------------------------------------------------------------
const SIRA = "BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SEKİZİNCİ|DOKUZUNCU|ONUNCU|ONBİRİNCİ|ONİKİNCİ|SON";

const YAPI_RE = new RegExp(
  `^(${SIRA})\\s+(KİTAP|KISIM|BÖLÜM|AYIRIM)|^(KİTAP|KISIM|BÖLÜM|AYIRIM)\\s|` +
  `\\b(KİTAP|KISIM|BÖLÜM|AYIRIM)\\b\\s*$|^[A-ZÇĞİÖŞÜ]\\s*\\.\\s|^[IVXLC]+\\s*\\.\\s|^\\d+\\.\\s+[A-ZÇĞİÖŞÜ]`
);

function isStructuralHeading(text: string): boolean {
  if (!text) return false;
  if (text.length > 140) return false;
  // Yalnızca büyük harf ağırlıklı veya kısa başlık kalıpları
  const upperRatio = (text.match(/[A-ZÇĞİÖŞÜ]/g)?.length ?? 0) / text.replace(/\s/g, "").length;
  if (/KİTAP|KISIM|BÖLÜM|AYIRIM/.test(text) && upperRatio > 0.5) return true;
  return YAPI_RE.test(text) && text.length <= 90 && upperRatio > 0.4;
}

// MADDE 1- , MADDE 5/A- , Madde 158- , MADDE 12 – , Madde 3.
// Ayrıca GEÇİCİ MADDE 4 – ve EK MADDE 2- biçimleri.
const MADDE_RE =
  /^(GEÇİCİ\s+MADDE|EK\s+MADDE|MADDE|Madde)\s+(\d+[A-Za-zÇĞİÖŞÜ]*|[0-9]+\/[0-9A-Za-z]+|Ek\s*\d+|[0-9]+)\s*[-–—.]\s*/;

// ---------------------------------------------------------------------------
// HTML → bloklar
// ---------------------------------------------------------------------------
interface Blok {
  tag: string; // "p" | "h2" | ...
  html: string;
}

function splitBlocks(html: string): Blok[] {
  // <p ...>...</p> ve <h1..h6 ...>...</h1..h6> bloklarını sırayla al
  const blocks: Blok[] = [];
  const re = /<(p|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[2];
    if (raw.includes("<p") || raw.includes("<h")) {
      // iç içe blok — tekrar ayrıştır
      blocks.push(...splitBlocks(raw));
      continue;
    }
    blocks.push({ tag: m[1].toLowerCase(), html: raw });
  }
  if (blocks.length === 0) {
    // tablo veya serbest metin: satır satır dene
    for (const line of html.split(/<\/?(?:tr|div|br)[^>]*>/i)) blocks.push({ tag: "p", html: line });
  }
  return blocks;
}

export interface Madde {
  no: string;
  baslik?: string;
  metin: string;
  bolum?: string[];
}

export interface CevirSonuc {
  maddeler: Madde[];
  basliksizMetin: string[];
}

export function cevir(html: string): CevirSonuc {
  const blocks = splitBlocks(html);
  const maddeler: Madde[] = [];
  const basliksizMetin: string[] = [];
  let bolumYolu: string[] = [];
  let aktif: Madde | null = null;
  let bekleyenBaslik: string | null = null; // madde başlığı (madde numarasından önceki bold satır)
  const gorulen = new Set<string>(); // aynı madde no ikinci kez gelirse değişiklik cetvelidir

  const govdeyeEkle = (t: string) => {
    if (!aktif) return;
    aktif.metin += (aktif.metin ? "\n" : "") + t;
  };

  for (const blok of blocks) {
    const html = blok.html;
    const text = normWs(stripTags(html));
    if (!text || text === "." || text === "-") continue;

    const boldOnly = /^<(b|strong)[^>]*>[\s\S]*<\/\1>\s*$/i.test(html.trim()) && !/<span[^>]*>[^<]/i.test(html);

    // 0) Değişiklik cetveli başlığı → buradan sonrası kanun metni değil, dönüştürmeyi kes.
    //    mevzuat.gov.tr her kanunun sonunda "NNNN SAYILI KANUNA EK VE DEĞİŞİKLİK GETİREN
    //    MEVZUATIN ... / ANAYASA MAHKEMESİ KARARLARININ YÜRÜRLÜĞE GİRİŞ TARİHLERİNİ GÖSTERİR TABLO"
    //    bloğunu verir. Bu blok eski tarihli madde numaralarını tekrar eder → mükerrer üretir.
    if (
      /EK VE DEĞİŞİKLİK GETİREN MEVZUATIN|ANAYASA MAHKEMESİ KARARLARININ YÜRÜRLÜĞE GİRİŞ|YÜRÜRLÜĞE GİRİŞ TARİHLERİNİ GÖSTEREN|İŞLENEMEYEN HÜKÜMLER|SAYILI KANUNA İŞLENEMEYEN/i.test(
        text
      )
    ) {
      aktif = null;
      break;
    }

    // 1) MADDE başlığı — her şeyi böler
    const mm = text.match(MADDE_RE);
    if (mm) {
      const tip = /GEÇİCİ/.test(mm[1]) ? "Geçici" : /^EK/.test(mm[1]) ? "Ek" : "";
      const no = (tip === "Geçici" ? `Geçici ${mm[2]}` : tip === "Ek" ? `Ek ${mm[2]}` : mm[2]).replace(/\s+/g, " ");
      // Aynı numara ikinci kez geldiyse buradan sonrası sonradan eklenmiş değişiklik
      // kanunlarının yürürlük bölümüdür → kanun metni sayılmaz, dur.
      if (gorulen.has(no)) {
        aktif = null;
        break;
      }
      gorulen.add(no);
      const govde = text.slice(mm[0].length).trim();
      aktif = { no, metin: govde, bolum: [...bolumYolu], baslik: bekleyenBaslik ?? undefined };
      maddeler.push(aktif);
      bekleyenBaslik = null;
      continue;
    }

    // 2) Yapısal başlık (KİTAP/KISIM/BÖLÜM/AYIRIM) — bölüm yolunu günceller
    if (isStructuralHeading(text)) {
      const upper = text.toUpperCase();
      // Başlık metni mi yoksa seviye etiketi mi? ("BİRİNCİ KISIM" etiket, sonraki satır başlık)
      if (/^(BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SEKİZİNCİ|DOKUZUNCU|ONUNCU|ONBİRİNCİ|ONİKİNCİ|SON)\s+(KİTAP|KISIM|BÖLÜM|AYIRIM)$/.test(upper)) {
        const level = /KİTAP/.test(upper) ? 0 : /KISIM/.test(upper) ? 1 : /BÖLÜM/.test(upper) ? 2 : 3;
        bolumYolu = bolumYolu.slice(0, level);
        bolumYolu[level] = text;
      } else {
        // başlık metni — son seviyeye ekle
        const sonSeviye = Math.max(bolumYolu.length - 1, 0);
        if (bolumYolu.length > 0) bolumYolu[sonSeviye] = `${bolumYolu[sonSeviye] ?? ""} — ${text}`.replace(/^ — /, "");
      }
      aktif = null;
      bekleyenBaslik = null;
      continue;
    }

    // 3) Madde gövdesi içindeki yapısal alt başlık (ör. "2. İkinci derecedeki noktalar")
    if (aktif) {
      // 3a) Yalnızca bold, kısa ve nokta/iki nokta ile bitmeyen satır → sonraki maddenin başlığı.
      //     (mevzuat.gov.tr her madde başlığını <p><b>Başlık</b></p> olarak verir)
      const baslikAdayi =
        boldOnly &&
        text.length <= 160 &&
        !/[.;]$/.test(text) &&
        !/^\d+\s*[.)]/.test(text) &&
        !/^\(/.test(text);
      if (baslikAdayi) {
        bekleyenBaslik = text;
        aktif = null;
        continue;
      }

      const altBaslik =
        text.length <= 110 &&
        !/[.;]$/.test(text) &&
        /^(Ek\s+)?(\d+|[IVXLC]+|[a-zçğıöşü])\s*[.)]\s+\S|^[A-ZÇĞİÖŞÜ]\s*\.\s+\S/.test(text);
      if (altBaslik) {
        govdeyeEkle(`**${text}**`);
      } else {
        govdeyeEkle(text);
      }
      continue;
    }

    // 4) Madde dışı: bold kısa satır → bir sonraki maddenin başlığı
    if (boldOnly && text.length <= 180) {
      bekleyenBaslik = text;
      continue;
    }
    if (text.length <= 120) {
      bekleyenBaslik = text;
    } else {
      basliksizMetin.push(text);
    }
  }

  return { maddeler, basliksizMetin };
}

// ---------------------------------------------------------------------------
// Markdown üretimi
// ---------------------------------------------------------------------------
export function markdown(meta: KanunMeta, sonuc: CevirSonuc): string {
  const { maddeler } = sonuc;
  const ilk = maddeler[0]?.no ?? "?";
  const son = maddeler[maddeler.length - 1]?.no ?? "?";

  const L: string[] = [];
  L.push(`# ${meta.ad}`);
  L.push("");
  L.push("> **KAYNAK — OTORİTE METİN.** Bu dosya `mevzuat.gov.tr` resmî metninden");
  L.push(`> \`TOOLS/KanunCevir.ts\` ile üretilmiştir. Madde metinleri birebir alınmıştır.`);
  L.push("> Yorum, şerh ve içtihat yorumu **bu dosyada yer almaz** — bkz.");
  L.push("> `References/Yorum_ve_Serh_Katmani.md`.");
  L.push("");
  L.push("| Alan | Değer |");
  L.push("|---|---|");
  L.push(`| Kanun No | **${meta.no}** |`);
  L.push(`| Kısa Ad | ${meta.kisa} |`);
  L.push(`| Kabul Tarihi | ${meta.kabul} |`);
  L.push(`| Alan | ${meta.alan} |`);
  L.push(`| Madde Sayısı | ${maddeler.length} |`);
  L.push(`| Madde Aralığı | ${ilk} – ${son} |`);
  L.push(`| Kaynak | https://www.mevzuat.gov.tr/mevzuatmetin/${meta.tertip}.${meta.no}.htm |`);
  L.push("");

  let oncekiYol: string[] = [];
  for (const m of maddeler) {
    const yol = m.bolum ?? [];
    // ortak olmayan önekten sonrasını başlık olarak bas
    let ortak = 0;
    while (ortak < yol.length && ortak < oncekiYol.length && yol[ortak] === oncekiYol[ortak]) ortak++;
    for (let i = ortak; i < yol.length; i++) {
      L.push(`${"#".repeat(Math.min(3 + i, 6))} ${yol[i]}`);
      L.push("");
    }
    oncekiYol = yol;

    if (m.baslik && m.baslik.length <= 160) {
      L.push(`### ${m.baslik}`);
      L.push("");
    }
    L.push(`## Madde ${m.no}`);
    L.push("");
    for (const par of m.metin.split("\n")) {
      if (par.trim()) L.push(par.trim());
      L.push("");
    }
  }

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export function indeks(meta: KanunMeta, sonuc: CevirSonuc) {
  return {
    no: meta.no,
    ad: meta.ad,
    kisa: meta.kisa,
    kabul: meta.kabul,
    alan: meta.alan,
    tertip: meta.tertip,
    dosya: `${meta.dosya}.md`,
    kaynak: `https://www.mevzuat.gov.tr/mevzuatmetin/${meta.tertip}.${meta.no}.htm`,
    maddeSayisi: sonuc.maddeler.length,
    maddeler: sonuc.maddeler.map((m) => ({
      no: m.no,
      baslik: m.baslik ?? null,
      uzunluk: m.metin.length,
    })),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function icraEt(argv: string[]) {
  const args = argv.slice(2);
  const tumu = args.includes("--tumu");
  const kok = join(process.cwd());

  if (tumu) {
    const tmp = join(kok, ".tmp");
    if (!existsSync(tmp)) {
      console.error("HATA: .tmp/ klasörü yok. Önce kanunları indirin (TOOLS/KanunIndir.ts).");
      process.exit(1);
    }
    const hedef = join(kok, "Kanunlar", "md");
    mkdirSync(hedef, { recursive: true });

    const dosyalar = readdirSync(tmp).filter((f) => f.endsWith(".htm"));
    const byNo = new Map<string, string>();
    for (const f of dosyalar) {
      const m = f.match(/(?:^|[^\d])(\d{4})(?:[^\d]|$)/);
      if (m && !byNo.has(m[1])) byNo.set(m[1], f);
     else if (m) byNo.set(m[1], byNo.get(m[1])!); // ilk eşleşmeyi koru
    }

    const tumIndeks: ReturnType<typeof indeks>[] = [];
    let basarili = 0;
    const eksik: string[] = [];

    for (const meta of KANUNLAR) {
      // Aynı kanun no için birden fazla indirme olabilir (hatalı tertip denemeleri).
      // En büyük dosya gerçek metindir; hatalı indirmeler ~64 KB analytics sayfasıdır.
      const adaylar = dosyalar
        .filter((f) => f === `${meta.no}.htm` || f === `k${meta.no}.htm` || f === `t${meta.no}.htm`)
        .map((f) => ({ f, boyut: statSync(join(tmp, f)).size }))
        .sort((a, b) => b.boyut - a.boyut);
      let dosya = adaylar[0]?.f;
      if (!dosya) {
        eksik.push(`${meta.no} ${meta.kisa}`);
        continue;
      }
      try {
        const ham = readFileSync(join(tmp, dosya));
        const html = coz(ham);
        const sonuc = cevir(html);
        if (sonuc.maddeler.length === 0) {
          eksik.push(`${meta.no} ${meta.kisa} (ayrıştırılamadı: ${dosya})`);
          continue;
        }
        const md = markdown(meta, sonuc);
        writeFileSync(join(hedef, `${meta.dosya}.md`), md, "utf8");
        tumIndeks.push(indeks(meta, sonuc));
        basarili++;
        console.log(`✓ ${meta.kisa.padEnd(14)} ${String(sonuc.maddeler.length).padStart(5)} madde  → Kanunlar/md/${meta.dosya}.md`);
      } catch (e) {
        eksik.push(`${meta.no} ${meta.kisa} (${(e as Error).message})`);
      }
    }

    writeFileSync(join(hedef, "indeks.json"), JSON.stringify(tumIndeks, null, 2), "utf8");
    console.log(`\n${basarili}/${KANUNLAR.length} kanun dönüştürüldü.`);
    if (eksik.length) console.log("EKSİK:\n  " + eksik.join("\n  "));
    return;
  }

  const girdi = args[0];
  const cikti = args[1];
  if (!girdi || !cikti) {
    console.error("Kullanım: bun TOOLS/KanunCevir.ts <girdi.htm> <cikti.md> | --tumu");
    process.exit(1);
  }
  const ham = readFileSync(girdi);
  const html = coz(ham);
  const s = cevir(html);
  const meta: KanunMeta = {
    no: (args.find((a) => a.startsWith("--no=")) ?? "--no=?").split("=")[1],
    ad: (args.find((a) => a.startsWith("--ad=")) ?? `--ad=${basename(girdi)}`).split("=")[1],
    kisa: "",
    kabul: "",
    tertip: "",
    dosya: basename(cikti, ".md"),
    alan: "",
  };
  writeFileSync(cikti, markdown(meta, s), "utf8");
  console.log(`${s.maddeler.length} madde → ${cikti}`);
}

if (import.meta.main) icraEt(process.argv);
