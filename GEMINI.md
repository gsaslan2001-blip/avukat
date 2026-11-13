# AVUKAT Projesi — Sistem ve Operasyon Kuralları

Bu depo; Özel Hukuk (HMK, TBK, TTK, TMK, İİK) ve Ceza Hukuku (TCK, CMK, İnfaz K.) alanlarında kusursuz, savunma yapılamayacak sağlamlıkta (%100 hukuki doğrulukta) dilekçe, suç duyurusu, savunma layihası ve itiraz metinleri üretmek için yapılandırılmış operasyonel merkezdir.

---

## 🏛️ Proje Mimarisi ve Klasör Yapısı

```
C:\Users\FURKAN\Desktop\Projeler\AVUKAT\
├── GEMINI.md                                    # Proje anayasası ve çalışma kuralları
├── README.md                                    # Proje genel bakışı ve hızlı başlangıç
├── SKILL.md                                     # PAI / Antigravity Avukat Skill tanımı
├── Workflows/                                   # İcra İş Akışları
│   ├── DilekceIncele.md                         # Hukuk dilekçesi teşhis ve 5 soru çıkarma
│   ├── DilekceYaz.md                            # Hukuk dava ve cevap dilekçesi tanzimi
│   └── Ceza_Sikayet_ve_Savunma.md               # Savcılık şikayeti, sanık savunması ve itiraz
├── References/                                  # Hukuk Kütüphanesi & Rehberler
│   ├── TCK_ve_Ceza_Hukuku_Rehberi.md            # TCK suç teorisi, kast, şikayet süreleri, CMK
│   ├── HMK_Usul_Rehberi.md                      # Dava şartları, ispat yükü, faiz kuralları
│   ├── Dilekce_Bicim_ve_Uslup_Rehberi.md        # UYAP tipografisi, 10 blok, IRAC ikna modeli
│   └── Dilekce_Ornekleri_Kutuphanesi.md         # Kanonik şablonlar (dolandırıcılık, beraat vb.)
├── Taslaklar/                                   # Gelen ham metinler, olay özetleri, belgeler
└── Dilekceler/                                  # Üretilen nihai, infaza hazır dilekçeler
```

---

## ⚖️ Operasyonel Kurallar ve Çalışma Protokolü

1. **3 Aşamalı Çelik Hat Şaşmaz:**
   - **Adım 1:** Gelen ham dilekçeyi / vakıayı oku; görev, yetki, arabuluculuk, hak düşürücü süre ve zamanaşımı taramasını yap.
   - **Adım 2:** Kullanıcıya mutlaka somut olaya uyarlanmış **5 Stratejik Soru** sor. Bu sorular yanıtlanmadan veya kullanıcı "elindeki verilerle en güçlü kurguyu yap" demeden nihai dilekçeye geçme.
   - **Adım 3:** Savunma yapılamaz nitelikte, Yargıtay standardında, HMK m. 119/129 veya CMK m. 158/170/223'e %100 uyumlu nihai metni tanzim et.
2. **Önleyici Savunma Kalkanı:**
   - Karşı tarafın sığınabileceği muhtemel savunmalar (zamanaşımı, yetki, kusur atfı, alacak-verecek/hukuki ihtilaf savunması) dilekçe gövdesinde emsal Yargıtay kararlarıyla peşinen çürütülür.
3. **UYAP Biçim Standartlarına Tam Uyum:**
   - Dilekçeler UYAP Doküman Editörü ve resmî adli yazışma standartlarında; 10 zorunlu blok eksiksiz olacak şekilde üretilir.
4. **Çıktı Lokasyonu:**
   - Üretilen nihai dilekçeler `C:\Users\FURKAN\Desktop\Projeler\AVUKAT\Dilekceler\` altında tarih ve dosya konusuna göre adlandırılarak saklanır (Örn: `2024-11-13_Nitelikli_Dolandiricilik_Suc_Duyurusu.md`).
