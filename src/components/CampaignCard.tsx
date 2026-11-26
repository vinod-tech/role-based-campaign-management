"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { PlayerModal } from "./Player";
import { Badge, Button, Card, StatusBadge } from "./ui";
import { fmtDate, todayStr } from "@/lib/date";
import type { CampaignDetail, Id } from "@/lib/types";

function dayDiff(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function Chips({ items, max, tone }: { items: string[]; max: number; tone?: "blue" | "slate" }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, max);
  return (
    <span className="flex flex-wrap gap-1.5">
      {shown.map((i) => (
        <Badge key={i} tone={tone}>
          {i}
        </Badge>
      ))}
      {items.length > max && (
        <button onClick={() => setAll((x) => !x)} className="text-xs font-medium text-brand-600 hover:underline">
          {all ? "Show less" : `+${items.length - max} more`}
        </button>
      )}
    </span>
  );
}

export function CampaignCard({ campaign: c, isAdmin = false }: { campaign: CampaignDetail; isAdmin?: boolean }) {
  const [playing, setPlaying] = useState<{ id: Id; name: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const today = todayStr();
  const canPlayNow = isAdmin || c.status === "running";
  const channels = showAll ? c.channels : c.channels.slice(0, 9);

  const timing =
    c.status === "running"
      ? `${dayDiff(today, c.endDate)} day(s) left`
      : c.status === "upcoming"
        ? `Starts in ${dayDiff(today, c.startDate)} day(s)`
        : `Ended ${Math.abs(dayDiff(today, c.endDate))} day(s) ago`;

  const lockReason =
    c.status === "upcoming" ? `Available from ${fmtDate(c.startDate)}` : c.status === "completed" ? `Campaign ended ${fmtDate(c.endDate)}` : "";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{c.name}</h2>
            <StatusBadge status={c.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{c.sponsorName}</p>
        </div>
        <p className="shrink-0 text-sm font-medium text-slate-600">{timing}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        {[
          ["Start date", fmtDate(c.startDate)],
          ["End date", fmtDate(c.endDate)],
          ["Slot", String(c.slot)],
          ["Channels", String(c.channels.length)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800">{v}</dd>
          </div>
        ))}
        <div className="col-span-2 sm:col-span-4">
          <dt className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">States</dt>
          <dd>
            <Chips items={c.states} max={6} tone="blue" />
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <dt className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Districts</dt>
          <dd>
            <Chips items={c.districts} max={8} />
          </dd>
        </div>
      </dl>

      <div className="border-t border-slate-100 bg-slate-50/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Assigned channels</h3>
          {!canPlayNow && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Icon name="lock" className="size-3.5" /> {lockReason}
            </span>
          )}
        </div>
        {c.channels.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No channels assigned to this campaign.</p>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {channels.map((ch) => {
              const disabled = !canPlayNow || !ch.active;
              return (
                <li key={ch.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{ch.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {ch.districts.join(", ") || "—"}
                      {!ch.active && " · inactive"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={disabled ? "secondary" : "primary"}
                    icon={disabled ? "lock" : "play"}
                    disabled={disabled}
                    title={disabled ? (ch.active ? lockReason : "Channel inactive") : `Play ${ch.name}`}
                    aria-label={`Play ${ch.name}`}
                    onClick={() => setPlaying({ id: ch.id, name: ch.name })}
                  >
                    Play
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {c.channels.length > 9 && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "Show fewer channels" : `Show all ${c.channels.length} channels`}
            </Button>
          </div>
        )}
      </div>

      {playing && <PlayerModal campaignId={c.id} channel={playing} onClose={() => setPlaying(null)} />}
    </Card>
  );
}
