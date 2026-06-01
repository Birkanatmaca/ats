import { trustTags } from "../lib/constants";

export function TrustStrip() {
  return (
    <section className="trust">
      <div className="container trust-inner">
        <p>Kolej, kurs ve özel okullar için tasarlandı</p>
        <div className="trust-tags">
          {trustTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
