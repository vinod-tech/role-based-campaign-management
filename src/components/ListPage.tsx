"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DataTable, type Column } from "./DataTable";
import { Icon, type IconName } from "./Icon";
import { Button, Card, ConfirmDialog, EmptyState, LinkButton, PageHeader, Pagination, Skeleton, buttonClass, inputCls } from "./ui";
import { useList, useRemove, type Params } from "@/lib/hooks";
import type { Id } from "@/lib/types";

type Props<T extends { id: Id }> = {
  resource: string;
  label: string; // singular, e.g. "Channel"
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  columns: Column<T>[];
  filters?: Params;
  filterUI?: ReactNode;
  onAdd?: () => void;
  addHref?: string;
  onEdit?: (row: T) => void;
  editHref?: (row: T) => string;
  viewHref?: (row: T) => string;
  deleteName: (row: T) => string;
  deleteWarning?: string;
  emptyIcon?: IconName;
  pageSize?: number;
};

export function ListPage<T extends { id: Id }>(p: Props<T>) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const filterKey = JSON.stringify(p.filters ?? {});

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => setPage(1), [q, filterKey]);

  const { data, isPending, isFetching, isError, error, refetch } = useList<T>(p.resource, {
    ...p.filters,
    q,
    page,
    pageSize: p.pageSize ?? 10,
  });
  const remove = useRemove(p.resource, p.label);
  const [toDelete, setToDelete] = useState<T | null>(null);

  // If the last row of a page is removed, step back a page.
  useEffect(() => {
    if (data && data.items.length === 0 && page > 1) setPage((x) => x - 1);
  }, [data, page]);

  const hasFilters = !!q || Object.values(p.filters ?? {}).some((v) => v !== undefined && v !== "" && v !== null);
  const hasActions = !!(p.onEdit || p.editHref || p.viewHref || p.deleteName);

  const actions = (row: T) => (
    <>
      {p.viewHref && (
        <Link href={p.viewHref(row)} className={buttonClass("secondary", "sm")} aria-label={`View ${p.deleteName(row)}`}>
          <Icon name="eye" className="size-3.5" /> View
        </Link>
      )}
      {p.editHref && (
        <Link href={p.editHref(row)} className={buttonClass("secondary", "sm")} aria-label={`Edit ${p.deleteName(row)}`}>
          <Icon name="edit" className="size-3.5" /> Edit
        </Link>
      )}
      {p.onEdit && (
        <Button size="sm" variant="secondary" icon="edit" onClick={() => p.onEdit!(row)} aria-label={`Edit ${p.deleteName(row)}`}>
          Edit
        </Button>
      )}
      <Button size="sm" variant="secondary" className="text-red-600 hover:bg-red-50" icon="trash" onClick={() => setToDelete(row)} aria-label={`Delete ${p.deleteName(row)}`}>
        Delete
      </Button>
    </>
  );

  const addButton = p.addHref ? (
    <LinkButton href={p.addHref} icon="plus">
      Add {p.label}
    </LinkButton>
  ) : p.onAdd ? (
    <Button icon="plus" onClick={p.onAdd}>
      Add {p.label}
    </Button>
  ) : null;

  return (
    <>
      <PageHeader title={p.title} subtitle={p.subtitle} actions={addButton} />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={p.searchPlaceholder}
              aria-label={p.searchPlaceholder}
              className={`${inputCls} pl-9`}
            />
          </div>
          {p.filterUI && <div className="flex flex-wrap gap-2">{p.filterUI}</div>}
          {isFetching && !isPending && <span className="text-xs text-slate-400 sm:ml-auto">Updating…</span>}
        </div>

        {isPending ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon="alert"
            title="Couldn’t load data"
            description={error instanceof Error ? error.message : "Please try again."}
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon="search"
              title="No results found"
              description="Try a different search term or clear the filters."
              action={
                <Button variant="secondary" onClick={() => setInput("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={p.emptyIcon ?? "inbox"}
              title={`No ${p.label.toLowerCase()}s yet`}
              description={`Get started by adding your first ${p.label.toLowerCase()}.`}
              action={addButton}
            />
          )
        ) : (
          <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <DataTable columns={p.columns} rows={data.items} actions={hasActions ? actions : undefined} />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          </div>
        )}
      </Card>

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${p.label.toLowerCase()}?`}
          message={
            <>
              <p>
                You’re about to delete <strong className="text-slate-900">{p.deleteName(toDelete)}</strong>. This can’t be undone.
              </p>
              {p.deleteWarning && <p className="mt-2 text-amber-700">{p.deleteWarning}</p>}
            </>
          }
          onConfirm={() => remove.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}
