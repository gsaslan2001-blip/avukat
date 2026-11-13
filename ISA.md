---
project: AVUKAT
phase: build
progress: 0/38
tier: E3
updated: 2026-11-13
---

# ISA — AVUKAT Kanun Kütüphanesi ve Emsal Katmanı

## Problem

AVUKAT projesi markdown tabanlı bir hukuk dilekçesi üretim sistemidir ancak üç yapısal boşluk taşır:

1. **Kanun metni yok.** Yalnızca `References/TCK_ve_Ceza_Hukuku_Rehberi.md` gibi 6-12 KB'lık özet rehberler var. Dilekçeye yazılan hiçbir madde metni kaynaktan doğrulanamıyor. Kullanıcı yalnızca TCK'yı elle ekledi; HMK, TBK, TTK, CMK, TMK, İİK, İş K. yok.
2. **Emsal karar katmanı yok.** `Dilekce_Ornekleri_Kutuphanesi.md` içinde sabit yazılmış künyeler (CGK 2018/15-274 E., 2017/723 E.) hiçbir kaynaktan doğrulanmamış. Doğrulanmamış künye dilekçeye girdiğinde mesleki sorumluluk doğurur. Bu, "sıfır hata" iddiası taşıyan bir sistemde en yüksek riskli kusurdur.
3. **Kapsam-kütüphane uyuşmazlığı.** `SKILL.md` İİK, İnfaz, İdari Yargı, İş Hukuku'nu kapsamda sayıyor; `References/` altında bunlara ait tek dosya yok.

## Vision

Kullanıcının şahsi hukuki dosyalarını takip ettiği, her atfın kaynağından doğrulanabildiği, emsal kararları canlı kaynaktan çekip künyesini teyit eden kapalı devre bir hukuk çalışma merkezi. Bir madde veya karar künyesi dilekçeye girdiğinde, o atfın kaynağı diskte veya API yanıtında mevcut olmalı.

## Out of Scope

- **Git yok.** Kullanıcı açıkça reddetti. Sürüm kontrolü kurulmayacak, `.gitignore` yazılmayacak.
- **Web uygulaması / arayüz yok.** Bu bir markdown + CLI araç seti.
- **Hukuki tavsiye otomasyonu yok.** Sistem taslak üretir; nihai hukuki takdir kullanıcıya aittir.
- **Ticari kullanım / çok kullanıcı yok.** Tek kullanıcı, şahsi dosya takibi.
- **Tüm mevzuatı indirmek yok.** Yalnızca dilekçe pratiğinde fiilen kullanılan çekirdek kanunlar.

## Principles

1. **Kaynaksız atıf yasak.** Her kanun maddesi ve emsal künye ya `Kanunlar/` altındaki dönüştürülmüş metinden ya da canlı API yanıtından gelir. Hafızadan madde numarası yazılmaz.
2. **Doğrulanamayan künye işaretlenir.** API'den teyit edilemeyen emsal `[KÜNYE TEYİT EDİLMEDİ]` etiketiyle çıkar, sessizce kullanılmaz.
3. **Metin otoritedir, özet değil.** Kanun dosyaları resmî kaynaktan (mevzuat.gov.tr) birebir dönüştürülür. Yorum/şerh ayrı katmanda tutulur, kanun metnine karışmaz.
4. **Tekrar üretilebilirlik.** Dönüştürme ve emsal çekme betikleri `TOOLS/` altında durur; kaynak değişince yeniden çalıştırılır.
5. **Yerel önce.** Ağ erişimi başarısız olursa `Kanunlar/` altındaki yerel metinle çalışılır; ağ zorunlu bağımlılık değildir.

## Constraints

- Platform: Windows 11, PowerShell + Git Bash. Çalıştırma: `bun` (CLAUDE.md zorunluluğu).
- Kaynak: `https://www.mevzuat.gov.tr/mevzuatmetin/{Tertip}.{Tip}.{No}.htm` — Tertip 5 (2000 sonrası), Tertip 3 (1960-2000), Tertip 4 (1960 sonrası özel).
- Kodlama: mevzuat.gov.tr HTML'i `windows-1254`. UTF-8 decode edilirse Türkçe karakterler bozulur.
- Emsal API: `https://karararama.yargitay.gov.tr/aramalist` (POST, UTF-8 JSON) + `/getDokuman?id=` (karar metni). Ücretsiz, auth yok.
- mevzuat.gov.tr DNS zaman zaman çözülmüyor; `curl -L` + tarayıcı UA gerekir.
- Git kullanılmayacak — yedekleme kullanıcının sorumluluğunda.

