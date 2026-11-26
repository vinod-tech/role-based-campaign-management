"use client";

import { useState } from "react";
import type { Column } from "@/components/DataTable";
import { ListPage } from "@/components/ListPage";
import { StatusBadge, inputCls } from "@/components/ui";
import { fmtDate } from "@/lib/date";
import type { CampaignDetail } from "@/lib/types";

const columns: Column<CampaignDetail>[] = [
  { key: "id", header: "ID", cell: (r) => <span className="text-slate-500">{r.id}</span>, className: "w-16" },
  { key: "name", header: "Campaign Name", primary: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
  { key: "company", header: "Company", cell: (r) => r.sponsorName },
  { key: "start", header: "Start Date", cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.startDate)}</span> },
  { key: "end", header: "End Date", cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.endDate)}</span> },
  { key: "slot", header: "Slot", cell: (r) => r.slot },
  { key: "channels", header: "Channels", cell: (r) => r.channels.length },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

export default function CampaignsPage() {
  const [status, setStatus] = useState("");
  return (
    <ListPage<CampaignDetail>
      resource="campaigns"
      label="Campaign"
      title="Campaign List"
      subtitle="Every campaign with its schedule and status."
      searchPlaceholder="Search by campaign or company"
      columns={columns}
      filters={{ status }}
      filterUI={
        <select className={`${inputCls} w-full sm:w-40`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="running">Running</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
        </select>
      }
      addHref="/campaigns/new"
      viewHref={(r) => `/campaigns/${r.id}`}
      editHref={(r) => `/campaigns/${r.id}/edit`}
      deleteName={(r) => r.name}
      emptyIcon="megaphone"
    />
  );
}
