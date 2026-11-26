"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { CampaignForm } from "@/components/CampaignForm";
import { Card, EmptyState, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { CampaignDetail } from "@/lib/types";

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError } = useQuery({
    queryKey: ["campaigns", "one", id],
    queryFn: () => api<CampaignDetail>(`/api/campaigns/${id}`),
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <>
      <PageHeader title="Edit Campaign" subtitle={data?.name} />
      {isPending ? (
        <Card className="space-y-4 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      ) : isError ? (
        <Card>
          <EmptyState icon="alert" title="Campaign not found" description="It may have been deleted." action={<LinkButton href="/campaigns">Back to campaigns</LinkButton>} />
        </Card>
      ) : (
        <CampaignForm initial={data} />
      )}
    </>
  );
}