## Goal

`Kanunlar/` altında çekirdek kanunların madde-bazlı, aranabilir markdown kütüphanesini kur; `TOOLS/` altında yeniden üretilebilir dönüştürücü ve emsal arama araçlarını yaz; doğrulanmamış künyeleri sistemden temizle; eksik rehber alanlarını (İİK, İnfaz, İdari Yargı, İş) doldur; dilekçe üretiminde mekanik doğrulama checklist'i ekle.

## Criteria

### Kanun Kütüphanesi
- [ ] ISC-1: `Kanunlar/` altında TCK 5237 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-2: `Kanunlar/` altında HMK 6100 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-3: `Kanunlar/` altında TBK 6098 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-4: `Kanunlar/` altında TTK 6102 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-5: `Kanunlar/` altında TMK 4721 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-6: `Kanunlar/` altında CMK 5271 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-7: `Kanunlar/` altında İİK 2004 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-8: `Kanunlar/` altında İş K. 4857 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-9: `Kanunlar/` altında TKHK 6502 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-10: `Kanunlar/` altında İYUK 2577 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-11: `Kanunlar/` altında CGTİHK 5275 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-12: `Kanunlar/` altında Arabuluculuk 6325 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-13: `Kanunlar/` altında KMK 634 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-14: `Kanunlar/` altında KMHK 6183 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-15: `Kanunlar/` altında Avukatlık K. 1136 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-16: `Kanunlar/` altında Tebligat K. 7201 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-17: `Kanunlar/` altında Faiz K. 3095 dönüştürülmüş markdown olarak mevcut
- [ ] ISC-18: `Kanunlar/` altında 7036 (arabuluculuk dava şartı) dönüştürülmüş markdown olarak mevcut
- [ ] ISC-19: Her kanun dosyası `## Madde N` başlık biçimini kullanıyor (Grep ile doğrulanabilir)
- [ ] ISC-20: Her kanun dosyası Türkçe karakterleri doğru içeriyor — ş/ğ/ı/ç/ö/ü bozulmamış
- [ ] ISC-21: `Kanunlar/INDEX.md` her kanun için madde aralığı ve toplam madde sayısı listeliyor
- [ ] ISC-22: `Kanunlar/INDEX.md` kanun numarası, adı, kabul tarihi ve dosya yolunu içeriyor

### Araçlar
- [ ] ISC-23: `TOOLS/KanunCevir.ts` mevzuat HTML'ini madde-bazlı markdown'a çeviriyor
- [ ] ISC-24: `TOOLS/KanunCevir.ts` windows-1254 kodlamasını doğru çözüyor
- [ ] ISC-25: `TOOLS/KanunCevir.ts` her kanun için JSON madde indeksi üretiyor
- [ ] ISC-26: `TOOLS/EmsalBul.ts` Yargıtay API'sinden karar künyesi + metni çekiyor
- [ ] ISC-27: `TOOLS/EmsalBul.ts` `--dogrula` modunda verilen künyeyi kaynakta teyit ediyor
- [ ] ISC-28: `bun TOOLS/EmsalBul.ts --kontrol` canlı API'den en az 1 gerçek karar döndürüyor

### Doğruluk ve Güvenlik Katmanı
- [ ] ISC-29: `References/Dilekce_Ornekleri_Kutuphanesi.md` içindeki doğrulanmamış künyeler işaretlendi
- [ ] ISC-30: `References/Emsal_Dogrulama_Protokolu.md` mevcut — künye teyit kuralını tanımlıyor
- [ ] ISC-31: `Workflows/DilekceKontrol.md` mekanik doğrulama checklist'i mevcut
- [ ] ISC-32: Checklist, harca esas değer ↔ netice-i talep tutarlılığını kontrol ediyor
- [ ] ISC-33: Checklist, delil numarası ↔ Ek listesi eşleşmesini kontrol ediyor

### Kapsam Boşluklarının Kapatılması
- [ ] ISC-34: `References/IIK_ve_Icra_Rehberi.md` mevcut (itirazın iptali, haciz, menfi tespit)
- [ ] ISC-35: `References/Infaz_ve_CGTIHK_Rehberi.md` mevcut (denetimli serbestlik, koşullu salıverme)
- [ ] ISC-36: `References/Idari_Yargi_ve_IYUK_Rehberi.md` mevcut (İYUK süreleri)
- [ ] ISC-37: `References/Is_Hukuku_Rehberi.md` mevcut (kıdem/ihbar, işe iade süreleri)
- [ ] ISC-38: `References/Yorum_ve_Serh_Katmani.md` mevcut — madde yorumu kaynakla ayrıştırılmış

