"use client";

import { useState, type FormEvent } from "react";
import type { Column } from "@/components/DataTable";
import { ListPage } from "@/components/ListPage";
import { Button, Field, Modal, inputCls } from "@/components/ui";
import { useOptions, useSave } from "@/lib/hooks";
import type { MsoRow } from "@/lib/types";

const columns: Column<MsoRow>[] = [
  { key: "name", header: "Name", primary: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
  { key: "state", header: "State", cell: (r) => r.stateName },
  { key: "district", header: "District", cell: (r) => r.districtName },
  { key: "box", header: "No Box", cell: (r) => <span className="tabular-nums">{r.noBox.toLocaleString()}</span> },
];

export default function MsosPage() {
  const [editing, setEditing] = useState<MsoRow | "new" | null>(null);
  const [stateId, setStateId] = useState("");
  const { data: options } = useOptions();
  return (
    <>
      <ListPage<MsoRow>
        resource="msos"
        label="MSO"
        title="MSO List"
        subtitle="Multi-system operators and their subscriber box counts."
        searchPlaceholder="Search by MSO, state or district"
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
        deleteName={(r) => `${r.name} – ${r.districtName}`}
        emptyIcon="users"
      />
      {editing && <MsoForm row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function MsoForm({ row, onClose }: { row: MsoRow | null; onClose: () => void }) {
  const save = useSave("msos", "MSO");
  const { data: options } = useOptions();
  const [name, setName] = useState(row?.name ?? "");
  const [stateId, setStateId] = useState(row ? String(row.stateId) : "");
  const [districtId, setDistrictId] = useState(row ? String(row.districtId) : "");
  const [noBox, setNoBox] = useState(String(row?.noBox ?? 0));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const districts = options?.districts.filter((d) => String(d.stateId) === stateId) ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Name is too short";
    if (!stateId) errs.stateId = "Select a state";
    if (!districtId) errs.districtId = "Select a district";
    if (!/^\d+$/.test(noBox)) errs.noBox = "Enter a whole number";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await save.mutateAsync({
        id: row?.id,
        data: {
          name,
          stateId,
          districtId,
          noBox: Number(noBox),
          // optimistic display fields
          stateName: options?.states.find((s) => s.id === stateId)?.name,
          districtName: districts.find((d) => d.id === districtId)?.name,
        },
      });
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to save" });
    }
  }

  return (
    <Modal
      title={row ? "Edit MSO" : "Add MSO"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="mso-form" loading={save.isPending}>
            {row ? "Save changes" : "Add MSO"}
          </Button>
        </>
      }
    >
      <form id="mso-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="MSO name" required error={errors.name}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SCV" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State" required error={errors.stateId}>
            <select
              className={inputCls}
              value={stateId}
              onChange={(e) => {
                setStateId(e.target.value);
                setDistrictId("");
              }}
            >
              <option value="">Select state</option>
              {options?.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="District" required error={errors.districtId}>
            <select className={inputCls} value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!stateId}>
              <option value="">{stateId ? "Select district" : "Select state first"}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Number of boxes" error={errors.noBox}>
          <input className={inputCls} inputMode="numeric" value={noBox} onChange={(e) => setNoBox(e.target.value)} />
        </Field>
        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
      </form>
    </Modal>
  );
}
