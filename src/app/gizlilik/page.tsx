import { CookieButton } from "@/components/Integrations";
export const metadata = {
  title: "Gizlilik ve çerezler",
  robots: { index: false, follow: true },
};
export default function Privacy() {
  return (
    <article className="prose">
      <span className="eyebrow">MACX / GİZLİLİK</span>
      <h1>Gizlilik ve çerez tercihleri</h1>
      <p>
        Maçları takip etmek için ziyaretçi hesabı gerekmez. Favori maçlarınız ve
        çerez tercihiniz tarayıcınızın yerel depolamasında saklanır. Yönetici
        girişi HttpOnly oturum çerezi kullanır; giriş denemeleri IP adresinin
        özetiyle sınırlandırılır.
      </p>
      <h2>Ölçüm ve reklam</h2>
      <p>
        Site sahibi Google Analytics veya AdSense tanımladıysa bu hizmetler
        yalnızca kabulünüzden sonra yüklenir. Google bu hizmetler kapsamında
        kullanım ve cihaz verilerini işleyebilir. Banner görselleri üçüncü taraf
        sunuculardan yüklenebilir. Sunucu ve veri sağlayıcılarının kayıt
        uygulamaları ayrıca geçerlidir.
      </p>
      <h2>Tercihinizi değiştirme</h2>
      <p>
        İzni aşağıdaki düğmeden geri çekebilirsiniz. Reddedince sayfa yenilenir
        ve Google betikleri yüklenmez. Daha önce oluşturulan Google çerezlerini
        tarayıcı ayarlarınızdan silebilirsiniz.
      </p>
      <CookieButton />
      <h2>Site işletmecisi</h2>
      <p>
        İşletmeci yayına almadan önce kendi iletişim, veri sorumlusu ve saklama
        süresi bilgilerini bu metne eklemelidir. Temel çerez seçimi Google
        sertifikalı CMP değildir.
      </p>
    </article>
  );
}
