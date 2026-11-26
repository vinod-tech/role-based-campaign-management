import { ObjectId } from "mongodb";
import { col } from "@/db";
import { requireUser } from "@/lib/auth";
import { loadCampaignDetails } from "@/lib/campaigns";
import { handle, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

// Sponsors only ever see campaigns assigned to their own company.
export const GET = handle(async () => {
  const user = await requireUser();
  if (user.role !== "sponsor" || !user.sponsorId) throw new HttpError(403, "Sponsor access only.");
  const items = await loadCampaignDetails({ where: { sponsorId: new ObjectId(user.sponsorId) } });
  return Response.json({ items });
});
