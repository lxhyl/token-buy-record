"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useI18n();

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const Icon = ({ type }: { type: ToastType }) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className="flex items-center gap-2 bg-popover text-popover-foreground border rounded-xl shadow-lg px-4 py-3 animate-slide-in"
          >
            <Icon type={toastItem.type} />
            <span className="text-sm font-medium flex-1">{toastItem.message}</span>
            <button
              onClick={() => dismiss(toastItem.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label={t("common.dismissNotification")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
