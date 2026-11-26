"use client";

import { useState, type FormEvent } from "react";
import type { Column } from "@/components/DataTable";
import { ListPage } from "@/components/ListPage";
import { Badge, Button, Field, Modal, inputCls } from "@/components/ui";
import { useSave } from "@/lib/hooks";
import type { SponsorRow } from "@/lib/types";

const dash = (v: string | null) => v || <span className="text-slate-300">—</span>;

const columns: Column<SponsorRow>[] = [
  { key: "id", header: "ID", cell: (r) => <span className="text-slate-500">{r.id}</span>, className: "w-16" },
  { key: "name", header: "Name", primary: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
  { key: "username", header: "Username", cell: (r) => (r.username ? <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{r.username}</code> : dash(null)) },
  { key: "email", header: "Email", cell: (r) => dash(r.email) },
  { key: "contact", header: "Contact No", cell: (r) => dash(r.contactNo) },
  { key: "person", header: "Contact Person", cell: (r) => dash(r.contactPerson) },
  { key: "campaigns", header: "Campaigns", cell: (r) => <Badge tone={r.campaignCount ? "blue" : "slate"}>{r.campaignCount}</Badge> },
];

export default function SponsorsPage() {
  const [editing, setEditing] = useState<SponsorRow | "new" | null>(null);
  return (
    <>
      <ListPage<SponsorRow>
        resource="sponsors"
        label="Sponsor"
        title="Sponsor List"
        subtitle="Companies that run campaigns. Each sponsor gets a login to view their campaigns."
        searchPlaceholder="Search by name, contact or username"
        columns={columns}
        onAdd={() => setEditing("new")}
        onEdit={setEditing}
        deleteName={(r) => r.name}
        deleteWarning="Their login and all of their campaigns will be removed too."
        emptyIcon="building"
      />
      {editing && <SponsorForm row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function SponsorForm({ row, onClose }: { row: SponsorRow | null; onClose: () => void }) {
  const save = useSave("sponsors", "Sponsor");
  const [f, setF] = useState({
    name: row?.name ?? "",
    username: row?.username ?? "",
    password: "",
    email: row?.email ?? "",
    contactNo: row?.contactNo ?? "",
    contactPerson: row?.contactPerson ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = "Name is too short";
    if (f.username.trim().length < 3) errs.username = "At least 3 characters";
    else if (!/^[a-zA-Z0-9._-]+$/.test(f.username.trim())) errs.username = "Letters, numbers, . _ - only";
    if (!row && f.password.length < 6) errs.password = "At least 6 characters";
    if (row && f.password && f.password.length < 6) errs.password = "At least 6 characters";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) errs.email = "Enter a valid email";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await save.mutateAsync({ id: row?.id, data: { ...f, password: f.password || undefined } });
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to save" });
    }
  }

  return (
    <Modal
      title={row ? "Edit sponsor" : "Add sponsor"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="sponsor-form" loading={save.isPending}>
            {row ? "Save changes" : "Add sponsor"}
          </Button>
        </>
      }
    >
      <form id="sponsor-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" required error={errors.name} className="sm:col-span-2">
          <input className={inputCls} value={f.name} onChange={set("name")} placeholder="e.g. 777 Foods" />
        </Field>
        <Field label="Username" required error={errors.username}>
          <input className={inputCls} value={f.username} onChange={set("username")} autoComplete="off" />
        </Field>
        <Field label={row ? "New password" : "Password"} required={!row} error={errors.password} hint={row ? "Leave blank to keep the current password" : undefined}>
          <input className={inputCls} type="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className={inputCls} type="email" value={f.email} onChange={set("email")} />
        </Field>
        <Field label="Contact no">
          <input className={inputCls} inputMode="tel" value={f.contactNo} onChange={set("contactNo")} />
        </Field>
        <Field label="Contact person" className="sm:col-span-2">
          <input className={inputCls} value={f.contactPerson} onChange={set("contactPerson")} />
        </Field>
        {errors.form && <p className="text-sm text-red-600 sm:col-span-2">{errors.form}</p>}
      </form>
    </Modal>
  );
}
