"use client";

import { useMemo, useState } from "react";
import type { Column } from "@/components/DataTable";
import { Icon } from "@/components/Icon";
import { ListPage } from "@/components/ListPage";
import { Badge, Switch, inputCls } from "@/components/ui";
import { useOptions, useSave } from "@/lib/hooks";
import type { ChannelRow } from "@/lib/types";

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-slate-300">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.slice(0, 2).map((i) => (
        <Badge key={i}>{i}</Badge>
      ))}
      {items.length > 2 && <Badge tone="blue">+{items.length - 2}</Badge>}
    </span>
  );
}

export default function ChannelsPage() {
  const [stateId, setStateId] = useState("");
  const [active, setActive] = useState("");
  const { data: options } = useOptions();
  const save = useSave("channels", "Channel", { silent: true });

  const columns = useMemo<Column<ChannelRow>[]>(
    () => [
      { key: "name", header: "Name", primary: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
      { key: "msos", header: "MSO Names", cell: (r) => <Chips items={r.msoNames} /> },
      {
        key: "url",
        header: "URL",
        cell: (r) => (
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline">
            Link <Icon name="external" className="size-3" />
          </a>
        ),
      },
      { key: "op", header: "Operator", cell: (r) => r.operatorName ?? <span className="text-slate-300">—</span> },
      { key: "contact", header: "Contact", cell: (r) => r.operatorContact ?? <span className="text-slate-300">—</span> },
      { key: "email", header: "Email", cell: (r) => r.operatorEmail ?? <span className="text-slate-300">—</span> },
      { key: "district", header: "District", cell: (r) => <Chips items={r.districtNames} /> },
      {
        key: "active",
        header: "Active",
        cell: (r) => (
          <span className="inline-flex items-center gap-2">
            <Switch checked={r.active} label={`Toggle ${r.name} active`} onChange={(v) => save.mutate({ id: r.id, data: { active: v } })} />
            <span className="text-xs font-medium text-slate-500 md:hidden">{r.active ? "YES" : "NO"}</span>
          </span>
        ),
      },
    ],
    [save],
  );

  return (
    <ListPage<ChannelRow>
      resource="channels"
      label="Channel"
      title="Channel List"
      subtitle="All broadcast channels and the districts and MSOs they cover."
      searchPlaceholder="Search by name, operator or district"
      columns={columns}
      filters={{ stateId, active }}
      filterUI={
        <>
          <select className={`${inputCls} w-full sm:w-44`} value={stateId} onChange={(e) => setStateId(e.target.value)} aria-label="Filter by state">
            <option value="">All states</option>
            {options?.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className={`${inputCls} w-full sm:w-36`} value={active} onChange={(e) => setActive(e.target.value)} aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </>
      }
      addHref="/channels/new"
      editHref={(r) => `/channels/${r.id}/edit`}
      deleteName={(r) => r.name}
      deleteWarning="It will also be removed from any campaigns using it."
      emptyIcon="tv"
    />
  );
}
