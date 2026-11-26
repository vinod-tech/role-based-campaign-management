"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { MultiSelect } from "./MultiSelect";
import { Button, Card, Field, LinkButton, Skeleton, Switch, inputCls } from "./ui";
import { useOptions, useSave } from "@/lib/hooks";
import type { ChannelRow } from "@/lib/types";

export function ChannelForm({ initial }: { initial?: ChannelRow }) {
  const router = useRouter();
  const save = useSave("channels", "Channel", { silent: false });
  const { data: options, isPending } = useOptions();
  const [f, setF] = useState({
    name: initial?.name ?? "",
    url: initial?.url ?? "",
    operatorName: initial?.operatorName ?? "",
    operatorContact: initial?.operatorContact ?? "",
    operatorEmail: initial?.operatorEmail ?? "",
    stateId: initial?.stateId ?? "",
    districtIds: initial?.districtIds ?? [],
    msoIds: initial?.msoIds ?? [],
    active: initial?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: "name" | "url" | "operatorName" | "operatorContact" | "operatorEmail") => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const districtOptions = useMemo(
    () => (options?.districts ?? []).filter((d) => d.stateId === f.stateId).map((d) => ({ value: d.id, label: d.name })),
    [options, f.stateId],
  );
  const msoOptions = useMemo(() => {
    const dName = new Map((options?.districts ?? []).map((d) => [d.id, d.name]));
    return (options?.msos ?? [])
      .filter((m) => f.districtIds.includes(m.districtId))
      .map((m) => ({ value: m.id, label: m.name, hint: dName.get(m.districtId) }));
  }, [options, f.districtIds]);

  function validate() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Channel name is required";
    if (!/^https?:\/\/\S+\.\S+/i.test(f.url.trim())) e.url = "Enter a valid URL starting with http:// or https://";
    if (f.operatorEmail && !/^\S+@\S+\.\S+$/.test(f.operatorEmail)) e.operatorEmail = "Enter a valid email";
    if (!f.stateId) e.stateId = "Select a state";
    if (f.stateId && f.districtIds.length === 0) e.districtIds = "Select at least one district";
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await save.mutateAsync({ id: initial?.id, data: { ...f } });
      router.push("/channels");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to save" });
    }
  }

  if (isPending) {
    return (
      <Card className="space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-8">
      <form onSubmit={submit} noValidate className="grid gap-5 md:grid-cols-2">
        <Field label="Channel name" required error={errors.name}>
          <input className={inputCls} value={f.name} onChange={set("name")} placeholder="e.g. 7 Star TV" />
        </Field>
        <Field label="Stream URL" required error={errors.url}>
          <input className={inputCls} type="url" value={f.url} onChange={set("url")} placeholder="https://…/stream.m3u8" />
        </Field>
        <Field label="Operator name">
          <input className={inputCls} value={f.operatorName} onChange={set("operatorName")} />
        </Field>
        <Field label="Operator contact">
          <input className={inputCls} inputMode="tel" value={f.operatorContact} onChange={set("operatorContact")} />
        </Field>
        <Field label="Operator email" error={errors.operatorEmail} className="md:col-span-2">
          <input className={inputCls} type="email" value={f.operatorEmail} onChange={set("operatorEmail")} />
        </Field>
        <Field label="State" required error={errors.stateId}>
          <select
            className={inputCls}
            value={f.stateId}
            onChange={(e) => setF((s) => ({ ...s, stateId: e.target.value, districtIds: [], msoIds: [] }))}
          >
            <option value="">Select state</option>
            {options?.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Districts" required error={errors.districtIds} hint={!f.stateId ? "Select a state first" : undefined}>
          <MultiSelect
            label="Districts"
            options={districtOptions}
            value={f.districtIds}
            disabled={!f.stateId}
            invalid={!!errors.districtIds}
            placeholder="Select districts"
            emptyText="No districts in this state"
            onChange={(ids) =>
              setF((s) => {
                const allowed = new Set((options?.msos ?? []).filter((m) => ids.includes(m.districtId)).map((m) => m.id));
                return { ...s, districtIds: ids, msoIds: s.msoIds.filter((id) => allowed.has(id)) };
              })
            }
          />
        </Field>
        <Field label="MSOs" className="md:col-span-2" hint={f.districtIds.length === 0 ? "Select districts to see their MSOs" : undefined}>
          <MultiSelect
            label="MSOs"
            options={msoOptions}
            value={f.msoIds}
            disabled={f.districtIds.length === 0}
            placeholder="Select MSOs"
            emptyText="No MSOs in the selected districts"
            onChange={(ids) => setF((s) => ({ ...s, msoIds: ids }))}
          />
        </Field>
        <div className="flex items-center gap-3 md:col-span-2">
          <Switch checked={f.active} onChange={(v) => setF((s) => ({ ...s, active: v }))} label="Active" />
          <span className="text-sm font-medium text-slate-700">{f.active ? "Active" : "Inactive"}</span>
        </div>

        {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{errors.form}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-center md:col-span-2">
          <LinkButton href="/channels" variant="secondary">
            Cancel
          </LinkButton>
          <Button type="submit" loading={save.isPending}>
            {initial ? "Save channel" : "Add channel"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
