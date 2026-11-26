"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { cn } from "./ui";

import type { Id } from "@/lib/types";

export type MultiOption = { value: Id; label: string; hint?: string };

const RENDER_LIMIT = 300;

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  emptyText = "No options available",
  disabled,
  invalid,
  label,
}: {
  options: MultiOption[];
  value: Id[];
  onChange: (v: Id[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = useMemo(() => new Set(value), [value]);
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t) || o.hint?.toLowerCase().includes(t)) : options;
  }, [options, q]);
  const visible = filtered.slice(0, RENDER_LIMIT);

  const toggle = (v: Id) => onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.value));
  const selectAllFiltered = () => {
    if (allFilteredSelected) {
      const drop = new Set(filtered.map((o) => o.value));
      onChange(value.filter((v) => !drop.has(v)));
    } else {
      onChange([...new Set([...value, ...filtered.map((o) => o.value)])]);
    }
  };

  const chips = value.map((v) => byValue.get(v)).filter((o): o is MultiOption => !!o);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-[2.5rem] w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-400",
          invalid ? "border-red-400" : open ? "border-brand-500" : "border-slate-300",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {chips.length === 0 && <span className="text-slate-400">{placeholder}</span>}
          {chips.slice(0, 3).map((c) => (
            <span key={c.value} className="inline-flex max-w-[10rem] items-center truncate rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              <span className="truncate">{c.label}</span>
            </span>
          ))}
          {chips.length > 3 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">+{chips.length - 3} more</span>}
        </span>
        <Icon name="chevronDown" className={cn("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[14rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <button type="button" onClick={selectAllFiltered} disabled={filtered.length === 0} className="font-medium text-brand-600 hover:underline disabled:text-slate-400">
                {allFilteredSelected ? "Unselect all" : q ? "Select filtered" : "Select all"}
              </button>
              <span className="text-slate-500">{value.length} selected</span>
              <button type="button" onClick={() => onChange([])} disabled={value.length === 0} className="font-medium text-slate-500 hover:underline disabled:text-slate-300">
                Clear
              </button>
            </div>
          </div>
          <ul id={listId} role="listbox" aria-multiselectable="true" className="thin-scroll max-h-60 overflow-y-auto py-1">
            {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">{options.length === 0 ? emptyText : "No matches"}</li>}
            {visible.map((o) => {
              const on = selected.has(o.value);
              return (
                <li key={o.value} role="option" aria-selected={on}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(o.value)}
                      className="size-4 rounded border-slate-300 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-800">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-xs text-slate-400">{o.hint}</span>}
                  </label>
                </li>
              );
            })}
            {filtered.length > RENDER_LIMIT && (
              <li className="px-3 py-2 text-center text-xs text-slate-400">Showing first {RENDER_LIMIT} of {filtered.length} — refine your search</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
