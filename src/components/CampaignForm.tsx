"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { MultiSelect } from "./MultiSelect";
import { Button, Card, Field, LinkButton, Skeleton, inputCls } from "./ui";
import { addDays, todayStr } from "@/lib/date";
import { useOptions, useSave } from "@/lib/hooks";
import type { CampaignDetail, Id } from "@/lib/types";

export function CampaignForm({ initial }: { initial?: CampaignDetail }) {
  const router = useRouter();
  const save = useSave("campaigns", "Campaign");
  const { data: options, isPending } = useOptions();
  const [f, setF] = useState(() => ({
    name: initial?.name ?? "",
    sponsorId: initial?.sponsorId ?? "",
    startDate: initial?.startDate ?? todayStr(),
    endDate: initial?.endDate ?? addDays(todayStr(), 30),
    slot: String(initial?.slot ?? 20),
    stateIds: initial?.stateIds ?? ([] as Id[]),
    districtIds: initial?.districtIds ?? ([] as Id[]),
    channelIds: initial?.channelIds ?? ([] as Id[]),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stateName = useMemo(() => new Map((options?.states ?? []).map((s) => [s.id, s.name])), [options]);
  const districtName = useMemo(() => new Map((options?.districts ?? []).map((d) => [d.id, d.name])), [options]);

  const districtOptions = useMemo(
    () =>
      (options?.districts ?? [])
        .filter((d) => f.stateIds.includes(d.stateId))
        .map((d) => ({ value: d.id, label: d.name, hint: f.stateIds.length > 1 ? stateName.get(d.stateId) : undefined })),
    [options, f.stateIds, stateName],
  );

  const channelOptions = useMemo(
    () =>
      (options?.channels ?? [])
        .filter((c) => c.districtIds.some((d) => f.districtIds.includes(d)) && (c.active || f.channelIds.includes(c.id)))
        .map((c) => {
          const match = c.districtIds.filter((d) => f.districtIds.includes(d));
          return {
            value: c.id,
            label: c.name,
            hint: `${districtName.get(match[0]) ?? ""}${match.length > 1 ? ` +${match.length - 1}` : ""}`,
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, f.districtIds, districtName],
  );

  function pruneChannels(districtIds: Id[], channelIds: Id[]) {
    const ok = new Set((options?.channels ?? []).filter((c) => c.districtIds.some((d) => districtIds.includes(d))).map((c) => c.id));
    return channelIds.filter((id) => ok.has(id));
  }

  function onStates(stateIds: Id[]) {
    setF((s) => {
      const allowed = new Set((options?.districts ?? []).filter((d) => stateIds.includes(d.stateId)).map((d) => d.id));
      const districtIds = s.districtIds.filter((d) => allowed.has(d));
      return { ...s, stateIds, districtIds, channelIds: pruneChannels(districtIds, s.channelIds) };
    });
  }
  function onDistricts(districtIds: Id[]) {
    setF((s) => ({ ...s, districtIds, channelIds: pruneChannels(districtIds, s.channelIds) }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Campaign name is required";
    if (!f.sponsorId) e.sponsorId = "Select a company";
    if (!f.startDate) e.startDate = "Pick a start date";
    if (!f.endDate) e.endDate = "Pick an end date";
    else if (f.startDate && f.endDate < f.startDate) e.endDate = "End date must be on or after the start date";
    if (!/^\d+$/.test(f.slot) || Number(f.slot) < 1) e.slot = "Enter a slot of 1 or more";
    if (f.stateIds.length === 0) e.stateIds = "Select at least one state";
    if (f.districtIds.length === 0) e.districtIds = "Select at least one district";
    if (f.channelIds.length === 0) e.channelIds = "Select at least one channel";
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await save.mutateAsync({ id: initial?.id, data: { ...f, slot: Number(f.slot) } });
      router.push("/campaigns");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to save" });
    }
  }

  if (isPending) {
    return (
      <Card className="space-y-4 p-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-8">
      <form onSubmit={submit} noValidate className="grid gap-5 md:grid-cols-2">
        <Field label="Name of the campaign" required error={errors.name} className="md:col-span-2">
          <input className={inputCls} value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. 777 Gingelly Oil – 30s" />
        </Field>
        <Field label="Company name" required error={errors.sponsorId}>
          <select className={inputCls} value={f.sponsorId} onChange={(e) => setF((s) => ({ ...s, sponsorId: e.target.value }))}>
            <option value="">Select company</option>
            {options?.sponsors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Slot" required error={errors.slot} hint="Ad slot length / count for this campaign">
          <input className={inputCls} inputMode="numeric" value={f.slot} onChange={(e) => setF((s) => ({ ...s, slot: e.target.value }))} />
        </Field>
        <Field label="Start date" required error={errors.startDate}>
          <input className={inputCls} type="date" value={f.startDate} onChange={(e) => setF((s) => ({ ...s, startDate: e.target.value }))} />
        </Field>
        <Field label="End date" required error={errors.endDate}>
          <input className={inputCls} type="date" min={f.startDate} value={f.endDate} onChange={(e) => setF((s) => ({ ...s, endDate: e.target.value }))} />
        </Field>

        <Field label="States" required error={errors.stateIds}>
          <MultiSelect label="States" options={(options?.states ?? []).map((s) => ({ value: s.id, label: s.name }))} value={f.stateIds} onChange={onStates} invalid={!!errors.stateIds} placeholder="Select states" />
        </Field>
        <Field label="Districts" required error={errors.districtIds} hint={f.stateIds.length === 0 ? "Select states first" : undefined}>
          <MultiSelect
            label="Districts"
            options={districtOptions}
            value={f.districtIds}
            onChange={onDistricts}
            disabled={f.stateIds.length === 0}
            invalid={!!errors.districtIds}
            placeholder="Select districts"
            emptyText="No districts for the selected states"
          />
        </Field>
        <Field
          label="Channels"
          required
          error={errors.channelIds}
          className="md:col-span-2"
          hint={f.districtIds.length === 0 ? "Select districts to see the channels that cover them" : `${channelOptions.length} channel(s) available in the selected districts`}
        >
          <MultiSelect
            label="Channels"
            options={channelOptions}
            value={f.channelIds}
            onChange={(ids) => setF((s) => ({ ...s, channelIds: ids }))}
            disabled={f.districtIds.length === 0}
            invalid={!!errors.channelIds}
            placeholder="Select channels"
            emptyText="No active channels cover the selected districts"
          />
        </Field>

        {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{errors.form}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-center md:col-span-2">
          <LinkButton href="/campaigns" variant="secondary">
            Cancel
          </LinkButton>
          <Button type="submit" loading={save.isPending}>
            {initial ? "Save campaign" : "Save campaign"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
