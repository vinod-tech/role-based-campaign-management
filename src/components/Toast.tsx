"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type ToastItem = { id: number; type: "success" | "error"; message: string };
type ToastApi = { success: (m: string) => void; error: (m: string) => void };

const Ctx = createContext<ToastApi>({ success: () => {}, error: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((type: ToastItem["type"], message: string) => {
    const id = nextId.current++;
    setItems((x) => [...x.slice(-3), { id, type, message }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), type === "error" ? 5500 : 3200);
  }, []);

  const api = useMemo<ToastApi>(() => ({ success: (m) => push("success", m), error: (m) => push("error", m) }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-3 pr-4 text-sm shadow-lg ${
              t.type === "error" ? "border-red-200" : "border-emerald-200"
            }`}
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                t.type === "error" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
              }`}
            >
              <Icon name={t.type === "error" ? "alert" : "check"} className="size-3.5" />
            </span>
            <span className="text-slate-700">{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
