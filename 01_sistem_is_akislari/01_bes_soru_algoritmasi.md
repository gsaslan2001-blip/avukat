# 5 Soru Algoritması — Dinamik Üretim Rehberi

Bu dosya, `SKILL.md` içindeki "5 Stratejik Soru" mekanizmasının **nasıl somutlaştırılacağını** açıklar. Amaç rastgele soru sormak değil; olay anlatımındaki **hukuki boşlukları** tespit edip o boşlukları kapatan 5 soru üretmektir.

---

## Temel Kural

Sorular **olaydan türetilir**, şablondan kopyalanmaz. Aynı eksen (usul, maddi unsur, manevi unsur, hukuka uygunluk, delil) her dosyada vardır; ama **içerikleri** olayın kendine özgü belirsizliklerinden doğar.

```
Olay anlatımı
     │
     ▼
┌─────────────────────────────────────────────┐
│ BOŞLUK HARİTASI ÇIKAR                       │
│ Hangi hukuki unsur için veri YOK?           │
│ Hangi noktada iki farklı nitelendirme       │
│ mümkün?                                     │
│ Hangi usul şartı teyit edilmemiş?           │
└─────────────────────────────────────────────┘
     │
     ▼
 Soruları boşluklara eşle → 5 soru
```

---

## Eksen 1 — Usul, Zaman ve Muhakeme Şartları

**Ne zaman bu eksen kritik:**
- Olay tarihi belirsiz
- Şikayete bağlı bir suç şüphesi var (hakaret, tehdit, basit yaralama, güveni kötüye kullanma)
- Dosya henüz savcılıkta mı mahkemede mi bilinmiyor
- Kullanıcının sıfatı belirsiz (müşteki mi şüpheli mi)

**Sorulacak tipik detaylar:**
- Olayın tam tarihi ve saati
- Faili/fiili öğrenme tarihi (şikayet süresi başlangıcı)
- Şu ana kadar verilen dilekçe/ifade var mı; soruşturma numarası
- Uzlaştırma teklifi geldi mi, kabul/ret edildi mi
- Suç tarihinde fail kaç yaşında

**Örnek soru kalıbı:**
> "Olay tam olarak hangi tarihte gerçekleşti ve siz fiili/faili ne zaman öğrendiniz? Bu tarihten itibaren 6 aylık şikayet süresi (TCK m. 73) işlemeye başlar; sürenin geçip geçmediğini tespit etmem gerekiyor."

---

## Eksen 2 — Maddi Unsur ve Nitelikli Haller

**Ne zaman kritik:**
- Suçun basit hâli ile nitelikli hâli arasında ceza farkı büyük
- Kullanılan alet tartışmalı
- Suçun işlendiği yer/saat nitelikli hal doğurabilir

**Suç tipine göre odak:**

| Suç grubu | Sorulacak |
|---|---|
| Kasten yaralama (TCK 86) | Alet (TCK m. 6/1-f silah mı?), darbe sayısı, hedef bölge, adli rapor sonucu (basit tıbbi müdahale / kemik kırığı / duyu kaybı) |
| Öldürme (TCK 81) | Alet, hedef bölge, darbe sayısı, engel hâl, failin sözleri → **öldürmeye teşebbüs mü yaralama mı** ayrımı |
| Hırsızlık (TCK 141-145) | Gece vakti mi (m. 6/1-e), bina/eklentisi içinde mi, değer az mı |
| Yağma (TCK 148) | Cebir/tehdit malın alınmasından önce mi sonra mı; silah var mı |
| Dolandırıcılık (TCK 157-158) | Hile düzeneği neydi; bilişim/banka aracı kullanıldı mı (m. 158/1-f → Ağır Ceza) |
| Hakaret (TCK 125) | Aleni mi (m. 125/4), karşılıklı mı, kamu görevlisine mi |
| Tehdit (TCK 106) | Silahla/birden fazla kişiyle/imzasız mektupla mı (m. 106/2) |

**Örnek soru kalıbı:**
> "Eylem sırasında herhangi bir alet kullanıldı mı? Kullanıldıysa bu alet TCK m. 6/1-f kapsamında 'silah' sayılan bir cisim mi (ateşli silah, bıçak, kesici alet) yoksa sıradan bir cisim mi? Bu ayrım TCK m. 86/3-e nitelikli hâlini doğurur ve cezayı doğrudan etkiler."

---

## Eksen 3 — Manevi Unsur ve Saik

**Ne zaman kritik:**
- Taksirle işlenebilen bir netice var (yaralama, öldürme, yangın)
- Dolandırıcılık / güveni kötüye kullanma şüphesi (hukuki ihtilaf ayrımı)
- Failin amacı suçun oluşumunu değiştiriyor (örn. yaralama kastı mı öldürme kastı mı)

**Kritik ayrım matrisi:**

