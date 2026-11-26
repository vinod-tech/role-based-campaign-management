import { redirect } from "next/navigation";
import { MyCampaigns } from "./MyCampaigns";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MyCampaignsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "sponsor") redirect("/dashboard");
  return <MyCampaigns name={user.name} />;
}
