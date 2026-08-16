import { Check, CircleAlert, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./ToastHost.css";

type ToastKind = "error" | "success" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TITLES: Record<ToastKind, string> = {
  error: "İşlem başarısız",
  success: "Tamamlandı",
  info: "Bilgi"
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setToasts((current) => [...current.slice(-2), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 4600);
  }, [dismiss]);

  const api = useMemo<ToastApi>(
    () => ({
      error: (message) => push("error", message),
      success: (message) => push("success", message),
      info: (message) => push("info", message)
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="toast-host">
        {toasts.map((item) => (
          <div className={`toast-card toast-card--${item.kind}`} key={item.id} role="status">
            <span className="toast-card__icon" aria-hidden>
              {item.kind === "error" ? <CircleAlert size={18} /> : null}
              {item.kind === "success" ? <Check size={18} /> : null}
              {item.kind === "info" ? <Info size={18} /> : null}
            </span>
            <div className="toast-card__body">
              <strong>{TITLES[item.kind]}</strong>
              <p>{item.message}</p>
            </div>
            <button aria-label="Kapat" className="toast-card__close" onClick={() => dismiss(item.id)} type="button">
              <X size={16} />
            </button>
            <span className="toast-card__progress" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast ToastProvider içinde kullanılmalıdır.");
  }
  return value;
}
