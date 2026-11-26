"use client";

import { useQuery } from "@tanstack/react-query";
import { CampaignCard } from "@/components/CampaignCard";
import { Card, EmptyState, Button, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { CampaignDetail } from "@/lib/types";

const ORDER = { running: 0, upcoming: 1, completed: 2 } as const;

export function MyCampaigns({ name }: { name: string }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["my-campaigns"],
    queryFn: () => api<{ items: CampaignDetail[] }>("/api/my-campaigns"),
  });
  const items = [...(data?.items ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.startDate.localeCompare(b.startDate));
  const count = (s: CampaignDetail["status"]) => items.filter((i) => i.status === s).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Welcome, {name}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {data?.items[0] ? `${data.items[0].sponsorName} · ` : ""}Your assigned campaigns. Channels can be played while a campaign is running.
        </p>
        {items.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">{count("running")} running</span>
            <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">{count("upcoming")} upcoming</span>
            <span className="rounded-full bg-slate-200/70 px-3 py-1 font-medium text-slate-600">{count("completed")} completed</span>
          </div>
        )}
      </div>

      {isPending ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-28 w-full" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <EmptyState icon="alert" title="Couldn’t load your campaigns" description={error instanceof Error ? error.message : undefined} action={<Button onClick={() => refetch()}>Retry</Button>} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="megaphone" title="No campaigns assigned yet" description="When an administrator assigns a campaign to your company, it will appear here." />
        </Card>
      ) : (
        <div className="space-y-5">
          {items.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
