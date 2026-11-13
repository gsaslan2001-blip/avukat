# Dilekçe Kontrol — Mekanik Doğrulama Checklist'i

> **Amaç:** Dilekçe üretildikten sonra, gönderilmeden önce *makine gibi* denetlenecek tutarlılık kontrolleri. Hukuki doğruluk ayrı bir meseledir; burada **iç tutarlılık** aranır.

---

## 1. Talep ↔ Hesaplama Tutarlılığı

| Kontrol | Nasıl | Hata sonucu |
|---|---|---|
| **Harca esas değer = netice-i talep toplamı** | Dilekçede yazılı "Harca esas değer" ile netice-i talep fıkrasındaki "… TL" rakamı birebir aynı mı? | Harç eksik yatırılır → tamamlama → dava açılmamış sayılma riski |
| **Faiz başlangıç tarihi = temerrüt tarihi** | "… tarihinden itibaren faiz" ifadesi, temerrüdün doğduğu tarihle uyuşuyor mu? | Faiz hakkı kaybı |
| **Faiz türü = işin niteliği** | Ticari iş → avans faizi; adi iş → yasal faiz | Maddi kayıp |
| **Zarar kalemleri toplamı** | Kalemler tek tek yazılmışsa toplam doğru mu? | Bilirkişi raporuyla çelişki |
| **Belirsiz alacak asgari tutar** | "Şimdilik … TL" yazılmış mı, fazlaya ilişkin haklar saklı tutulmuş mu? | Hukuki yarar tartışması |

**Kontrol komutu:**
```bash
grep -n "Harca esas\|Dava değeri\|Belirsiz alacak\|İHTİYATİ" Dilekceler/*.md
```

---

## 2. Delil Numarası ↔ Ek Listesi Eşleşmesi

Metinde atıf yapılan **her** `(Ek-N)` ifadesi, EKLER listesinde karşılık bulmalı. Tersine: EKLER listesindeki her Ek, metinde en az bir kez anılmalı.

| Kontrol | Kural |
|---|---|
| Metindeki Ek atıfları | Hepsi numaralı mı? |
| EKLER listesi | Sıra numaraları tutarlı mı (1,2,3… boşluksuz)? |
| Boşta kalan Ek | Metinde hiç anılmayan Ek var mı? → kaldır veya metinde an |
| Eksik Ek | Metinde `Ek-3` geçiyor ama listede Ek-3 yok mu? → ekle |
| Ek dosyası mevcut mu | Belirtilen dosya gerçekten var mı? (kontrol) |

**Kontrol komutu:**
```bash
# Metindeki Ek atıfları
grep -o "Ek-[0-9]\+" Dilekceler/dosya.md | sort -u
# EKLER listesi
sed -n '/^EKLER:/,$p' Dilekceler/dosya.md
```

---

## 3. Kanun Maddesi Doğruluğu

| Kontrol | Nasıl |
|---|---|
| Her TCK/CMK/HMK atfı depoda var mı? | `grep -c "^## Madde N" Kanunlar/md/<kanun>.md` |
| Fıkra numarası makul mü? | Madde metni okunur, atıf yapılan fıkra teyit edilir |
| Mülga madde kullanılmış mı? | Metinde "(Mülga" ibaresi olan maddeye atıf var mı? |
| Kanun numarası doğru mu? | "6100 sayılı HMK" gibi atıflarda numara doğru |

**Kontrol komutu:**
```bash
# Dilekçedeki tüm madde atıflarını çıkar
grep -oE "(TCK|CMK|HMK|TBK|TTK|TMK|İİK|İşK|TKHK|İYUK) m\. ?[0-9]+(/[0-9]+)?" Dilekceler/dosya.md | sort -u
```

---

## 4. Yargıtay Künyesi Doğrulaması

| Kontrol | Nasıl |
|---|---|
| Metinde geçen her künye bankada mı? | `grep -r "2020/410" 04_ictihat_ve_emsal_bankasi/` |
| Künye doğrulanmamışsa etiket var mı? | `[KÜNYE TEYİT EDİLMEDİ]` işareti konmuş mu? |
| İlkesel atıf kullanılmışsa künye yok mu? | "yerleşik içtihatlarında kabul edildiği üzere" → künye olmamalı |

**Kontrol komutu:**
```bash
grep -oE "[0-9]{4}/[0-9]+ E\., ?[0-9]{4}/[0-9]+ K\." Dilekceler/dosya.md | sort -u
# çıkan her künye için:
# bun TOOLS/EmsalBul.ts --dogrula "<esas>" "<karar>"
```

---

## 5. Süre ve Tarih Tutarlılığı

