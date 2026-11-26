"use client";

import type { ReactNode } from "react";

import type { Id } from "@/lib/types";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Used as the card title on mobile. */
  primary?: boolean;
};

/** Table on md+, stacked cards on small screens. */
export function DataTable<T extends { id: Id }>({
  columns,
  rows,
  actions,
}: {
  columns: Column<T>[];
  rows: T[];
  actions?: (row: T) => ReactNode;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);
  return (
    <>
      <div className="thin-scroll hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-3 ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle text-slate-700 ${c.className ?? ""}`}>
                    {c.cell(r)}
                  </td>
                ))}
                {actions && <td className="whitespace-nowrap px-4 py-3 text-right">{<div className="flex justify-end gap-1.5">{actions(r)}</div>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2.5 p-4">
            <div className="font-medium text-slate-900">{primary.cell(r)}</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {rest.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-xs text-slate-500">{c.header}</dt>
                  <dd className="break-words text-slate-700">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
            {actions && <div className="flex flex-wrap gap-2 pt-1">{actions(r)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
