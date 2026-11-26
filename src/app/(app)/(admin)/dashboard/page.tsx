"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AreaSpark, BarList, Donut } from "@/components/charts";
import { Icon, type IconName } from "@/components/Icon";
import { Button, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/date";
import type { DashboardData } from "@/lib/types";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function Kpi({ label, value, icon, color, bar, sub, href }: { label: string; value: number; icon: IconName; color: string; bar: number; sub: string; href: string }) {
  return (
    <Link href={href} className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value.toLocaleString()}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl text-white" style={{ background: color }}>
          <Icon name={icon} className="size-5" />
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar}%`, background: color }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </Link>
  );
}

function Panel({ title, a, b, aLabel, bLabel, children }: { title: string; a: number; b: number; aLabel: string; bLabel: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold capitalize text-slate-900">{title}</h3>
      <div className="mt-3 flex gap-6 text-sm">
        <div>
          <p className="text-xs text-slate-500">{aLabel}</p>
          <p className="font-semibold tabular-nums">{a}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{bLabel}</p>
          <p className="font-semibold tabular-nums">{b}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: d, isPending, isError, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => api<DashboardData>("/api/dashboard") });

  if (isPending) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </>
    );
  }
  if (isError) {
    return (
      <Card>
        <EmptyState icon="alert" title="Couldn’t load the dashboard" action={<Button onClick={() => refetch()}>Retry</Button>} />
      </Card>
    );
  }

  const t = d.totals;
  return (
    <>
      <PageHeader title="Dashboard" subtitle="A live snapshot of channels, sponsors and campaigns." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Channels" value={t.channels} icon="tv" color="#10b981" bar={pct(d.channels.active, t.channels)} sub={`${d.channels.active} active`} href="/channels" />
        <Kpi label="Company" value={t.sponsors} icon="building" color="#ee3a3a" bar={pct(d.sponsors.withCampaigns, t.sponsors)} sub={`${d.sponsors.withCampaigns} with campaigns`} href="/sponsors" />
        <Kpi label="Campaigns" value={t.campaigns} icon="megaphone" color="#0ea5e9" bar={pct(d.campaigns.running, t.campaigns)} sub={`${d.campaigns.running} running · ${d.campaigns.upcoming} upcoming`} href="/campaigns" />
        <Kpi label="MSO" value={t.msos} icon="users" color="#8b5cf6" bar={100} sub="Operators registered" href="/msos" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Panel title="Channel" a={d.channels.active} b={d.channels.inactive} aLabel="Active channel" bLabel="Inactive channel">
          <AreaSpark data={d.channelsByMonth} color="#10b981" label="New channels per month" />
        </Panel>
        <Panel title="Company" a={d.sponsors.withCampaigns} b={d.sponsors.without} aLabel="With campaigns" bLabel="Without campaigns">
          <AreaSpark data={d.sponsorsByMonth} color="#06b6d4" label="New companies per month" />
        </Panel>
        <Panel title="Campaign" a={d.campaigns.running} b={d.campaigns.completed} aLabel="Running campaign" bLabel="Completed campaign">
          <AreaSpark data={d.campaignsByMonth} color="#6366f1" label="Campaigns started per month" />
        </Panel>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900">Running campaigns</h3>
          <Donut
            centerValue={String(d.campaigns.running)}
            centerLabel={`of ${t.campaigns}`}
            segments={[
              { label: "Running", value: d.campaigns.running, color: "#22a84a" },
              { label: "Upcoming", value: d.campaigns.upcoming, color: "#38bdf8" },
              { label: "Completed", value: d.campaigns.completed, color: "#cbd5e1" },
            ]}
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900">Completed campaigns</h3>
          <Donut
            centerValue={`${pct(d.campaigns.completed, t.campaigns)}%`}
            centerLabel="completed"
            segments={[
              { label: "Completed", value: d.campaigns.completed, color: "#dc3545" },
              { label: "Remaining", value: t.campaigns - d.campaigns.completed, color: "#e5e7eb" },
            ]}
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900">Channels by state</h3>
          {d.channelsByState.length ? <BarList data={d.channelsByState} color="#2563eb" /> : <EmptyState icon="tv" title="No channels yet" />}
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Ending soon</h3>
          <Link href="/campaigns" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {d.endingSoon.length === 0 ? (
          <EmptyState icon="calendar" title="Nothing is running right now" description="Running campaigns will show up here as they near their end date." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.endingSoon.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{c.name}</span>
                    <span className="block truncate text-xs text-slate-500">{c.sponsorName}</span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-600">Ends {fmtDate(c.endDate)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
