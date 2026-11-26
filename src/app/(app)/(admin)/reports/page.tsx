"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge, inputCls } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { fmtDate } from "@/lib/date";
import { useOptions } from "@/lib/hooks";
import type { CampaignDetail } from "@/lib/types";

const columns: Column<CampaignDetail>[] = [
  { key: "name", header: "Campaign", primary: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
  { key: "company", header: "Company", cell: (r) => r.sponsorName },
  { key: "start", header: "Start", cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.startDate)}</span> },
  { key: "end", header: "End", cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.endDate)}</span> },
  { key: "states", header: "States", cell: (r) => r.states.length },
  { key: "districts", header: "Districts", cell: (r) => r.districts.length },
  { key: "channels", header: "Channels", cell: (r) => r.channels.length },
  { key: "slot", header: "Slot", cell: (r) => r.slot },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

function csvEscape(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportsPage() {
  const { data: options } = useOptions();
  const [f, setF] = useState({ from: "", to: "", status: "", sponsorId: "" });
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["reports", f],
    queryFn: () => api<{ items: CampaignDetail[] }>(`/api/reports${qs(f)}`),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];

  const summary = useMemo(() => {
    const uniq = (pick: (c: CampaignDetail) => (string | number)[]) => new Set(items.flatMap(pick)).size;
    return [
      { label: "Campaigns", value: items.length },
      { label: "Running now", value: items.filter((i) => i.status === "running").length },
      { label: "Companies", value: new Set(items.map((i) => i.sponsorId)).size },
      { label: "Channels reached", value: uniq((c) => c.channelIds) },
      { label: "Districts covered", value: uniq((c) => c.districtIds) },
    ];
  }, [items]);

  function exportCsv() {
    const head = ["Campaign", "Company", "Start", "End", "Slot", "Status", "States", "Districts", "Channels"];
    const rows = items.map((c) => [c.name, c.sponsorName, c.startDate, c.endDate, c.slot, c.status, c.states.join("; "), c.districts.join("; "), c.channels.map((x) => x.name).join("; ")]);
    const csv = [head, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const dirty = Object.values(f).some(Boolean);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Campaign coverage by company, status and date range."
        actions={
          <Button variant="secondary" icon="download" onClick={exportCsv} disabled={items.length === 0}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {summary.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            {isPending ? <Skeleton className="mt-2 h-8 w-12" /> : <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>}
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-medium text-slate-500">
            From
            <input type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          </label>
          <label className="text-xs font-medium text-slate-500">
            To
            <input type="date" className={`${inputCls} mt-1`} value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Status
            <select className={`${inputCls} mt-1`} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="">All</option>
              <option value="running">Running</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Company
            <select className={`${inputCls} mt-1`} value={f.sponsorId} onChange={(e) => setF({ ...f, sponsorId: e.target.value })}>
              <option value="">All companies</option>
              {options?.sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" disabled={!dirty} onClick={() => setF({ from: "", to: "", status: "", sponsorId: "" })}>
              Reset
            </Button>
          </div>
        </div>

        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState icon="alert" title="Couldn’t load report" action={<Button onClick={() => refetch()}>Retry</Button>} />
        ) : items.length === 0 ? (
          <EmptyState icon="chart" title="No campaigns match these filters" description="Widen the date range or reset the filters." />
        ) : (
          <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
            <DataTable columns={columns} rows={items} />
          </div>
        )}
      </Card>
    </>
  );
}
