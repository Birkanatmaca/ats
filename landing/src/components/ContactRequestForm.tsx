import { FormEvent, useState } from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import {
  contactRequestTypes,
  openContactMailto,
  type ContactFormValues,
  type ContactRequestType
} from "../lib/contact-mail";
import { CONTACT_EMAIL } from "../lib/constants";

const EMPTY_FORM: ContactFormValues = {
  requestType: "demo",
  fullName: "",
  institution: "",
  email: "",
  phone: "",
  studentCount: "",
  message: ""
};

type FormErrors = Partial<Record<keyof ContactFormValues, string>>;

function validateForm(values: ContactFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) errors.fullName = "Ad soyad gerekli.";
  if (!values.institution.trim()) errors.institution = "Kurum adı gerekli.";
  if (!values.email.trim()) {
    errors.email = "E-posta gerekli.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }
  if (!values.message.trim()) errors.message = "Mesaj gerekli.";

  return errors;
}

type ContactRequestFormProps = {
  className?: string;
  defaultRequestType?: ContactRequestType;
  embedded?: boolean;
  onSubmitted?: () => void;
};

export function ContactRequestForm({
  className = "",
  defaultRequestType = "demo",
  embedded = false,
  onSubmitted
}: ContactRequestFormProps) {
  const [values, setValues] = useState<ContactFormValues>({
    ...EMPTY_FORM,
    requestType: defaultRequestType
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function updateField<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    openContactMailto(values);
    setSubmitted(true);
    onSubmitted?.();
  }

  return (
    <div className={`contact-request-form${embedded ? " contact-request-form--embedded" : ""} ${className}`.trim()}>
      {!embedded ? (
        <div className="contact-request-form__head">
          <p className="eyebrow">İletişim</p>
          <h2>Demo, teklif veya genel talep gönderin</h2>
          <p className="section-lead">
            Formu doldurduğunuzda e-posta uygulamanız <strong>{CONTACT_EMAIL}</strong> adresine hazır mesajla
            açılır. Gönder butonuna basarak talebinizi iletebilirsiniz.
          </p>
        </div>
      ) : null}

      <div className="contact-request-form__types" role="tablist" aria-label="Talep türü">
        {contactRequestTypes.map((type) => (
          <button
            aria-selected={values.requestType === type.id}
            className={`contact-request-form__type${values.requestType === type.id ? " is-active" : ""}`}
            key={type.id}
            onClick={() => updateField("requestType", type.id)}
            role="tab"
            type="button"
          >
            {type.label}
          </button>
        ))}
      </div>

      <form className="contact-request-form__grid" noValidate onSubmit={handleSubmit}>
        <label className="contact-field">
          <span>Ad Soyad *</span>
          <input
            autoComplete="name"
            name="fullName"
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Adınız Soyadınız"
            type="text"
            value={values.fullName}
          />
          {errors.fullName ? <em>{errors.fullName}</em> : null}
        </label>

        <label className="contact-field">
          <span>Kurum Adı *</span>
          <input
            autoComplete="organization"
            name="institution"
            onChange={(event) => updateField("institution", event.target.value)}
            placeholder="Okul / Kolej adı"
            type="text"
            value={values.institution}
          />
          {errors.institution ? <em>{errors.institution}</em> : null}
        </label>

        <label className="contact-field">
          <span>E-posta *</span>
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="ornek@kurum.com"
            type="email"
            value={values.email}
          />
          {errors.email ? <em>{errors.email}</em> : null}
        </label>

        <label className="contact-field">
          <span>Telefon</span>
          <input
            autoComplete="tel"
            name="phone"
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+90 5xx xxx xx xx"
            type="tel"
            value={values.phone}
          />
        </label>

        <label className="contact-field">
          <span>Öğrenci Sayısı</span>
          <input
            inputMode="numeric"
            name="studentCount"
            onChange={(event) => updateField("studentCount", event.target.value)}
            placeholder="Örn. 450"
            type="text"
            value={values.studentCount}
          />
        </label>

        <label className="contact-field contact-field--full">
          <span>Mesaj *</span>
          <textarea
            name="message"
            onChange={(event) => updateField("message", event.target.value)}
            placeholder="Kurumunuzun ihtiyaçlarını, demo zaman tercihinizi veya teklif beklentinizi yazın."
            rows={5}
            value={values.message}
          />
          {errors.message ? <em>{errors.message}</em> : null}
        </label>

        <div className="contact-request-form__actions contact-field--full">
          <Button size="lg" type="submit" variant="gradient">
            <Send aria-hidden="true" size={18} strokeWidth={2.2} />
            E-posta ile gönder
          </Button>
          <a className="contact-request-form__mailto" href={`mailto:${CONTACT_EMAIL}`}>
            <Mail aria-hidden="true" size={16} strokeWidth={2.2} />
            {CONTACT_EMAIL}
          </a>
        </div>

        {submitted ? (
          <p className="contact-request-form__hint contact-field--full" role="status">
            E-posta uygulamanız açılmadıysa yukarıdaki adresi kullanarak doğrudan yazabilirsiniz.
          </p>
        ) : null}
      </form>
    </div>
  );
}
