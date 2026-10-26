"use client";
import { useEffect, useState } from "react";
import type { Settings, Prediction } from "@/lib/types";
import { resultLabels } from "@/lib/cast";
type State = {
  authenticated: boolean;
  configured: boolean;
  csrf?: string;
  username?: string;
  settings?: Settings;
  predictions?: Prediction[];
};
const emptyPrediction: Omit<Prediction, "updatedAt"> = {
  id: "",
  home: "",
  away: "",
  league: "",
  date: "",
  pick: "",
  odds: "",
  analysis: "",
  status: "draft",
  result: "pending",
};
function Field({
  name,
  label,
  value = "",
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        maxLength={2000}
        autoComplete={
          type === "password"
            ? name === "current"
              ? "current-password"
              : "new-password"
            : undefined
        }
      />
    </label>
  );
}
export function AdminApp() {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<typeof emptyPrediction>(emptyPrediction),
    [section, setSection] = useState("overview");
  async function load() {
    try {
      const response = await fetch("/api/admin/state", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Panel yüklenemedi.");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function post(action: string, data: unknown = {}) {
    const response = await fetch("/api/admin/" + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(state?.csrf ? { "X-CSRF-Token": state.csrf } : {}),
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.status === 401)
      setState({ authenticated: false, configured: true });
    if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
    return result;
  }
  async function run(action: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }
  function values(form: HTMLFormElement) {
    return Object.fromEntries(new FormData(form).entries());
  }
  if (!state)
    return (
      <section className="admin-login">
        <span className="eyebrow">MACX / YÖNETİM</span>
        <h1>Kontrol merkezi</h1>
        {error ? (
          <p className="alert error">{error}</p>
        ) : (
          <p role="status">
            <span className="loader" /> Oturum kontrol ediliyor…
          </p>
        )}
        <button className="secondary" onClick={load}>
          Yenile
        </button>
      </section>
    );
  if (!state.authenticated)
    return (
      <section className="admin-login">
        <span className="eyebrow">MACX / YÖNETİM</span>
        <h1>
          Stüdyonun
          <br />
          kontrol merkezi.
        </h1>
        <p>Tahminler, görünürlük ve reklam ayarları.</p>
        {!state.configured ? (
          <div className="alert">
            <b>İlk kurulum gerekli</b>
            <p>
              Hostinger ortam değişkenlerinde APP_SECRET (en az 32 karakter),
              DB_HOST, DB_USER, DB_PASSWORD ve DB_NAME alanlarını doldurun. İlk
              yönetici için ADMIN_USERNAME ile en az 12 karakterli
              ADMIN_PASSWORD belirleyip uygulamayı yeniden dağıtın.
            </p>
          </div>
        ) : null}
        {error ? (
          <p className="alert error" role="alert">
            {error}
          </p>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = values(e.currentTarget);
            run(async () => {
              await post("login", data);
              await load();
            });
          }}
        >
          <Field name="username" label="Kullanıcı adı" required />
          <label className="field">
            <span>Parola</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <button className="primary" disabled={busy || !state.configured}>
            {busy ? "Giriş yapılıyor…" : "Giriş yap →"}
          </button>
        </form>
      </section>
    );
  const rows = state.predictions || [],
    s = state.settings!;
  const nav = [
    ["overview", "Genel bakış"],
    ["predictions", "İddaa tahminleri"],
    ["settings", "Site ve SEO"],
    ["integrations", "Google, reklam ve sosyal"],
    ["security", "Güvenlik"],
  ];
  return (
    <div className="admin-workspace">
      <aside className="admin-nav">
        <span className="eyebrow">KONTROL MERKEZİ</span>
        <h2>MacX yönetim</h2>
        <p>{state.username}</p>
        <nav aria-label="Yönetim bölümleri">
          {nav.map(([id, label]) => (
            <button
              key={id}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await post("logout");
              setState({ authenticated: false, configured: true });
            })
          }
        >
          Çıkış yap
        </button>
      </aside>
      <div className="admin-body">
        <div className="section-title">
          <div>
            <span className="eyebrow">STÜDYO / YÖNETİM</span>
            <h1>{nav.find((n) => n[0] === section)?.[1]}</h1>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="secondary"
          >
            Siteyi görüntüle ↗
          </a>
        </div>
        {error ? (
          <p className="alert error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="alert success" role="status">
            {notice}
          </p>
        ) : null}
        {section === "overview" ? (
          <>
            <div className="admin-stats">
              <div>
                <small>TOPLAM TAHMİN</small>
                <b>{rows.length}</b>
              </div>
              <div>
                <small>YAYINDA</small>
                <b>{rows.filter((r) => r.status === "published").length}</b>
              </div>
              <div>
                <small>VERİ DEPOSU</small>
                <b>Kalıcı kayıt</b>
              </div>
            </div>
            <section className="admin-card">
              <h2>Maç verileri</h2>
              <p>
                Skorlar arka planda otomatik güncellenir. Kaynakları şimdi
                yenilemek için aşağıdaki düğmeyi kullanabilirsiniz.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await post("refresh");
                    setNotice("Veri yenileme arka planda başlatıldı.");
                  })
                }
              >
                Verileri yenile
              </button>
            </section>
            <section className="admin-card">
              <h2>Yayın akışı</h2>
              <p>
                Bir tahmin hazırlayın, taslak olarak kaydedin ve hazır olduğunda
                yayına alın. Sonucu maç sonrası güncelleyebilirsiniz.
              </p>
              <button
                className="secondary"
                onClick={() => setSection("predictions")}
              >
                Yeni tahmin oluştur ↗
              </button>
            </section>
          </>
        ) : null}
        {section === "predictions" ? (
          <>
            <section className="admin-card">
              <h2>{editing.id ? "Tahmini düzenle" : "Yeni tahmin"}</h2>
              <p>
                Tüm saatler Türkiye saatidir. Taslaklar ziyaretçilere
                gösterilmez.
              </p>
              <form
                key={editing.id || "new"}
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = values(e.currentTarget);
                  run(async () => {
                    await post("predictions", {
                      ...data,
                      id: editing.id || crypto.randomUUID(),
                    });
                    await load();
                    setEditing({ ...emptyPrediction });
                    setNotice("Tahmin kaydedildi.");
                  });
                }}
              >
                <div className="fields">
                  {[
                    ["home", "Ev sahibi"],
                    ["away", "Deplasman"],
                    ["league", "Lig"],
                    ["date", "Maç tarihi ve saati"],
                    ["pick", "Tahmin"],
                    ["odds", "Oran (isteğe bağlı)"],
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      name={key}
                      label={label}
                      value={editing[key as keyof typeof editing]}
                      type={key === "date" ? "datetime-local" : "text"}
                      required={["home", "away", "date", "pick"].includes(key)}
                    />
                  ))}
                </div>
                <label className="field">
                  <span>Analiz</span>
                  <textarea
                    name="analysis"
                    defaultValue={editing.analysis}
                    rows={5}
                    maxLength={6000}
                  />
                </label>
                <div className="fields">
                  <label className="field">
                    <span>Yayın durumu</span>
                    <select name="status" defaultValue={editing.status}>
                      <option value="draft">Taslak</option>
                      <option value="published">Yayında</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Sonuç</span>
                    <select name="result" defaultValue={editing.result}>
                      {Object.entries(resultLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="actions">
                  <button className="primary" disabled={busy}>
                    Tahmini kaydet
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setEditing({ ...emptyPrediction })}
                  >
                    Yeni tahmin
                  </button>
                </div>
              </form>
            </section>
            <section className="admin-card">
              <h2>Tüm tahminler</h2>
              {rows.length ? (
                rows.map((r) => (
                  <article className="admin-record" key={r.id}>
                    <div>
                      <b>
                        {r.home} – {r.away}
                      </b>
                      <p>
                        {r.date.replace("T", " · ")} · {r.pick} ·{" "}
                        {r.status === "published" ? "Yayında" : "Taslak"} ·{" "}
                        {resultLabels[r.result]}
                      </p>
                    </div>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => {
                          setEditing(r);
                          document
                            .querySelector(".admin-body")
                            ?.scrollIntoView({ block: "start" });
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("Bu tahmin silinsin mi?"))
                            run(async () => {
                              await post("delete-prediction", { id: r.id });
                              await load();
                              if (editing.id === r.id)
                                setEditing({ ...emptyPrediction });
                              setNotice("Tahmin silindi.");
                            });
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p>Henüz tahmin eklenmedi.</p>
              )}
            </section>
          </>
        ) : null}
        {["settings", "integrations"].includes(section) ? (
          <section className="admin-card">
            <h2>
              {section === "settings"
                ? "Site kimliği ve SEO"
                : "Google, reklam ve sosyal medya"}
            </h2>
            <form
              key={section}
              onSubmit={(e) => {
                e.preventDefault();
                const data = values(e.currentTarget);
                run(async () => {
                  const update = {
                    ...s,
                    ...data,
                    indexable:
                      section === "settings"
                        ? data.indexable === "1"
                        : s.indexable,
                  };
                  const result = await post("settings", update);
                  setState((previous) =>
                    previous
                      ? { ...previous, settings: result.settings }
                      : previous,
                  );
                  setNotice("Ayarlar kaydedildi.");
                });
              }}
            >
              {section === "settings" ? (
                <>
                  <div className="fields">
                    {[
                      ["siteName", "Site adı"],
                      ["title", "SEO başlığı"],
                      ["description", "SEO açıklaması"],
                      ["siteUrl", "HTTPS site adresi"],
                      ["predictionsIntro", "Tahmin sayfası açıklaması"],
                    ].map(([key, label]) => (
                      <Field
                        key={key}
                        name={key}
                        label={label}
                        value={s[key as keyof Settings] as string}
                      />
                    ))}
                  </div>
                  <label className="field">
                    <span>Arama motorları</span>
                    <select
                      name="indexable"
                      defaultValue={s.indexable ? "1" : "0"}
                    >
                      <option value="1">İndekslemeye açık</option>
                      <option value="0">İndekslemeye kapalı</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <p>
                    Analytics ve AdSense ziyaretçinin kabulünden sonra yüklenir.
                    Sosyal bağlantı alanı boşsa platform sitede görünmez.
                  </p>
                  <div className="fields">
                    {[
                      ["googleVerification", "Search Console doğrulama kodu"],
                      ["gaId", "Analytics ölçüm kimliği (G-...)"],
                      ["adsenseId", "AdSense yayıncı kimliği (ca-pub-...)"],
                      ["adSlot", "AdSense reklam birimi"],
                      ["adImage", "Banner görseli HTTPS adresi"],
                      ["adUrl", "Banner hedef HTTPS adresi"],
                      ["adLabel", "Banner açıklaması"],
                      ["youtubeUrl", "YouTube HTTPS adresi"],
                      ["instagramUrl", "Instagram HTTPS adresi"],
                      ["tiktokUrl", "TikTok HTTPS adresi"],
                      ["xUrl", "X HTTPS adresi"],
                    ].map(([key, label]) => (
                      <Field
                        key={key}
                        name={key}
                        label={label}
                        value={s[key as keyof Settings] as string}
                      />
                    ))}
                  </div>
                </>
              )}
              <button className="primary" disabled={busy}>
                Ayarları kaydet
              </button>
            </form>
          </section>
        ) : null}
        {section === "security" ? (
          <section className="admin-card">
            <h2>Parolanı değiştir</h2>
            <p>
              Parola değişince mevcut oturumlar kapatılır. Yeni parolanla tekrar
              giriş yapmalısın.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = values(e.currentTarget);
                run(async () => {
                  await post("password", data);
                  setState({ authenticated: false, configured: true });
                  setNotice("Parola güncellendi.");
                });
              }}
            >
              <Field
                name="current"
                label="Mevcut parola"
                type="password"
                required
              />
              <Field
                name="password"
                label="Yeni parola (en az 12 karakter)"
                type="password"
                required
              />
              <button className="primary" disabled={busy}>
                Parolayı değiştir
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
