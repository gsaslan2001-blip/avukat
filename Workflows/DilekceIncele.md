# Workflow: Dilekçe İnceleme ve 5 Stratejik Soru Tespiti

Bu workflow, kullanıcının sunduğu taslak dilekçeyi, mahkeme başvurusunu veya olay anlatımını derinlemesine inceleyerek hukuki teşhis koyar ve davanın kazanılmasını sağlayacak **5 stratejik soruyu** oluşturur.

---

## Adım Adım İcra Protokolü

### Adım 1: Hukuki Niteleme ve Mahkeme Görev/Yetki Analizi
1. Uyuşmazlığın niteliğini tespit et:
   - Alacak / Tazminat / Sebepsiz Zenginleşme / Haksız Fiil / Sözleşmeye Aykırılık
   - Tüketici Hukuku / İş Hukuku / Ticaret Hukuku / Kira Hukuku / İcra Hukuku / Ceza / İdare
2. Görevli Mahkemeyi belirle:
   - Asliye Hukuk, Asliye Ticaret, Tüketici Mahkemesi, İş Mahkemesi, Sulh Hukuk, İdare/Vergi vb.
3. Yetkili Mahkemeyi belirle:
   - Genel yetkili mahkeme (HMK m. 6: Davalının yerleşim yeri)
   - Sözleşmeden doğan davalarda sözleşmenin ifa edileceği yer (HMK m. 10)
   - Haksız fiilde haksız fiilin işlendiği veya zararın meydana geldiği yer (HMK m. 16)
   - Tüketici davalarında tüketicinin yerleşim yeri (TKHK m. 73/5)
   - Kesin yetki halleri (Taşınmazın aynına ilişkin davalarda taşınmazın bulunduğu yer HMK m. 12)

### Adım 2: Dava Şartları ve Usulü Risk Taraması
1. **Dava Şartı Arabuluculuk:**
   - 7155 s. K. ile TTK m. 5/A (Ticari davalar)
   - 7036 s. K. m. 3 (İşçi/İşveren uyuşmazlıkları)
   - TKHK m. 73/A (Tüketici uyuşmazlıkları)
   - HMK m. 18/B (Kira, kat mülkiyeti, komşuluk hakkı, ortaklığın giderilmesi)
   *Arabuluculuk son tutanağı yoksa doğrudan davanın reddi riski raporlanır.*
2. **Zamanaşımı ve Hak Düşürücü Süre:**
   - Olay tarihi ile başvuru tarihi arasındaki süre hesaplanır.
   - Zamanaşımı def'i riski varsa durduran/kesen sebepler (ihtar, icra takibi, dava açılması, borcun ikrarı) aranır.
3. **Taraf Sıfatı (Husumet):**
   - Davacı aktif husumet ehliyetine sahip mi? (Hak sahibi mi?)
   - Davalı pasif husumet ehliyetine sahip mi? (Doğru hasım mı?)

### Adım 3: İspat Gücü ve Delil Açıkları Analizi
1. HMK m. 200 senetle ispat sınırının üzerinde kalan iddialar için tanık beyanının dinlenemeyeceği uyarısı.
2. Yazılı delil başlangıcı (HMK m. 202) unsurları (e-posta, WhatsApp dökümü, imzasız sipariş fişi vb.).
3. Temerrüt ihtarnamesi ve tebliğ şerhi varlığı (Faiz ve temerrüt tarihi açısından).

### Adım 4: 5 Stratejik Sorunun Çıkarılması (Format)
Sorular aşağıdaki 5 kategoriden şaşmadan, kullanıcının olayına tam uyarlanarak sorulur:

```markdown
### 📋 Avukat Teşhis Özeti
- **Görevli ve Yetkili Mahkeme:** [Mahkeme adı]
- **Dava Türü:** [Örn: Belirsiz Alacak / İtirazın İptali / Tazminat]
- **Zorunlu Usul Şartı:** [Örn: Dava şartı arabuluculuk tamamlandı mı?]
- **Tespit Edilen Kritik Risk:** [Örn: Temerrüt tarihi muğlak / Yazılı delil eksikliği]

---

### ⚖️ Davayı Çelik Zırhla Tahkim Edecek 5 Stratejik Soru:

1. **[Maddi Vakıa & Kronoloji]:** [Olayın inkar edilemeyecek kesin tarihi, tebliği, fiil anı hakkında net soru]
2. **[Yazılı Delil Durumu]:** [HMK m. 200 uyarınca eldeki kesin deliller, dekont, sözleşme, noter ihtarı hakkında net soru]
3. **[Karşı Savunmayı Çökertme (Def'i Kalkanı)]:** [Karşı tarafın "süre geçti / yetkisiz mahkeme / borcu ödedim / ayıplı ifa" demesini önleyecek somut soru]
4. **[Zarar / Alacak Hesabı & Temerrüt]:** [Net talep edilen meblağ, temerrüt tarihi ve faiz türü (avans/yasal) hakkında soru]
5. **[Usul ve Talep Stratejisi]:** [Dava açılış stratejisi (kısmi/belirsiz alacak) ve ihtiyati tedbir/haciz talebi hakkında soru]
```
