import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { ServiceRoute } from "../../../lib/api";

type ProvisionResult = {
  userId: string;
  serviceStaffId: string;
  email: string;
  temporaryPassword: string;
};

export function PrincipalServiceDriversPage() {
  const [firstName, setFirstName] = useState("Ali");
  const [lastName, setLastName] = useState("Yılmaz");
  const [email, setEmail] = useState("ali.yilmaz@ots.local");
  const [phone, setPhone] = useState("+90 555 000 0101");
  const [title, setTitle] = useState("Servis Şoförü");
  const [busy, setBusy] = useState(false);
  const [routes, setRoutes] = useState<ServiceRoute[]>([]);
  const [delayRouteId, setDelayRouteId] = useState("");
  const [delayMinutes, setDelayMinutes] = useState("10");
  const [delayNote, setDelayNote] = useState("");
  const [delayBusy, setDelayBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delayMessage, setDelayMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionResult | null>(null);

  useEffect(() => {
    void api.serviceRoutes().then((items) => {
      const list = items ?? [];
      setRoutes(list);
      setDelayRouteId((current) => current || list[0]?.id || "");
    }).catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        title: title.trim()
      };
      const created = await api.provisionServiceDriver(payload);
      setResult(created);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Şoför oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDelay(event: React.FormEvent) {
    event.preventDefault();
    setDelayBusy(true);
    setError(null);
    setDelayMessage(null);
    try {
      const parsed = Number.parseInt(delayMinutes, 10);
      if (!delayRouteId || !Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Rota ve gecikme dakikası zorunludur.");
      }
      const notification = await api.reportServiceRouteDelay(delayRouteId, {
        delayMinutes: parsed,
        note: delayNote.trim()
      });
      setDelayMessage(`${notification.routeName} için ${notification.deliveredCount} veliye gecikme bildirimi oluşturuldu.`);
      setDelayNote("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gecikme bildirimi gönderilemedi.");
    } finally {
      setDelayBusy(false);
    }
  }

  return (
    <section className="principal-page-stack guidance-data-page">
      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Servis şoförü oluştur</h2>
          <span>Mobil giriş için kullanıcı hesabı açılır</span>
        </header>
        <form className="guidance-data-form" onSubmit={submit}>
          <div className="guidance-data-field-grid">
            <label className="guidance-data-field">
              <span>Ad</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </label>
            <label className="guidance-data-field">
              <span>Soyad</span>
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </label>
            <label className="guidance-data-field">
              <span>E-posta</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="guidance-data-field">
              <span>Telefon</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className="guidance-data-field">
              <span>Ünvan</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-action" disabled={busy} type="submit">
            {busy ? "Oluşturuluyor..." : "Şoför hesabı oluştur"}
          </button>
        </form>
      </article>

      {result ? (
        <article className="guidance-data-card">
          <header className="guidance-data-card-head">
            <h2>Kayıt oluşturuldu</h2>
            <span>Mobil uygulamaya bu bilgilerle giriş yapılır</span>
          </header>
          <div className="guidance-data-result-list">
            <p><strong>User ID:</strong> {result.userId}</p>
            <p><strong>Servis personel ID:</strong> {result.serviceStaffId}</p>
            <p><strong>E-posta:</strong> {result.email}</p>
            <p><strong>Tek kullanımlık şifre:</strong> {result.temporaryPassword}</p>
          </div>
        </article>
      ) : null}

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Servis gecikmesi bildir</h2>
          <span>Seçilen rotadaki öğrencilerin velilerine olay bazlı bildirim oluşturulur</span>
        </header>
        <form className="guidance-data-form" onSubmit={submitDelay}>
          <div className="guidance-data-field-grid">
            <label className="guidance-data-field">
              <span>Rota</span>
              <select value={delayRouteId} onChange={(event) => setDelayRouteId(event.target.value)}>
                <option value="">Rota seç</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} · {route.assignments.length} öğrenci
                  </option>
                ))}
              </select>
            </label>
            <label className="guidance-data-field">
              <span>Gecikme dakikası</span>
              <input inputMode="numeric" value={delayMinutes} onChange={(event) => setDelayMinutes(event.target.value)} />
            </label>
            <label className="guidance-data-field guidance-data-field--wide">
              <span>Not</span>
              <input value={delayNote} onChange={(event) => setDelayNote(event.target.value)} placeholder="Trafik yoğunluğu nedeniyle" />
            </label>
          </div>

          {delayMessage ? <p className="form-success">{delayMessage}</p> : null}

          <button className="primary-action" disabled={delayBusy || routes.length === 0} type="submit">
            {delayBusy ? "Gönderiliyor..." : "Gecikme bildirimi gönder"}
          </button>
        </form>
      </article>
    </section>
  );
}
