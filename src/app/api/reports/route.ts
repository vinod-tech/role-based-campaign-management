import { ObjectId } from "mongodb";
import { col } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { loadCampaignDetails, type CampaignWhere } from "@/lib/campaigns";
import { todayStr } from "@/lib/date";
import { handle, intParam } from "@/lib/http";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Campaign report: campaigns overlapping [from, to], optionally filtered by status / company.
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const u = new URL(req.url);
  const today = todayStr();
  const from = u.searchParams.get("from") ?? "";
  const to = u.searchParams.get("to") ?? "";
  const status = u.searchParams.get("status");
  const sponsorId = intParam(u, "sponsorId");
  const where: CampaignWhere = {};
  if (DATE.test(from)) where.endDate = { $gte: from };
  if (DATE.test(to)) where.startDate = { $lte: to };
  if (sponsorId !== undefined) {
    if (!ObjectId.isValid(String(sponsorId))) return Response.json({ items: [] });
    where.sponsorId = new ObjectId(String(sponsorId));
  }
  if (status === "running") Object.assign(where, { startDate: { $lte: today }, endDate: { $gte: today } });
  if (status === "upcoming") where.startDate = { $gt: today };
  if (status === "completed") where.endDate = { $lt: today };
  const items = await loadCampaignDetails({ where, limit: 500, skip: 0 });
  return Response.json({ items });
});
