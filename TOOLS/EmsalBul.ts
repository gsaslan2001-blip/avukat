#!/usr/bin/env bun
/**
 * EmsalBul — Yargıtay karar arama API'sinden emsal karar çeker ve künye doğrular.
 *
 * NEDEN VAR: Dil modelleri kendi eğitim verisinden Yargıtay kararı yazmaya
 * kalktığında var olmayan esas/karar numaraları üretir. Bir dilekçede sahte
 * künye bulunması mesleki sorumluluk doğurur. Bu araç, künyeyi yalnızca
 * Yargıtay'ın kendi arama servisinden teyit ederek sisteme sokar.
 *
 * Kullanım:
 *   bun TOOLS/EmsalBul.ts --ara "kasten yaralama öldürmeye teşebbüs" [--daire 1] [--yil 2020-2024] [--limit 10]
 *   bun TOOLS/EmsalBul.ts --dogrula "2018/3412" "2018/5377" [--daire 15]
 *   bun TOOLS/EmsalBul.ts --kontrol
 *
 * Çıktı: 04_ictihat_ve_emsal_bankasi/yargitay_daire_kararlari/ altına
 * YAML frontmatter'lı markdown dosyaları.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ARAMA_URL = "https://karararama.yargitay.gov.tr/aramalist";
const DOKUMAN_URL = "https://karararama.yargitay.gov.tr/getDokuman?id=";
const KOK = process.cwd();
const EMSAL_DIZIN = join(KOK, "04_ictihat_ve_emsal_bankasi");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface KararOzet {
  id: string;
  daire: string;
  esasNo: string;
  kararNo: string;
  kararTarihi: string;
  arananKelime?: string;
}

interface AramaYaniti {
  data: { data: KararOzet[]; recordsTotal: number; recordsFiltered: number } | null;
  metadata: { FMTY: string; FMTE: string };
}

async function aramaYap(
  kelime: string,
  opts: { daire?: string; yilBas?: string; yilSon?: string; limit?: number; sayfa?: number } = {}
): Promise<AramaYaniti> {
  const payload = {
    data: {
      arananKelime: kelime,
      birimYrgKurulDaire: "",
      birimYrgHukukDaire: "",
      birimYrgCezaDaire: opts.daire ?? "",
      kararYil: "",
      kararIlkMah: "",
      kararSayi: "",
      kararTarihiStart: opts.yilBas ?? "",
      kararTarihiEnd: opts.yilSon ?? "",
      siralama: "1",
      siralamaDirection: "desc",
      pageSize: opts.limit ?? 10,
      pageNumber: opts.sayfa ?? 1,
    },
  };

  // 429 (rate limit) ve geçici 5xx için üstel geri çekilme
  let sonHata = "";
  for (let deneme = 0; deneme < 4; deneme++) {
    const res = await fetch(ARAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "User-Agent": UA, Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return (await res.json()) as AramaYaniti;

    sonHata = `Arama API ${res.status}`;
    if (res.status !== 429 && res.status < 500) throw new Error(sonHata);
    const bekle = 1500 * Math.pow(2, deneme); // 1.5s, 3s, 6s, 12s
    console.error(`   ⏳ ${res.status} — ${bekle / 1000}s bekleyip yeniden deniyorum (${deneme + 1}/4)`);
    await new Promise((r) => setTimeout(r, bekle));
  }
  throw new Error(sonHata);
}

async function kararMetni(id: string): Promise<string> {
  const res = await fetch(DOKUMAN_URL + encodeURIComponent(id), {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Doküman API ${res.status}`);
  const j = (await res.json()) as { data: string | null; metadata?: { FMTY: string } };
  if (!j.data) return "";
  return htmlTemizle(j.data);
}

function htmlTemizle(html: string): string {
  return (
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function guvenliAd(s: string): string {
  return s
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80);
}

function emsalYaz(k: KararOzet, metin: string, klasor: string, kelime: string) {
  const dizin = join(EMSAL_DIZIN, klasor);
  mkdirSync(dizin, { recursive: true });
  const ad = `${guvenliAd(`${k.daire}_${k.esasNo}_${k.kararNo}`)}.md`;

  const ozet = metin.split("\n").filter((s) => s.trim()).slice(2, 8).join(" ").slice(0, 900);

  const md = [
    "---",
    `daire: "${k.daire}"`,
    `esas_no: "${k.esasNo}"`,
    `karar_no: "${k.kararNo}"`,
    `karar_tarihi: "${k.kararTarihi}"`,
    `yargitay_id: "${k.id}"`,
    `arama_kelimesi: "${kelime.replace(/"/g, "'")}"`,
    `dogrulama: "CANLI_API"`,
    `dogrulama_kaynagi: "karararama.yargitay.gov.tr"`,
    "---",
    "",
    `# ${k.daire} — ${k.esasNo} E., ${k.kararNo} K.`,
    "",
    `> **DOĞRULANMIŞ KÜNYE.** Bu künye Yargıtay'ın kendi karar arama servisinden`,
    `> canlı olarak teyit edilmiştir ("getDokuman", id ${k.id}).`,
    `> Karar metni resmî kaynaktan alınmıştır; özet değildir.`,
    "",
    "| Alan | Değer |",
    "|---|---|",
    `| Daire | ${k.daire} |`,
    `| Esas No | **${k.esasNo}** |`,
    `| Karar No | **${k.kararNo}** |`,
    `| Karar Tarihi | ${k.kararTarihi} |`,
    `| Arama Kelimesi | ${kelime} |`,
    "",
    "## Karar Metni",
    "",
    metin || "_Karar metni alınamadı — künye doğrulandı ancak gövde çekilemedi._",
    "",
    "---",
    "",
    "## Dilekçede Kullanım Notu",
    "",
    `Özet (otomatik çıkarım — **teyit edilmelidir**): ${ozet}`,
    "",
    "> Atıf yaparken yalnızca künyeyi değil, kararın **somut olayla örtüşen**",
    "> gerekçe paragrafını da aktarın. Aksi hâlde içtihat atfı zayıf kalır.",
    "",
  ].join("\n");

  writeFileSync(join(dizin, ad), md, "utf8");
  return ad;
}

// ---------------------------------------------------------------------------
// Modlar
// ---------------------------------------------------------------------------
async function modAra(kelime: string, opts: { daire?: string; yilBas?: string; yilSon?: string; limit?: number }) {
  console.log(`🔍 Aranıyor: "${kelime}"${opts.daire ? ` (daire: ${opts.daire})` : ""}`);
  const y = await aramaYap(kelime, opts);
  if (y.metadata.FMTY !== "SUCCESS" || !y.data) {
    console.error("API hatası:", y.metadata.FMTE);
    return;
  }
  console.log(`   Toplam eşleşme: ${y.data.recordsTotal}, dönen: ${y.data.data.length}\n`);

  let i = 0;
  for (const k of y.data.data) {
    i++;
    process.stdout.write(`  [${i}/${y.data.data.length}] ${k.daire} ${k.esasNo} E., ${k.kararNo} K. (${k.kararTarihi}) … `);
    try {
      const metin = await kararMetni(k.id);
      const ad = emsalYaz(k, metin, "yargitay_daire_kararlari", kelime);
      console.log(`✓ ${metin.length} char → ${ad}`);
    } catch (e) {
      console.log(`✗ ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 350)); // nazik aralık
  }
}

/** Bir aramayı sayfalayarak istenen sayfa sayısı kadar sonuç toplar. */
async function sayfaliAra(
  kelime: string,
  opts: { daire?: string; sayfaSayisi?: number } = {}
): Promise<{ kayitlar: KararOzet[]; toplam: number }> {
  const kayitlar: KararOzet[] = [];
  let toplam = 0;
  const sayfaSayisi = opts.sayfaSayisi ?? 5;
  for (let p = 1; p <= sayfaSayisi; p++) {
    const y = await aramaYap(kelime, { daire: opts.daire, sayfa: p });
    if (y.metadata.FMTY !== "SUCCESS" || !y.data) break;
    toplam = y.data.recordsTotal;
    if (!y.data.data.length) break;
    kayitlar.push(...y.data.data);
    if (kayitlar.length >= toplam) break;
    await new Promise((r) => setTimeout(r, 900)); // sunucu hız sınırına saygı
  }
  return { kayitlar, toplam };
}

