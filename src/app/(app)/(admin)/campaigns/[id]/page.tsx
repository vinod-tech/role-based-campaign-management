"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { CampaignCard } from "@/components/CampaignCard";
import { Card, EmptyState, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { CampaignDetail } from "@/lib/types";

export default function CampaignViewPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError } = useQuery({
    queryKey: ["campaigns", "one", id],
    queryFn: () => api<CampaignDetail>(`/api/campaigns/${id}`),
  });
  return (
    <>
      <PageHeader
        title="Campaign details"
        actions={
          <>
            <LinkButton href="/campaigns" variant="secondary">
              Back to list
            </LinkButton>
            {data && (
              <LinkButton href={`/campaigns/${data.id}/edit`} icon="edit">
                Edit
              </LinkButton>
            )}
          </>
        }
      />
      {isPending ? (
        <Card className="space-y-4 p-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </Card>
      ) : isError ? (
        <Card>
          <EmptyState icon="alert" title="Campaign not found" action={<LinkButton href="/campaigns">Back to campaigns</LinkButton>} />
        </Card>
      ) : (
        <CampaignCard campaign={data} isAdmin />
      )}
    </>
  );
}
