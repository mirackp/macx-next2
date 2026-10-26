# MacX Next.js — Hostinger GitHub kurulumu

Bu sürüm PHP değildir. Önceki PHP ZIP yükleme adımlarını kullanmayın.

## 1. Plan ve web uygulaması

Node.js Web App destekleyen Hostinger Business veya Cloud planı gerekir. hPanel → Web Siteleri → Web sitesi oluştur → Web App → Git deposunu içe aktar.

GitHub hesabınızı bağlayın ve **gizli mirackp/MacX** deposunu seçin. Depoyu herkese açmanız gerekmez. Dal `main`, uygulama kökü `/`.

Mevcut PHP sitesinin yerine geçerken önce yedek alın. Hostinger mevcut PHP sitesini yerinde Node.js'e çevirmiyorsa yeni Web App oluşturun; eski siteyi silmeden önce yeni uygulamayı geçici alan adında test edin.

## 2. MySQL veritabanı

hPanel → ilgili site → Veritabanları → Yönetim. Bir MySQL veritabanı ve kullanıcı oluşturun. Adları kullanıcı önekiyle birlikte tam olarak not alın. MacX tabloları uygulama tarafından oluşturulur; SQL dosyası içe aktarmak gerekmez.

## 3. Ortam değişkenleri

Web App → Environment Variables bölümüne ekleyin. Değerleri GitHub'a yazmayın.

| Değişken         | Değer                                                           |
| ---------------- | --------------------------------------------------------------- |
| `APP_URL`        | `https://alanadiniz.com` — sonuna `/` eklemeyin                 |
| `APP_SECRET`     | En az 32 rastgele karakter; örneğin parola yöneticisiyle üretin |
| `ADMIN_USERNAME` | İlk yönetici kullanıcı adınız, en az 3 karakter                 |
| `ADMIN_PASSWORD` | İlk yönetici parolanız, 12–200 karakter                         |
| `DB_HOST`        | Aynı Hostinger hesabındaki veritabanı için `127.0.0.1`          |
| `DB_PORT`        | `3306`                                                          |
| `DB_USER`        | Önek dahil tam MySQL kullanıcı adı                              |
| `DB_PASSWORD`    | MySQL kullanıcı parolası                                        |
| `DB_NAME`        | Önek dahil tam veritabanı adı                                   |
| `CRON_SECRET`    | İsteğe bağlı; en az 24 rastgele karakter                        |

`PORT` değerini Hostinger yönetir. Üretimde `MACX_STORAGE` veya yerel test değişkenlerini eklemeyin. `localhost` yerine `127.0.0.1` kullanın.

İlk başarılı girişte yönetici kaydı MySQL'e oluşturulur. Sonrasında `ADMIN_PASSWORD` değişkenini kaldırabilirsiniz; kaydedilmiş hesabınız çalışmaya devam eder. Panelden değiştirdiğiniz parola veritabanında geçerlidir; ortam değişkeni mevcut parolanın üzerine yazmaz.

## 4. Derleme ayarları

| Alan        | Değer           |
| ----------- | --------------- |
| Framework   | Next.js         |
| Node sürümü | 22.x veya 24.x  |
| Install     | `npm ci`        |
| Build       | `npm run build` |
| Start       | `npm start`     |
| Output      | `.next`         |
| Root        | `/`             |

Deploy seçin. Derleme tamamlandıktan sonra siteyi açın. `main` dalına yeni commit geldiğinde otomatik dağıtım etkin olmalıdır.

## 5. Yönetim

`https://alanadiniz.com/admin` adresini doğrudan açın. Menüde yönetim bağlantısı yoktur.

Giriş → Site ve SEO → gerçek site adresi ve açıklamaları kaydet. Google/reklam/sosyal bölümünden kendi kimlik ve profil adreslerini gir. Test tahminini taslak kaydet; yayına alınca ziyaretçi sayfasından kontrol et.

## 6. Maç verileri

İlk ziyarette veri tabanı boşsa program arka planda hazırlanır. Bu sırada sayfa bekletilmez. Aktif sayfalar yaklaşık 30 saniyede bir hazır kaydı kontrol eder. Veriler kaynaklara bağlıdır.

Panelde Genel bakış → Verileri yenile kullanılabilir. İsteğe bağlı zamanlayıcı, 5 dakikada bir `POST https://alanadiniz.com/api/cron` çağırabilir; `Authorization: Bearer CRON_SECRET_DEGERINIZ` başlığı gerekir. Sırrı URL sorgusuna koymayın. Yalnızca PHP dosyası çalıştıran eski cron görevini yeni sürümde kullanmayın.

## 7. Veri güvenliği ve taşıma

- Ayarlar, tahminler, yönetici, oturumlar ve skor önbelleği MySQL'dedir. Yeniden dağıtım bu kayıtları silmez.
- GitHub deposunda `.env`, parola, özel PHP `data/` dosyaları ve yerel `.runtime/` kayıtları bulunmaz.
- Eski hesabı/tahminleri taşımak için özel PHP yedeğindeki `data/` klasörüyle `npm run import:php -- /eski/data` komutunu çalıştırın. Önce MySQL DB değişkenlerini tanımlayın. README'de ayrıntılar var.
- Hostinger'ın MySQL yedeklerini etkin tutun. Repo yedeği veritabanı yedeği yerine geçmez.

## 8. Son kontrol

- `/`, `/studyo`, `/tahminler` ve `/admin` açılıyor mu?
- `/sitemap.xml` doğru alan adını gösteriyor mu?
- Taslak gizleniyor, yayınlanan tahmin görünüyor mu?
- Bir yeniden dağıtımdan sonra ayar ve tahminler duruyor mu?
- Telefon ekranında maç seçimi ve sekmeler çalışıyor mu?

Sunucu başlangıcı başarısızsa Deployments günlüklerine; bağlantı hatası varsa DB değerlerine bakın. Site 500 veriyorsa parolaları veya tam ortam değişkenlerini herkese açık hata mesajına yapıştırmayın.

## Resmi kaynaklar

- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/
- https://nextjs.org/docs/app/guides/deploying-to-platforms
