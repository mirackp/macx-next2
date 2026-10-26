"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state">
      <h1>Şu anda sayfayı hazırlayamadık.</h1>
      <p>
        Lütfen yeniden deneyin. Yöneticiyseniz sunucu ve veritabanı bağlantısını
        kontrol edin.
      </p>
      <button className="primary" onClick={reset}>
        Yeniden dene
      </button>
    </section>
  );
}
