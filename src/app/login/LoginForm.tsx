"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Button, Field, inputCls } from "@/components/ui";
import { api } from "@/lib/api";

const DEMOS = [
  { label: "Admin", username: "admin", password: "admin123", note: "Full access" },
  { label: "Sponsor", username: "777foods", password: "sponsor123", note: "777 Foods" },
  { label: "Sponsor", username: "tcm", password: "sponsor123", note: "The Chennai Mobiles" },
];

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await api<{ role: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      router.replace(u.role === "admin" ? "/dashboard" : "/my-campaigns");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900 p-12 text-white lg:flex">
        <Logo light />
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Run every campaign, on every channel, in every district.</h2>
          <p className="mt-4 text-white/80">
            Manage channels, MSOs and sponsors in one place — and let sponsors watch their ads play exactly when their campaign is live.
          </p>
        </div>
        <p className="text-sm text-white/60">© AdCast Manager</p>
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-white/10" />
        <div className="absolute -right-10 top-24 size-48 rounded-full bg-white/10" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field label="Username">
              <div className="relative">
                <Icon name="user" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputCls} pl-9`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Icon name="lock" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputCls} pl-9 pr-16`}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full" disabled={!username || !password}>
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
            <ul className="space-y-1.5">
              {DEMOS.map((d) => (
                <li key={d.username}>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(d.username);
                      setPassword(d.password);
                      setError("");
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>
                      <span className="font-medium text-slate-800">{d.label}</span> <span className="text-slate-500">· {d.username}</span>
                    </span>
                    <span className="text-xs text-slate-400">{d.note}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">Click to fill. Passwords: admin123 / sponsor123.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
