"use client";

import { CampaignForm } from "@/components/CampaignForm";
import { PageHeader } from "@/components/ui";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader title="Add Campaign" subtitle="Pick the company, schedule and the states, districts and channels it should run on." />
      <CampaignForm />
    </>
  );
}
