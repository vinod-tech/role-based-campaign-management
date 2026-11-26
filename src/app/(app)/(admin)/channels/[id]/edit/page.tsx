"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ChannelForm } from "@/components/ChannelForm";
import { EmptyState, LinkButton, PageHeader, Skeleton, Card } from "@/components/ui";
import { api } from "@/lib/api";
import type { ChannelRow } from "@/lib/types";

export default function EditChannelPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError } = useQuery({
    queryKey: ["channels", "one", id],
    queryFn: () => api<ChannelRow>(`/api/channels/${id}`),
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <>
      <PageHeader title="Edit Channel" subtitle={data?.name} />
      {isPending ? (
        <Card className="space-y-4 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      ) : isError ? (
        <Card>
          <EmptyState icon="alert" title="Channel not found" description="It may have been deleted." action={<LinkButton href="/channels">Back to channels</LinkButton>} />
        </Card>
      ) : (
        <ChannelForm initial={data} />
      )}
    </>
  );
}