/**
 * Künye doğrulama.
 *
 * API NOTU: `kararYil`, `kararSayi`, `kararTarihiStart/End` alanları "Hata Oluştu!"
 * döndürüyor (sunucu tarafı bozuk). `pageSize` 10'da sabitleniyor; sayfalama çalışıyor.
 * Çalışan tek yol: esas numarasının rakamını serbest metin olarak arayıp
 * sonuçları sayfa sayfa taramak, esas/karar no ile yerelde süzmek.
 */
async function modDogrula(esas: string, karar: string, daire?: string) {
  const norm = (s: string) => s.replace(/\s/g, "").replace(/^0+/, "");
  const esasRakam = (esas.match(/\d+/) ?? [""])[0];
  // Daha ayırt edici arama: esas no'nun rakamı (ör. 3412) yeterli değilse karar no ile dene
  const aramalar = [...new Set([esasRakam, (karar.match(/\d+/) ?? [""])[0]].filter(Boolean))];

  console.log(`🔎 Künye doğrulanıyor: ${esas} E., ${karar} K.${daire ? ` (${daire})` : ""}`);

  let bulunan: KararOzet[] = [];
  let taranan = 0;
  let toplamKayit = 0;

  for (const kelime of aramalar) {
    const { kayitlar, toplam } = await sayfaliAra(kelime, { daire, sayfaSayisi: 10 });
    toplamKayit = toplam;
    taranan += kayitlar.length;
    bulunan = kayitlar.filter(
      (k) => norm(k.esasNo) === norm(esas) && norm(k.kararNo) === norm(karar) && (!daire || k.daire === daire)
    );
    if (bulunan.length) break;
    console.log(`   "${kelime}" → ${kayitlar.length}/${toplam} kayıt tarandı, eşleşme yok`);
  }

  if (bulunan.length === 0) {
    console.log(`\n❌ TEYİT EDİLEMEDİ: ${esas} E., ${karar} K. — Yargıtay arama servisinde bulunamadı.`);
    console.log(`   (${taranan} kayıt tarandı; "${esasRakam}" toplam ${toplamKayit} sonuç döndürüyor)`);
    console.log("   ⚠️  Bu künye dilekçeye bu hâliyle KONULMAMALIDIR.");
    console.log("   Öneri: ilkesel atıf yapın ('Yargıtay'ın yerleşik içtihadında kabul edildiği üzere…')");
    console.log("   veya --ara ile gerçek bir karar bulup künyesini kullanın.");
    process.exitCode = 1;
    return;
  }

  for (const k of bulunan) {
    console.log(`\n✅ DOĞRULANDI: ${k.daire} ${k.esasNo} E., ${k.kararNo} K. (${k.kararTarihi})`);
    const metin = await kararMetni(k.id);
    const ad = emsalYaz(k, metin, "yargitay_daire_kararlari", `${esas}-${karar}`);
    console.log(`   Karar metni: ${metin.length} karakter → ${ad}`);
  }
}

