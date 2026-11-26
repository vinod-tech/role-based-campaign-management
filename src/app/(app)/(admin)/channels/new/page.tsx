"use client";

import { ChannelForm } from "@/components/ChannelForm";
import { PageHeader } from "@/components/ui";

export default function NewChannelPage() {
  return (
    <>
      <PageHeader title="Add Channel" subtitle="Register a channel with its operator, coverage and MSOs." />
      <ChannelForm />
    </>
  );
}