| Kontrol | Kural |
|---|---|
| Tefhim/tebliğ tarihi | Dilekçede yazılı mı? |
| Süre sonu hesabı | "… tarihinden itibaren N gün" doğru hesaplanmış mı? |
| Dilekçe tarihi | Süre sonundan önce mi? |
| Tatil günü uzaması | Son gün resmî tatile denk geliyorsa uzadı mı? (CMK m. 38/2, HMK m. 93) |

| Dilekçe türü | Süre | Dayanak |
|---|---|---|
| KYOK itirazı | **2 hafta** | CMK m. 173 |
| Tutukluluğa itiraz | **2 hafta** | CMK m. 268 |
| İstinaf | **2 hafta** | CMK m. 273 |
| Temyiz | **2 hafta** | CMK m. 291 |
| Şikayet | 6 ay | TCK m. 73 |
| İdari dava | 60 gün | İYUK m. 7 |
| İdari istinaf/temyiz | 30 gün | İYUK m. 45-46 |
| Ödeme emrine itiraz | 7 gün | İİK m. 60/3 |

---

## 6. Taraf ve Sıfat Tutarlılığı

- [ ] Dilekçe başlığındaki sıfat (MÜŞTEKİ / ŞÜPHELİ / SANIK / KATILAN) metnin tamamında tutarlı mı?
- [ ] Vekil/müdafi ayrımı doğru mu? (müdafi = sanık/şüpheli vekili; vekil = müşteki/katılan vekili)
- [ ] Karşı tarafın sıfatı doğru mu? (soruşturmada şüpheli, kovuşturmada sanık)
- [ ] "Müvekkil" ifadesi doğru kişiyi mi işaret ediyor?
- [ ] İmza bloğu sıfatla uyumlu mu?

---

## 7. Yer Tutucu (Placeholder) Kontrolü

- [ ] Dilekçede `[...]` biçiminde **doldurulmayı bekleyen** alan kaldı mı?
- [ ] Her yer tutucu için kullanıcıya bildirim yapıldı mı?
- [ ] Yer tutucular gerçek bilgi gibi görünecek şekilde mi yazıldı? (olmamalı)

```bash
grep -n "\[" Dilekceler/dosya.md | grep -v "^\s*$"
```

---

## 8. Dil ve Üslup

- [ ] Duygusal ifade / ajitasyon var mı? ("vicdansız", "ahlaksız", "canından bezdirdi")
- [ ] Karşı taraf vekiline şahsi itham var mı?
- [ ] Birinci tekil ("ben") yerine mesleki dil ("müvekkil", "tarafımızca") kullanılmış mı?
- [ ] Cümleler tam ve Türkçe dilbilgisi kurallarına uygun mu?
- [ ] Tekrar eden paragraflar var mı?

---

## 9. Biçim

- [ ] Mercî başlığı tam makam adıyla mı?
- [ ] Dosya/soruşturma numarası doğru formatta mı?
- [ ] TCKN/VKN yazılı mı?
- [ ] UETS adresi yazılı mı?
- [ ] Tarih ve imza bloğu var mı?
- [ ] Baro sicil numarası var mı?

---

## 10. Kaynak İzlenebilirliği

- [ ] "Kullanılan Kaynaklar" bölümü yazıldı mı?
- [ ] Her hukuki iddia hangi katmandan (normatif / doktrin / içtihat) geldiği belirtildi mi?
- [ ] Doğrulanmamış atıf kaldı mı?

---

## Toplu Kontrol Betiği

Bir dilekçeyi hızlıca taramak için:

```bash
DOSYA="Dilekceler/2026-11-13_ornek.md"

echo "=== Ek atıfları ==="
grep -o "Ek-[0-9]\+" "$DOSYA" | sort -u

echo "=== EKLER listesi ==="
sed -n '/^EKLER:/,$p' "$DOSYA"

echo "=== Kanun atıfları ==="
grep -oE "(TCK|CMK|HMK|TBK|TTK|TMK|İİK) m\. ?[0-9]+(/[0-9]+)?" "$DOSYA" | sort -u

echo "=== Yargıtay künyeleri ==="
grep -oE "[0-9]{4}/[0-9]+ E\., ?[0-9]{4}/[0-9]+ K\." "$DOSYA" | sort -u

echo "=== Doldurulmamış yer tutucular ==="
grep -n "\[\.\.\.\|\[ \]" "$DOSYA"
```

---

## Sonuç Kuralı

Bu 10 bölümden **herhangi birinde** işaretlenmemiş madde varsa dilekçe **gönderilmez**. Eksiklik önce giderilir, sonra kullanıcıya "gönderilebilir" raporu verilir.
