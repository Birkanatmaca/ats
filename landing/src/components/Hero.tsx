export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Türkiye&apos;nin modern okul yönetim platformu</p>
          <h1 id="hero-heading">
            Eğitim kurumunuz için uçtan uca okul yönetim yazılımı.
            <span className="gradient-text"> ogta.ai</span> ile operasyonu hızlandırın.
          </h1>
          <p className="hero-lead">
            OGTA; akıllı yoklama, ders programı, rehberlik, veli iletişimi ve müdür dashboard&apos;unu tek bulut
            platformunda birleştirir. Sosyal ağ değil — günlük okul operasyonu için tasarlanmış kurumsal yazılımdır.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary btn-lg" href="#iletisim">
              Ücretsiz demo planla
            </a>
            <a className="btn btn-secondary btn-lg" href="#ozellikler">
              Platformu keşfet
            </a>
          </div>
          <ul className="hero-stats">
            <li>
              <strong>4 rol</strong>
              <span>Müdür · Öğretmen · Rehberlik · Veli</span>
            </li>
            <li>
              <strong>Multi-tenant</strong>
              <span>Kurum bazlı izolasyon</span>
            </li>
            <li>
              <strong>ogta.ai</strong>
              <span>Onaylı komut asistanı</span>
            </li>
          </ul>
        </div>

        <div className="hero-visual">
          <div className="dashboard-card">
            <div className="dashboard-top">
              <img alt="" height={28} src="/ogta-mark.png" width={28} />
              <span>Bugünkü özet</span>
              <span className="pill pill-green">Canlı</span>
            </div>
            <div className="dashboard-metrics">
              <div className="metric">
                <label>Devam oranı</label>
                <strong>%94</strong>
                <small>+2.1% dün</small>
              </div>
              <div className="metric">
                <label>Aktif sınıf</label>
                <strong>18</strong>
                <small>3 ders devam ediyor</small>
              </div>
              <div className="metric">
                <label>Gözlem</label>
                <strong>12</strong>
                <small>Rehberlikte bekleyen</small>
              </div>
            </div>
            <div className="dashboard-ai">
              <div className="ai-bubble ai-bubble-user">10-A yoklamasını aç</div>
              <div className="ai-bubble ai-bubble-bot">
                Aktif dersiniz Matematik · 10-A. Yoklama ekranını hazırladım, onaylıyor musunuz?
              </div>
            </div>
          </div>
          <div className="floating-card floating-card--1">
            <span className="dot dot-green" />
            Yoklama oturumu kaydedildi
          </div>
          <div className="floating-card floating-card--2">
            <span className="dot dot-blue" />
            Veli bilgilendirme gönderildi
          </div>
        </div>
      </div>
    </section>
  );
}
