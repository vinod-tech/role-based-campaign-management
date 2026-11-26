"use client";

import { useState, type FormEvent } from "react";
import type { Column } from "@/components/DataTable";
import { ListPage } from "@/components/ListPage";
import { Badge, Button, Field, Modal, inputCls } from "@/components/ui";
import { useSave } from "@/lib/hooks";
import type { StateRow } from "@/lib/types";

const columns: Column<StateRow>[] = [
  { key: "id", header: "ID", cell: (r) => <span className="text-slate-500">{r.id}</span>, className: "w-20" },
  { key: "name", header: "Name", primary: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
  { key: "districts", header: "Districts", cell: (r) => <Badge tone={r.districtCount ? "blue" : "slate"}>{r.districtCount}</Badge> },
];

export default function StatesPage() {
  const [editing, setEditing] = useState<StateRow | "new" | null>(null);
  return (
    <>
      <ListPage<StateRow>
        resource="states"
        label="State"
        title="State List"
        subtitle="States and union territories available for channels and campaigns."
        searchPlaceholder="Search by name"
        columns={columns}
        onAdd={() => setEditing("new")}
        onEdit={setEditing}
        deleteName={(r) => r.name}
        deleteWarning="All districts, MSOs under this state will be removed too."
        emptyIcon="globe"
        pageSize={12}
      />
      {editing && <StateForm row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function StateForm({ row, onClose }: { row: StateRow | null; onClose: () => void }) {
  const save = useSave("states", "State");
  const [name, setName] = useState(row?.name ?? "");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Name is too short");
    setError("");
    try {
      await save.mutateAsync({ id: row?.id, data: { name } });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <Modal
      title={row ? "Edit state" : "Add state"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="state-form" loading={save.isPending}>
            {row ? "Save changes" : "Add state"}
          </Button>
        </>
      }
    >
      <form id="state-form" onSubmit={submit} noValidate>
        <Field label="State name" required error={error}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tamil Nadu" />
        </Field>
      </form>
    </Modal>
  );
}