| Soru | Doğrudan kast | Olası kast | Bilinçli taksir |
|---|---|---|---|
| Neticenin gerçekleşmesini istedi mi? | Evet | Hayır, kabullendi | Hayır, önlediğine inandı |
| Sonuç | Temel ceza | İndirim (m. 21/2) | Ayrı suç (m. 22/3) |

**Dolandırıcılık ↔ hukuki ihtilaf ayrımı için:**
- Başlangıçta aldatma kastı var mıydı?
- Taraflar arasında önceden süregelen ticari ilişki var mı?
- Fail edimini yerine getirebilecek durumda mıydı, sonradan mı imkânsızlaştı?

**Örnek soru kalıbı:**
> "Taraflar arasında olay öncesinde bir ticari ilişki, sözleşme veya borç-alacak durumu var mıydı? Failin başından itibaren aldatarak menfaat sağlama kastıyla mı hareket ettiğini, yoksa sonradan ifa imkânsızlığına mı düştüğünü tespit etmem gerekiyor — bu ayrım dolandırıcılık ile hukuki ihtilaf arasındaki sınırı çizer."

---

## Eksen 4 — Hukuka Uygunluk ve Kusurluluk

**Ne zaman kritik:**
- Karşılıklı tartışmada fiziksel eylem
- Olayın geçmişinde husumet var
- Failin algı/kavrama sorunu olabilir

**Kontrol sırası:**
1. Meşru savunma var mı? (saldırı, o anda, orantılı)
2. Saldırı bitti mi? (meşru savunma bitti, haksız tahrik başlar)
3. İlk haksız hareket kimden? (haksız tahrik m. 29)
4. Sınırın aşılması mazur görülebilir mi? (m. 27/2)
5. Yaş / akıl / cebir engeli var mı?

**Örnek soru kalıbı:**
> "Olay anında karşı taraftan gelen ve sizin meşru savunma (TCK m. 25) hakkınızı doğuracak somut bir saldırı oldu mu? Saldırı siz nezdinde hâlâ devam ediyor muydu, yoksa sona ermiş miydi? Saldırı bitmişse savunma değil, haksız tahrik (TCK m. 29) tartışılır."

---

## Eksen 5 — Delil ve Hukuka Aykırı Delil

**Ne zaman kritik:**
- Kolluk işlemi yapılmış (arama, elkoyma, ifade)
- Özel ses/görüntü kaydı var
- Delil tek başına beyana dayanıyor

**Denetim listesi:**
- Arama: Hâkim kararı veya yazılı emir var mıydı? (CMK 116-119)
- İfade: Müdafi hazır mıydı? (CMK 148/4)
- Ses kaydı: Kaydeden taraf mı? Ani gelişen suç mu?
- Elkoyma: Karar var mı? (CMK 127)
- Delil zinciri: Numune/örnek korundu mu?

**Örnek soru kalıbı:**
> "Dosyadaki deliller arasında kolluk tarafından yapılan arama sonucu elde edilen herhangi bir bulgu var mı? Varsa arama hâkim kararı veya yazılı emirle mi yapılmıştı? Karar yoksa CMK m. 116-119 ve Anayasa m. 38/6 uyarınca bu delil hukuka aykırıdır ve dışlanmasını talep edeceğiz."

---

## Kalite Kontrolü — Sormadan Önce

Her soru için şunları doğrula:

- [ ] **Somut:** Genel bir hukuk sorusu değil, bu olaya özgü
- [ ] **Gerekçeli:** Neden sorulduğu bir cümleyle belirtilmiş
- [ ] **Hedefli:** Cevabı hangi hukuki sonucu değiştiriyor, açık
- [ ] **Tek konulu:** İki farklı şey sormuyor
- [ ] **Mükerrer değil:** Kullanıcının anlattığı bir şeyi tekrar sormuyor

**Kötü soru:** "Olayla ilgili başka bir bilgi var mı?"
**İyi soru:** "Yaralama sonrası düzenlenen adli rapor var mı? Raporda 'basit tıbbi müdahale ile giderilebilir' mi yazıyor, yoksa kemik kırığı/duyu kaybı var mı? Bu ayrım TCK m. 86/1 ile m. 87 arasındaki ceza farkını belirler."

---

## Özel Durum: Bilgi Yetersizse

Kullanıcı çok az bilgi verdiyse, önce **hangi bilgi eksik olduğunu açıkça söyle**, sonra soruları sor:

> "Anlattıklarınızdan suçun nitelendirmesini yapamıyorum; çünkü şu üç nokta belirsiz: [1] olay tarihi, [2] failin kimliği, [3] eylemin niteliği. Aşağıdaki sorularla bunları netleştirelim."

Bu, kullanıcıya sistemi "sorguluyor" değil "birlikte çalışıyor" hissini verir.
