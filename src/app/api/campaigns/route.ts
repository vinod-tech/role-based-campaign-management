import { ObjectId, type Filter } from "mongodb";
import { col } from "@/db";
import type { Campaign } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { loadCampaignDetails, type CampaignWhere } from "@/lib/campaigns";
import { todayStr } from "@/lib/date";
import { handle, intParam, rxQ, paging } from "@/lib/http";
import { campaignSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const { u, page, pageSize, q, offset } = paging(req);
  const today = todayStr();
  const status = u.searchParams.get("status");
  const sponsorId = intParam(u, "sponsorId");
  const where: CampaignWhere = {};
  if (q) {
    const sponsors = await col.sponsors.find({ name: { $regex: rxQ(q), $options: "i" } }, { projection: { _id: 1 } }).toArray();
    const rx = { $regex: rxQ(q), $options: "i" };
    where.$or = [{ name: rx }, ...(sponsors.length ? [{ sponsorId: { $in: sponsors.map((s) => s._id) } }] : [])];
  }
  if (sponsorId !== undefined) {
    if (!ObjectId.isValid(String(sponsorId))) return Response.json({ items: [], total: 0, page, pageSize });
    where.sponsorId = new ObjectId(String(sponsorId));
  }
  if (status === "running") Object.assign(where, { startDate: { $lte: today }, endDate: { $gte: today } });
  if (status === "upcoming") where.startDate = { $gt: today };
  if (status === "completed") where.endDate = { $lt: today };

  const total = await col.campaigns.countDocuments(where);
  const items = await loadCampaignDetails({ where, limit: pageSize, skip: offset });
  return Response.json({ items, total, page, pageSize });
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const body = campaignSchema.parse(await req.json());
  const res = await col.campaigns.insertOne({
    _id: new ObjectId(),
    name: body.name,
    sponsorId: new ObjectId(body.sponsorId),
    startDate: body.startDate,
    endDate: body.endDate,
    slot: body.slot,
    stateIds: body.stateIds.map((s) => new ObjectId(s)),
    districtIds: body.districtIds.map((s) => new ObjectId(s)),
    channelIds: body.channelIds.map((s) => new ObjectId(s)),
    createdAt: new Date(),
  });
  return Response.json({ id: res.insertedId.toHexString() }, { status: 201 });
});

export type CampaignFilter = Filter<Campaign>;