### Anti-criteria
- [ ] Anti-ISC-1: Hiçbir dilekçe şablonu doğrulanmamış künyeyi teyit edilmiş gibi sunmaz
- [ ] Anti-ISC-2: Kanun metinlerine yorum/şerh karıştırılmaz — otorite ile görüş ayrı dosyalarda

## Test Strategy

| Katman | Probe |
|---|---|
| Kanun dosyası var mı | `Read` / `Glob` |
| Madde biçimi doğru mu | `Grep -c "^## Madde "` her dosyada > 0 |
| Türkçe karakter | `Grep "ş"`, `Grep "Ä"` (bozukluk) — bozukluk sayısı 0 olmalı |
| Madde sayısı | JSON indeks ↔ markdown başlık sayısı eşit |
| Emsal aracı | `bun TOOLS/EmsalBul.ts --kontrol` → gerçek künye stdout |
| Künye teyidi | bilinen bir künye `--dogrula` ile aranır, bulunamazsa "TEYİT EDİLEMEDİ" |
| Checklist | `Read Workflows/DilekceKontrol.md` — iki mekanik kontrol maddesi mevcut |

## Features

| name | satisfies | depends_on | parallelizable |
|---|---|---|---|
| KanunCevir | ISC-1..22 | — | yes |
| KanunIndirme | ISC-1..18 | — | yes |
| EmsalBul | ISC-26..28 | — | yes |
| EmsalProtokol | ISC-29..30 | EmsalBul | no |
| DilekceKontrol | ISC-31..33 | — | yes |
| ReferansGenisletme | ISC-34..38 | KanunCevir | yes |
| IndexUretimi | ISC-21..22 | KanunCevir | no |

## Decisions

- **Git kurulmadı.** Kullanıcı açıkça reddetti: "git yapılmayacak yalnızca şahsi hukuki dosyalarımın takibi için kullanılacak". Sürüm kontrolü yerine `Kanunlar/INDEX.md` ve kaynak URL'leri izlenebilirlik sağlar.
- **Kaynak mevzuat.gov.tr seçildi.** Resmî, ücretsiz, auth yok. lexpera/kanunum ticari ve HTML kazıma kırılgan. `mevzuat.gov.tr` HTML'i sabit yapıda (`<p>`, `MADDE N-`).
- **Emsal kaynağı Yargıtay karararama API'si.** Test edildi: `aramalist` POST → recordsTotal 231.208; `getDokuman?id=` → 19.682 karakterlik gerçek karar metni. Danıştay karararama da 200 döndü, ikinci kaynak olarak eklenebilir.
- **windows-1254 decode zorunlu.** UTF-8 denemesi `0xfd` hatası veriyor; dosyalar Latin-5. `TextDecoder('windows-1254')` ICU ile çalışıyor.
- **Tertip düzeltmesi.** İlk indirmede 2004/6183/7201 boş döndü (64854 B analytics sayfası). Doğru tertip: 2004→1.3, 6183→1.3, 7201→1.3. Tertip 4 denemeleri başarısız.
- **TCK kullanıcının dosyası korunacak.** Kullanıcının elle eklediği `5237_TÜRK_CEZA_KANUNU_103228 (1).md` silinmez; kanonik dönüşüm ayrı dosyaya yazılır.

## Changelog

### 2026-11-13 — İlk inşa
- **conjecture:** Rehberler + sabit örnekler yeterli bir hukuk üretim sistemi kurar.
- **refuted_by:** Kullanıcı TCK tam metnini ekledi ve "buna benzer kanunlar eklemeliyiz" dedi; ayrıca ornek kütüphanesindeki künyeler hiçbir kaynaktan doğrulanmamış durumda.
- **learned:** Özet rehber ile kanun metni farklı işlevlerdir. Rehber "neye bakılır" der, kanun metni "ne yazıyor" der. Emsal ise üçüncü, bağımsız katmandır ve mutlaka canlı doğrulanmalıdır.
- **criterion_now:** ISC-1..38.

## Verification

<!-- EXECUTE fazında doldurulur -->
