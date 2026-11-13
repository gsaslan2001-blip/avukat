#!/usr/bin/env bun
/**
 * Parcala — kanonik markdown kanun dosyalarını tematik parçalara böler
 * ve şerh dosyasını madde bazlı doktrin dosyalarına ayırır.
 *
 * Amaç: Bağlam penceresini şişirmemek. Dilekçe üretilirken TCK'nın 348 maddesinin
 * tamamı değil, yalnızca olayla ilgili `hayata_karsi_suclar_m81_85.md` gibi parça
 * okunur. Bu, halüsinasyon riskini düşüren temel RAG tasarrufudur.
 *
 * Kullanım:
 *   bun TOOLS/Parcala.ts --kanunlar     # TCK ve CMK'yı tematik parçalara böl
 *   bun TOOLS/Parcala.ts --serh         # Mahmutoğlu şerhini madde bazlı ayır
 *   bun TOOLS/Parcala.ts --tumu
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const KOK = process.cwd();
const KANUN_DIZIN = join(KOK, "Kanunlar", "md");
const NORM_DIZIN = join(KOK, "02_normatif_mevzuat");
const DOKTRIN_DIZIN = join(KOK, "03_doktrin_ve_serhler");

// ---------------------------------------------------------------------------
// Tematik bölümleme planı
// ---------------------------------------------------------------------------
interface Dilim {
  dosya: string;      // çıktı dosya adı
  baslik: string;     // bölüm başlığı
  kapsam: string;     // insan okur açıklama
  aralik: [string, string][]; // [başlangıç, bitiş] madde numaraları (dahil)
}

const TCK_DILIMLERI: Dilim[] = [
  { dosya: "tck_genel_hukumler_m1_75", baslik: "TCK Genel Hükümler (m. 1–75)", kapsam: "Suç teorisi, kast/taksir, hukuka uygunluk, kusurluluk, teşebbüs, iştirak, içtima, yaptırımlar", aralik: [["1", "75"]] },
  { dosya: "hayata_karsi_suclar_m76_85", baslik: "Hayata Karşı Suçlar (m. 76–85)", kapsam: "Kasten öldürme, taksirle öldürme, intihara yönlendirme, çocuk düşürme", aralik: [["76", "85"]] },
  { dosya: "vucut_dokunulmazligi_m86_93", baslik: "Vücut Dokunulmazlığına Karşı Suçlar (m. 86–93)", kapsam: "Kasten/taksirle yaralama, neticesi sebebiyle ağırlaşmış yaralama, işkence, eziyet", aralik: [["86", "93"]] },
  { dosya: "koruma_gozetim_ve_yardim_m94_104", baslik: "Koruma, Gözetim ve Yardım Yükümlülüğü (m. 94–104)", kapsam: "Terk, yardımdan kaçınma, çocuk düşürme/aldırma, kısırlaştırma", aralik: [["94", "104"]] },
  { dosya: "hurriyete_karsi_suclar_m106_124", baslik: "Hürriyete Karşı Suçlar (m. 106–124)", kapsam: "Tehdit, şantaj, cebir, kişiyi hürriyetinden yoksun kılma, konut dokunulmazlığı, iş ve çalışma hürriyeti", aralik: [["106", "124"]] },
  { dosya: "serefe_karsi_suclar_m125_131", baslik: "Şerefe Karşı Suçlar (m. 125–131)", kapsam: "Hakaret, iftira, kişinin hatırasına hakaret", aralik: [["125", "131"]] },
  { dosya: "ozel_hayata_karsi_suclar_m132_140", baslik: "Özel Hayata ve Hayatın Gizli Alanına Karşı Suçlar (m. 132–140)", kapsam: "Haberleşmenin gizliliği, kişisel veriler, görüntü/ses kaydı, özel hayatın gizliliği", aralik: [["132", "140"]] },
  { dosya: "malvarligina_karsi_suclar_m141_169", baslik: "Malvarlığına Karşı Suçlar (m. 141–169)", kapsam: "Hırsızlık, yağma, dolandırıcılık, güveni kötüye kullanma, mal edinme, mala zarar", aralik: [["141", "169"]] },
  { dosya: "guven_ve_kamunun_sagligi_m170_197", baslik: "Kamu Güvenine ve Kamu Sağlığına Karşı Suçlar (m. 170–197)", kapsam: "Belgede sahtecilik, parada sahtecilik, mühür bozma, uyuşturucu", aralik: [["170", "197"]] },
  { dosya: "kamu_barisi_ve_sagligi_m198_222", baslik: "Kamu Barışına Karşı Suçlar (m. 213–222)", kapsam: "Halkı kin ve düşmanlığa tahrik, suç işlemeye tahrik, suç örgütü", aralik: [["213", "222"]] },
  { dosya: "bilisim_suclari_m243_246", baslik: "Bilişim Alanında Suçlar (m. 243–246)", kapsam: "Bilişim sistemine girme, engelleme/bozma, verileri yok etme, banka/kredi kartı kötüye kullanımı", aralik: [["243", "246"]] },
  { dosya: "kamu_idare_ve_adalet_suclari_m247_339", baslik: "Kamu İdaresine ve Adalet Sistemine Karşı Suçlar (m. 247–339)", kapsam: "Zimmet, irtikap, rüşvet, görevi kötüye kullanma, yargıya etki, suç uydurma, yalan tanıklık", aralik: [["247", "339"]] },
];

const CMK_DILIMLERI: Dilim[] = [
  { dosya: "cmk_kapsam_gorev_yetki_m1_21", baslik: "CMK Kapsam, Görev ve Yetki (m. 1–21)", kapsam: "Görevli mahkeme tespiti, yetki kuralları, bağlantı", aralik: [["1", "21"]] },
  { dosya: "cmk_sorusturma_islemleri_m22_89", baslik: "CMK Soruşturma İşlemleri (m. 22–89)", kapsam: "Suç duyurusu, soruşturmanın yürütülmesi, ifade alma, bilirkişi", aralik: [["22", "89"]] },
  { dosya: "cmk_koruma_tedbirleri_m90_144", baslik: "CMK Koruma Tedbirleri (m. 90–144)", kapsam: "Yakalama, gözaltı, tutuklama (m.100 ölçülülük), adli kontrol (m.109), arama (m.116), elkoyma (m.127), iletişim denetimi (m.135)", aralik: [["90", "144"]] },
  { dosya: "cmk_delil_hukuku_m145_217", baslik: "CMK Delil Hukuku (m. 145–217)", kapsam: "Delil serbestisi, hukuka aykırı delil (m.206/2-a, m.217/2), tanık, keşif", aralik: [["145", "217"]] },
  { dosya: "cmk_kovusturma_ve_hukum_m170_231", baslik: "CMK Kovuşturma ve Hüküm (m. 170–231)", kapsam: "İddianame, iddianamenin iadesi, duruşma, hüküm türleri (m.223), HAGB (m.231)", aralik: [["170", "231"]] },
  { dosya: "cmk_ozel_muhakeme_m250_255", baslik: "CMK Özel Muhakeme Usulleri (m. 250–255)", kapsam: "Seri muhakeme (m.250), basit yargılama (m.251), uzlaştırma (m.253)", aralik: [["250", "255"]] },
  { dosya: "cmk_kanun_yollari_m260_323", baslik: "CMK Kanun Yolları (m. 260–323)", kapsam: "İtiraz (m.267), istinaf (m.272–285, m.289 kesin aykırılık), temyiz (m.286–307), yargılamanın yenilenmesi (m.311)", aralik: [["260", "323"]] },
];

// ---------------------------------------------------------------------------
// Markdown madde ayrıştırıcı
// ---------------------------------------------------------------------------
interface MdMadde {
  no: string;
  blok: string; // tam markdown bloğu
}

function mdMaddeleriniAl(md: string): MdMadde[] {
  const satirlar = md.split("\n");
  const out: MdMadde[] = [];
  let aktif: MdMadde | null = null;
  let buf: string[] = [];

  const kapat = () => {
    if (aktif) {
      aktif.blok = buf.join("\n").trimEnd();
      out.push(aktif);
    }
  };

  for (const s of satirlar) {
    const m = s.match(/^## Madde (.+)$/);
    if (m) {
      kapat();
      aktif = { no: m[1].trim(), blok: "" };
      buf = [s];
      continue;
    }
    if (aktif) buf.push(s);
  }
  kapat();
  return out;
}

/** "5/A", "Geçici 3", "Ek 2" gibi numaraları sayısal tabana çevirir. */
function taban(no: string): number {
  const m = no.match(/(\d+)/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY; // Geçici/Ek maddeler sona
}

function dilimle(parcalar: MdMadde[], d: Dilim): string {
  const [bas, bit] = [taban(d.aralik[0][0]), taban(d.aralik[0][1])];
  const secili = parcalar.filter((p) => {
    // Geçici ve Ek maddeler ayrı ele alınır: yalnızca tam kapsayıcı dilime eklenir
    if (/Geçici|Ek/i.test(p.no)) return false;
    const t = taban(p.no);
    return t >= bas && t <= bit;
  });

  const L: string[] = [];
  L.push(`# ${d.baslik}`);
  L.push("");
  L.push(`> **KAPSAM:** ${d.kapsam}`);
  L.push(">");
  L.push("> Bu dosya `02_normatif_mevzuat/` normatif katmanının bir parçasıdır.");
  L.push("> Madde metinleri resmî kaynaktan (`mevzuat.gov.tr`) birebir dönüştürülmüştür.");
  L.push("> **Yorum ve içtihat yorumu bu dosyada yer almaz** — doktrin için");
  L.push("> `03_doktrin_ve_serhler/`, emsal için `04_ictihat_ve_emsal_bankasi/`.");
  L.push("");
  L.push(`**Madde sayısı:** ${secili.length}`);
  L.push("");
  L.push("---");
  L.push("");
  for (const p of secili) {
    L.push(p.blok);
    L.push("");
    L.push("---");
    L.push("");
  }
  return L.join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// Şerh ayrıştırıcı — Mahmutoğlu & Karadeniz, TCK Genel Hükümler Şerhi
// ---------------------------------------------------------------------------
/**
 * Şerh dosyası yapısı:
 *   ##### **Kast**
 *   **Madde 21 - (1) ...**
 *   (2) ...
 *   ###### **G E R E K Ç E**
 *   ###### **A Ç I K L A M A L A R**
 *   **Madde 21 – Kast**      ← her sayfada tekrar eden üstbilgi
 *
 * Bölme ölçütü: `**Madde N – Başlık**` üstbilgisi veya `**Madde N -` metin başlangıcı.
 */
function serhAyristir(metin: string): Map<string, { baslik: string; govde: string[] }> {
  const satirlar = metin.split("\n");
  const sonuc = new Map<string, { baslik: string; govde: string[] }>();
  let aktifNo: string | null = null;
  let aktifBaslik = "";

  // OCR artefaktı: kaynak taramada "fiil" kelimesinin "i" harfi kendi başına bold
  // işaretlenmiş ("f **i** li", "f **i** lin"). Kelime içindeki bold'u tamamen kaldır:
  // harf + **kısa bold** + harf dizisi → tek kelime.
  const ocrTemizle = (t: string) =>
    t
      // "f **i** li", "f_ **_i_** _lin", "f **i** llerin" → "fiili", "fiilin", "fiillerin".
      // Kaynak taramada "fiil" kelimesinin ikinci "i"si ayrı bold/italik işaretlenmiş
      // ve bir "i" düşmüş. Kalıp: f + (işaret) + i + (işaret) + l… → fii + l…
      .replace(/(?<![A-Za-zçğıöşüÇĞİÖŞÜ])f[ _*]*\*{0,2}[ _*]*i[ _*]*\*{0,2}[ _]*(?=l)/gi, "fii")
      // Aynı artefakt diğer kelimelerde: "müdaf **i** n", "f **i** - le" → tek kelime
      .replace(/([A-Za-zçğıöşüÇĞİÖŞÜ])\s*\*{2}\s*([A-Za-zçğıöşüÇĞİÖŞÜ])\s*\*{2}\s*(?=[A-Za-zçğıöşüÇĞİÖŞÜ])/g, "$1$2")
      .replace(/([A-Za-zçğıöşüÇĞİÖŞÜ])\s*\*{2}\s*([A-Za-zçğıöşüÇĞİÖŞÜ])\s*\*{2}\s*-\s*(?=[A-Za-zçğıöşüÇĞİÖŞÜ])/g, "$1$2-")
      // Kalan kelime-içi bold/italik işaretleri (harf ile harf arasında)
      .replace(/(?<=[A-Za-zçğıöşüÇĞİÖŞÜ])\*{1,2}(?=[A-Za-zçğıöşüÇĞİÖŞÜ])/g, "")
      .replace(/\*\*\s*\*\*/g, "");

  let sonBaslik = ""; // madde başlığını veren `##### **Kast**` satırı

  for (let i = 0; i < satirlar.length; i++) {
    const s = ocrTemizle(satirlar[i]);

    // Sayfa numarası ve tekrar eden üstbilgi temizliği
    if (/^\*\*\d+\*\*$/.test(s.trim())) continue;
    if (/^\*\*Birinci Kitap\*\*/.test(s.trim())) continue;
    if (/^\*\*\d+\s+İkinci Kısım\*\*/.test(s.trim())) continue;

    // Madde başlığı: `##### **Kast**` (madde numarasından hemen önce gelir)
    const h = s.match(/^#{3,6}\s*\*\*(.+?)\*\*\s*$/);
    if (h) {
      const t = h[1].trim();
      // Sayfa altlığı / gerekçe / açıklama gibi bölüm etiketlerini başlık sayma
      if (!/G\s*EREK\s*ÇE|AÇIK\s*LAMA|^[IVXLC]+\.|^\d+\./.test(t.replace(/\s+/g, " "))) {
        sonBaslik = t;
      }
      continue;
    }

    // Madde başlangıcı: "**Madde 21 - (1) ..." veya "**Madde 21 – Kast**"
    const m = s.match(/^\*\*(?:Madde|MADDE)\s+(\d+[A-Za-z]*)\s*[-–—]\s*(.*)$/);
    if (m) {
      const no = m[1];
      const kalan = m[2].replace(/\*\*\s*$/, "").trim();

      // Tekrar eden üstbilgi mi? ("Madde 21 – Kast")
      const ustbilgi = /^[A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ ,()'’\-]{0,70}$/.test(kalan) && !kalan.startsWith("(");

      if (ustbilgi && sonuc.has(no)) {
        // aynı maddenin sayfa üstbilgisi → yeni bölüm açma, atla
        continue;
      }
      if (!sonuc.has(no)) {
        sonuc.set(no, { baslik: ustbilgi ? kalan : sonBaslik, govde: [] });
      } else if (!sonuc.get(no)!.baslik) {
        sonuc.get(no)!.baslik = ustbilgi ? kalan : sonBaslik;
      }
      aktifNo = no;
      sonuc.get(no)!.govde.push(s);
      continue;
    }

    if (aktifNo) sonuc.get(aktifNo)!.govde.push(s);
  }

  return sonuc;
}

function serhYaz(serh: Map<string, { baslik: string; govde: string[] }>) {
  const hedef = join(DOKTRIN_DIZIN, "suc_genel_teorisi");
  mkdirSync(hedef, { recursive: true });

  const indeks: string[] = [
    "# TCK Genel Hükümler Şerhi — Madde İndeksi",
    "",
    "> **Kaynak eser:** Prof. Dr. Fatih Selami Mahmutoğlu & Av. Serra Karadeniz – LLM,",
    "> *Türk Ceza Kanunu Genel Hükümler Şerhi*, 2. Baskı, Beta Yayıncılık, İstanbul 2021.",
    "> ISBN 978-605-333-797-3.",
    ">",
    "> **Katman:** Doktrin/şerh. Bu dosyalar kanun metni DEĞİLDİR; yorum içerirler.",
    "> Kanun metni için `02_normatif_mevzuat/02_ceza_maddi_hukuk/` okunmalıdır.",
    "",
    "| Madde | Başlık | Dosya |",
    "|---|---|---|",
  ];

  let yazilan = 0;
  for (const [no, { baslik, govde }] of [...serh.entries()].sort((a, b) => taban(a[0]) - taban(b[0]))) {
    const temizGovde = govde
      .join("\n")
      // tekrar eden sayfa üstbilgileri
      .replace(/^\*\*Madde\s+\d+[A-Za-z]*\s*[–—-]\s*[^\n*]{0,70}\*\*\s*$/gm, "")
      // yalnız sayfa numarası satırları
      .replace(/^\*\*\d+\*\*\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (temizGovde.length < 200) continue; // içi boş madde (mülga)

    const dosya = `tck_m${no.replace(/\//g, "-")}_serh.md`;
    const md = [
      "---",
      `madde_no: "TCK ${no}"`,
      `kaynak_eser: "Mahmutoğlu & Karadeniz, TCK Genel Hükümler Şerhi, 2. Baskı, 2021"`,
      `katman: "doktrin"`,
      `baslik: "${(baslik || "").replace(/"/g, "'")}"`,
      "---",
      "",
      `# TCK m. ${no} — Şerh${baslik ? ` (${baslik})` : ""}`,
      "",
      "> **DOKTRİN KATMANI.** Bu dosya bir yorum metnidir, kanun metni değildir.",
      "> Kanun metni için `02_normatif_mevzuat/02_ceza_maddi_hukuk/tck_genel_hukumler_m1_75.md`.",
      "> Emsal karar için `04_ictihat_ve_emsal_bankasi/`.",
      "",
      "---",
      "",
      temizGovde,
      "",
    ].join("\n");

    writeFileSync(join(hedef, dosya), md, "utf8");
    indeks.push(`| ${no} | ${baslik || "—"} | [${dosya}](suc_genel_teorisi/${dosya}) |`);
    yazilan++;
  }

  writeFileSync(join(DOKTRIN_DIZIN, "SERH_INDEKS.md"), indeks.join("\n") + "\n", "utf8");
  console.log(`✓ Şerh: ${yazilan} madde dosyası → 03_doktrin_ve_serhler/suc_genel_teorisi/`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function kur() {
  for (const d of [
    "config",
    "01_sistem_is_akislari",
    "02_normatif_mevzuat/01_ust_normlar",
    "02_normatif_mevzuat/02_ceza_maddi_hukuk",
    "02_normatif_mevzuat/03_ceza_muhakemesi_usul",
    "02_normatif_mevzuat/04_diger_kanunlar",
    "02_normatif_mevzuat/05_kritik_yonetmelikler",
    "03_doktrin_ve_serhler/suc_genel_teorisi",
    "03_doktrin_ve_serhler/suc_ozel_tipleri_serhi",
    "03_doktrin_ve_serhler/suc_ayrim_matrisleri",
    "03_doktrin_ve_serhler/usul_itiraz_rehberleri",
    "04_ictihat_ve_emsal_bankasi/yargitay_ibk",
    "04_ictihat_ve_emsal_bankasi/yargitay_cgk",
    "04_ictihat_ve_emsal_bankasi/yargitay_daire_kararlari",
    "04_ictihat_ve_emsal_bankasi/aym_ve_aihm_ihlalleri",
    "05_dilekce_sablonlari",
    "Dilekceler",
    "Taslaklar",
  ]) {
    mkdirSync(join(KOK, d), { recursive: true });
  }
  console.log("✓ Dizin yapısı kuruldu");
}

/** Üst normlar + özel ceza kanunları + yönetmelik yerine geçen dosyaları katman dizinlerine kopyalar. */
function katmanlarıDoldur() {
  const { copyFileSync, readdirSync } = require("node:fs") as typeof import("node:fs");
  const kaynak = KANUN_DIZIN;
  const hedefUst = join(NORM_DIZIN, "01_ust_normlar");
  const hedefDiger = join(NORM_DIZIN, "04_diger_kanunlar");

  const ustNormlar = ["2709_Anayasa.md"];
  const diger = [
    "5326_Kabahatler_Kanunu.md",
    "6136_Atesli_Silahlar_Kanunu.md",
    "5607_Kacakcilik_Kanunu.md",
    "2918_Karayollari_Trafik_Kanunu.md",
    "6284_Ailenin_Korunmasi_Kanunu.md",
    "6183_AATUHK_Amme_Alacaklari.md",
  ];
  const ozelHukuk = [
    "6100_HMK_Hukuk_Muhakemeleri_Kanunu.md",
    "6098_TBK_Turk_Borclar_Kanunu.md",
    "6102_TTK_Turk_Ticaret_Kanunu.md",
    "4721_TMK_Turk_Medeni_Kanunu.md",
    "2004_IIK_Icra_ve_Iflas_Kanunu.md",
    "4857_Is_Kanunu.md",
    "6502_TKHK_Tuketici_Kanunu.md",
    "2577_IYUK_Idari_Yargilama_Usulu.md",
    "6325_Arabuluculuk_Kanunu.md",
    "7036_Is_Mahkemeleri_Kanunu.md",
    "634_KMK_Kat_Mulkiyeti_Kanunu.md",
    "1136_Avukatlik_Kanunu.md",
    "7201_Tebligat_Kanunu.md",
    "3095_Faiz_Kanunu.md",
    "5235_Adli_Yargi_Kanunu.md",
    "5275_CGTIHK_Infaz_Kanunu.md",
  ];

  const mevcut = new Set(readdirSync(kaynak));
  let n = 0;
  for (const f of ustNormlar) if (mevcut.has(f)) { copyFileSync(join(kaynak, f), join(hedefUst, f)); n++; }
  for (const f of diger) if (mevcut.has(f)) { copyFileSync(join(kaynak, f), join(hedefDiger, f)); n++; }
  for (const f of ozelHukuk) if (mevcut.has(f)) { copyFileSync(join(kaynak, f), join(hedefDiger, f)); n++; }
  console.log(`✓ ${n} kanun katman dizinlerine kopyalandı (01_ust_normlar, 04_diger_kanunlar)`);
}

function kanunlariParcala() {
  const tckYolu = join(KANUN_DIZIN, "5237_TCK_Turk_Ceza_Kanunu.md");
  const cmkYolu = join(KANUN_DIZIN, "5271_CMK_Ceza_Muhakemesi_Kanunu.md");

  if (existsSync(tckYolu)) {
    const maddeler = mdMaddeleriniAl(readFileSync(tckYolu, "utf8"));
    const hedef = join(NORM_DIZIN, "02_ceza_maddi_hukuk");
    for (const d of TCK_DILIMLERI) {
      writeFileSync(join(hedef, `${d.dosya}.md`), dilimle(maddeler, d), "utf8");
    }
    console.log(`✓ TCK: ${TCK_DILIMLERI.length} tematik parça → 02_normatif_mevzuat/02_ceza_maddi_hukuk/`);
  }

  if (existsSync(cmkYolu)) {
    const maddeler = mdMaddeleriniAl(readFileSync(cmkYolu, "utf8"));
    const hedef = join(NORM_DIZIN, "03_ceza_muhakemesi_usul");
    for (const d of CMK_DILIMLERI) {
      writeFileSync(join(hedef, `${d.dosya}.md`), dilimle(maddeler, d), "utf8");
    }
    console.log(`✓ CMK: ${CMK_DILIMLERI.length} tematik parça → 02_normatif_mevzuat/03_ceza_muhakemesi_usul/`);
  }
}

function serhParcala() {
  const aday = join(KANUN_DIZIN, "turk-ceza-kanunu-genel-hukumler-serhi-9786254365195.fixed (2).md");
  if (!existsSync(aday)) {
    console.error("HATA: şerh dosyası bulunamadı:", aday);
    return;
  }
  const metin = readFileSync(aday, "utf8");
  const serh = serhAyristir(metin);
  serhYaz(serh);
}

const args = process.argv.slice(2);
const tumu = args.includes("--tumu");
if (tumu || args.includes("--kur")) kur();
if (tumu || args.includes("--kanunlar")) kanunlariParcala();
if (tumu || args.includes("--serh")) serhParcala();
if (tumu || args.includes("--katman")) katmanlarıDoldur();
if (!args.length) console.error("Kullanım: --kur | --kanunlar | --serh | --katman | --tumu");
