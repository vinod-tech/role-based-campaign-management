"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/Toast";
import { api, qs } from "./api";
import type { Id, ListResult, Options } from "./types";

export type Params = Record<string, string | number | boolean | undefined | null>;

export function useList<T>(resource: string, params: Params) {
  return useQuery({
    queryKey: [resource, "list", params],
    queryFn: () => api<ListResult<T>>(`/api/${resource}${qs(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useOptions() {
  return useQuery({
    queryKey: ["options"],
    queryFn: () => api<Options>("/api/options"),
    staleTime: 60_000,
  });
}

type Snapshot = [readonly unknown[], ListResult<{ id: Id }> | undefined][];

/** Create / update with optimistic list patching on update. */
export function useSave(resource: string, label: string, opts: { silent?: boolean } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id?: Id; data: Record<string, unknown> }) =>
      id
        ? api<unknown>(`/api/${resource}/${id}`, { method: "PUT", body: JSON.stringify(data) })
        : api<unknown>(`/api/${resource}`, { method: "POST", body: JSON.stringify(data) }),
    onMutate: async ({ id, data }) => {
      if (!id) return { snapshots: [] as Snapshot };
      await qc.cancelQueries({ queryKey: [resource, "list"] });
      const snapshots = qc.getQueriesData<ListResult<{ id: Id }>>({ queryKey: [resource, "list"] });
      qc.setQueriesData<ListResult<{ id: Id }>>({ queryKey: [resource, "list"] }, (old) =>
        old ? { ...old, items: old.items.map((i) => (i.id === id ? { ...i, ...data } : i)) } : old,
      );
      return { snapshots };
    },
    onError: (e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, d]) => qc.setQueryData(key, d));
      toast.error(e instanceof Error ? e.message : `Could not save ${label.toLowerCase()}`);
    },
    onSuccess: (_d, v) => {
      if (!opts.silent) toast.success(`${label} ${v.id ? "updated" : "created"}`);
    },
    onSettled: () => {
      qc.invalidateQueries();
    },
  });
}

/** Delete with optimistic removal from every cached list page. */
export function useRemove(resource: string, label: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: Id) => api<unknown>(`/api/${resource}/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [resource, "list"] });
      const snapshots = qc.getQueriesData<ListResult<{ id: Id }>>({ queryKey: [resource, "list"] });
      qc.setQueriesData<ListResult<{ id: Id }>>({ queryKey: [resource, "list"] }, (old) =>
        old ? { ...old, items: old.items.filter((i) => i.id !== id), total: Math.max(0, old.total - 1) } : old,
      );
      return { snapshots };
    },
    onError: (e, _id, ctx) => {
      ctx?.snapshots.forEach(([key, d]) => qc.setQueryData(key, d));
      toast.error(e instanceof Error ? e.message : `Could not delete ${label.toLowerCase()}`);
    },
    onSuccess: () => toast.success(`${label} deleted`),
    onSettled: () => {
      qc.invalidateQueries();
    },
  });
}
