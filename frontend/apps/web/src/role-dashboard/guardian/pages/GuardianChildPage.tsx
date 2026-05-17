import { HeartHandshake, School, ShieldCheck, UserRound } from "lucide-react";
import { GuardianChildCard } from "../components/GuardianChildCard";
import type { GuardianChild } from "../types";

export function GuardianChildPage({ child }: { child: GuardianChild }) {
  return (
    <section className="guardian-page-stack">
      <div className="guardian-page-title">
        <span className="section-kicker">Öğrenci bilgisi</span>
        <h1>Çocuğum</h1>
      </div>

      <div className="guardian-child-layout">
        <section className="principal-surface-card">
          <div className="guardian-card-head">
            <div>
              <h2>Öğrenci kartı</h2>
              <p>Veli hesabı yalnızca ilişkilendirilen öğrencinin bilgilerini görüntüler.</p>
            </div>
          </div>
          <GuardianChildCard child={child} />
        </section>

        <section className="principal-surface-card">
          <div className="guardian-card-head">
            <div>
              <h2>Erişim kapsamı</h2>
              <p>Bu panelde farklı öğrenci veya sınıf verisi gösterilmez.</p>
            </div>
          </div>
          <div className="guardian-scope-list">
            <div>
              <UserRound size={17} />
              <span>Öğrenci</span>
              <strong>{child.fullName}</strong>
            </div>
            <div>
              <School size={17} />
              <span>Sınıf</span>
              <strong>{child.className}</strong>
            </div>
            <div>
              <ShieldCheck size={17} />
              <span>Veri kapsamı</span>
              <strong>Veli erişimi</strong>
            </div>
            <div>
              <HeartHandshake size={17} />
              <span>Destek</span>
              <strong>Kurum iletişimi</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