async function modKontrol() {
  console.log("🧪 Canlı API kontrolü — dolandırıcılık kararı aranıyor");
  const y = await aramaYap("dolandırıcılık", { limit: 1 });
  const ok = y.metadata.FMTY === "SUCCESS" && (y.data?.recordsTotal ?? 0) > 0 && (y.data?.data.length ?? 0) > 0;
  if (!ok) {
    console.log("❌ Kontrol BAŞARISIZ");
    process.exitCode = 1;
    return;
  }
  const k = y.data!.data[0];
  console.log(`✅ Kontrol BAŞARILI — ${y.data!.recordsTotal} kayıt erişilebilir`);
  console.log(`   Örnek: ${k.daire} ${k.esasNo} E., ${k.kararNo} K.`);
  const metin = await kararMetni(k.id);
  console.log(`   Karar metni: ${metin.length} karakter ${metin.length > 500 ? "✓" : "✗"}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);

function arg(deger: string, varsayilan?: string): string | undefined {
  const i = argv.indexOf(`--${deger}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : varsayilan;
}

if (argv.includes("--kontrol")) {
  await modKontrol();
} else if (argv.includes("--dogrula")) {
  const i = argv.indexOf("--dogrula");
  const esas = argv[i + 1];
  const karar = argv[i + 2];
  if (!esas || !karar) {
    console.error('Kullanım: --dogrula "<esas>" "<karar>" [--daire "1. Ceza Dairesi"]');
    process.exit(1);
  }
  await modDogrula(esas, karar, arg("daire"));
} else if (argv.includes("--ara")) {
  const i = argv.indexOf("--ara");
  const kelime = argv[i + 1];
  if (!kelime) {
    console.error('Kullanım: --ara "<arama kelimesi>" [--daire ...] [--yil 2020-2024] [--limit 10]');
    process.exit(1);
  }
  const yil = arg("yil");
  await modAra(kelime, {
    daire: arg("daire"),
    yilBas: yil?.split("-")[0] ? `01.01.${yil.split("-")[0]}` : undefined,
    yilSon: yil?.split("-")[1] ? `31.12.${yil.split("-")[1]}` : undefined,
    limit: Number(arg("limit", "10")),
  });
} else {
  console.log(`EmsalBul — Yargıtay emsal karar aracı

Kullanım:
  bun TOOLS/EmsalBul.ts --kontrol
      Canlı API erişimini sınar.

  bun TOOLS/EmsalBul.ts --ara "<kelime>" [--daire "1. Ceza Dairesi"] [--yil 2020-2024] [--limit 10]
      Karar arar, metinlerini çeker, künyesi doğrulanmış dosyalar üretir.

  bun TOOLS/EmsalBul.ts --dogrula "<esas>" "<karar>" [--daire "..."]
      Elde olan bir künyeyi kaynakta teyit eder. Bulunamazsa hata kodu döner.

KURAL: Dilekçeye giren her Yargıtay künyesi ya bu araçla doğrulanmış
ya da 04_ictihat_ve_emsal_bankasi/ altında mevcut olmalıdır.`);
}
