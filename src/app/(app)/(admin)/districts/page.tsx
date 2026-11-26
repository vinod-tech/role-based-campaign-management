"use client";

import { useState, type FormEvent } from "react";
import type { Column } from "@/components/DataTable";
import { ListPage } from "@/components/ListPage";
import { Button, Field, Modal, inputCls } from "@/components/ui";
import { useOptions, useSave } from "@/lib/hooks";
import type { DistrictRow } from "@/lib/types";

const columns: Column<DistrictRow>[] = [
  { key: "id", header: "ID", cell: (r) => <span className="text-slate-500">{r.id}</span>, className: "w-20" },
  { key: "name", header: "Name", primary: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
  { key: "state", header: "State", cell: (r) => r.stateName },
];

export default function DistrictsPage() {
  const [editing, setEditing] = useState<DistrictRow | "new" | null>(null);
  const [stateId, setStateId] = useState("");
  const { data: options } = useOptions();
  return (
    <>
      <ListPage<DistrictRow>
        resource="districts"
        label="District"
        title="District List"
        subtitle="Districts grouped by state."
        searchPlaceholder="Search by district or state"
        columns={columns}
        filters={{ stateId }}
        filterUI={
          <select className={`${inputCls} w-full sm:w-52`} value={stateId} onChange={(e) => setStateId(e.target.value)} aria-label="Filter by state">
            <option value="">All states</option>
            {options?.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        }
        onAdd={() => setEditing("new")}
        onEdit={setEditing}
        deleteName={(r) => `${r.name} (${r.stateName})`}
        deleteWarning="MSOs in this district will be removed too."
        emptyIcon="pin"
      />
      {editing && <DistrictForm row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function DistrictForm({ row, onClose }: { row: DistrictRow | null; onClose: () => void }) {
  const save = useSave("districts", "District");
  const { data: options } = useOptions();
  const [name, setName] = useState(row?.name ?? "");
  const [stateId, setStateId] = useState(row ? String(row.stateId) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Name is too short";
    if (!stateId) errs.stateId = "Select a state";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await save.mutateAsync({ id: row?.id, data: { name, stateId } });
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to save" });
    }
  }

  return (
    <Modal
      title={row ? "Edit district" : "Add district"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="district-form" loading={save.isPending}>
            {row ? "Save changes" : "Add district"}
          </Button>
        </>
      }
    >
      <form id="district-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="State" required error={errors.stateId}>
          <select className={inputCls} value={stateId} onChange={(e) => setStateId(e.target.value)}>
            <option value="">Select state</option>
            {options?.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="District name" required error={errors.name}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coimbatore" />
        </Field>
        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
      </form>
    </Modal>
  );
}
