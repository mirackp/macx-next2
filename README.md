# MacX — Next.js web uygulaması

Next.js 16.4, React 19, TypeScript ve Node.js 22/24 ile çalışan futbol/stüdyo uygulaması. PHP çalışma zamanı gerekmez.

Bu klasör `macx-next` kopyasıdır. Ana klasör ayrı durur.

## Özellikler

- Logolu lacivert / mavi / neon yeşil MacX tasarımı, beş karakterli stüdyo.
- Maç ekranı açılınca masa yorum yazar. Kertenkele, tilki, karga, kaplumbağa ve kedi yalnızca skor, form, sezon cetveli, yayın, stadyum, hakem, şekil ve olay metnini kullanır. Kaynakta olmayan sonuç, kadro veya bahis cümlesi kurulmaz.
- Sunucuda oluşturulan sayfalar ve hızlı istemci geçişleri.
- Maç listesi, tarih/lig/durum filtreleri, arama, favoriler ve canlı skor yenileme.
- Talep üzerine gelen maç anları, istatistik, kadro, son maçlar ve oranlar.
- Oturumlu yönetim: tahmin taslak/yayın/sonuç işlemleri, SEO, Google, banner ve sosyal medya ayarları.
- MySQL'de kalıcı içerik ve önbellek; dağıtım dizininde özel veri saklanmaz.
- Giriş sınırlaması, scrypt parola özeti, HttpOnly/SameSite oturum ve CSRF koruması.
- Önceki `.php` sayfa adresleri yeni sayfalara yönlenir.

## Yerel geliştirme

Node.js 22 veya 24 kurulu olmalıdır.

```sh
npm ci
npm run dev
```

Adres: `http://localhost:3000`. Yerel geliştirmede MySQL belirtilmediyse kayıtlar git tarafından dışlanan `.runtime/` dizinindedir. Yönetici girişi için `.env.local` içinde en az 32 rastgele karakterli `APP_SECRET`, `ADMIN_USERNAME` ve en az 12 karakterli `ADMIN_PASSWORD` tanımlayın.

## Hostinger'a kurulum

Ayrıntılı sıra: [HOSTINGER-KURULUM.md](HOSTINGER-KURULUM.md).

- Uygulama türü: **Web App / Next.js**
- GitHub deposu: **mirackp/MacX**, dal: **main**
- Kök dizin: `/`
- Node.js: **22.x veya 24.x**
- Kurulum: `npm ci`
- Derleme: `npm run build`
- Başlatma: `npm start`
- Çıktı: `.next`

Hostinger MySQL veritabanını oluşturup DB değişkenleri, `APP_URL`, `APP_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` ortam değişkenlerini tanımlayın. Tablolar ilk kullanımda otomatik oluşturulur. Üretimde `MACX_STORAGE=file` kullanmayın; Hostinger dağıtım klasörlerini yeniler.

## Eski PHP verilerini taşıma

Eski `data/` klasörünü özel olarak yedekleyin. MySQL bağlantısı tanımlı ortamda:

```sh
npm run import:php -- /eski-site/data
```

Bu komut ayarları, tahminleri, uyumlu parola özetini ve isteğe bağlı skor önbelleğini taşır. Mevcut kayıtların üzerine yazmaz; açıkça `--overwrite` verilirse yazar. Yönetici ve ayar dosyalarını GitHub'a yüklemeyin. Aktarımda mevcut PHP bcrypt parolası korunur; yeni parolalar scrypt ile saklanır.

## Kontroller

```sh
npm test
npm run build
npm run typecheck
```

İsteğe bağlı gerçek MySQL testi: `MACX_MYSQL_TEST=1` ve adı `_test` ile biten ayrı bir test veritabanının DB değişkenleri tanımlandıktan sonra `npm run test:mysql`. Bu test normal üretim veritabanına karşı çalışmaz.

## Dış veriler ve sınırlar

Maçlar ESPN ve TheSportsDB; yayın programları beIN ve S Sport; oranlar İddaa ve Nesine kaynaklarından, kaynakta bulunabildikleri ölçüde alınır. Sonuçların doğruluğu ve kaynakların erişimi/lisansları garanti edilmez. Hiçbir maç, oran veya kadro uydurulmaz. Eski PHP sürümündeki yalnızca hata/boş durum gösteren ek bahis şirketi kutuları kaldırılmıştır; yeni uygulama entegre kaynaklardan gerçek yanıtları gösterir.

İlk maç verisi henüz oluşmadıysa sayfa hemen açılır ve program arka planda hazırlanır. Sonraki ziyaretler hazır kaydı kullanır. Kaynakların tamamı ulaşılamazsa son kayıt korunur ve yeniden denemeler sınırlandırılır. Görsel ve bağlantı optimizasyonları hız için hazırlanmıştır; Hostinger'da ölçülmüş performans puanı iddia edilmez.

Yayından önce `/gizlilik` metnine işletmeci bilgilerinizi ekleyin. Google entegrasyonları ziyaretçinin kabulünü bekler; temel çerez seçimi sertifikalı CMP değildir.
