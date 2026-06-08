import { useState } from "react";
import { api } from "../../../lib/api";

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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionResult | null>(null);

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
    </section>
  );
}