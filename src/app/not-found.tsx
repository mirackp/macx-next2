import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty-state">
      <span>404</span>
      <h1>Sayfa bulunamadı.</h1>
      <Link href="/" className="primary">
        Maç merkezine dön
      </Link>
    </section>
  );
}
