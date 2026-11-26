import { ObjectId } from "mongodb";
import { col } from "@/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { loadCampaignDetails } from "@/lib/campaigns";
import { handle, HttpError, idFrom } from "@/lib/http";
import { campaignSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const id = await idFrom(ctx);
  const [c] = await loadCampaignDetails({ where: { _id: id } });
  if (!c) throw new HttpError(404, "Campaign not found");
  if (user.role !== "admin" && c.sponsorId !== user.sponsorId) throw new HttpError(403, "You do not have access to this campaign.");
  return Response.json(c);
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  const body = campaignSchema.parse(await req.json());
  const res = await col.campaigns.updateOne(
    { _id: id },
    {
      $set: {
        name: body.name,
        sponsorId: new ObjectId(body.sponsorId),
        startDate: body.startDate,
        endDate: body.endDate,
        slot: body.slot,
        stateIds: body.stateIds.map((s) => new ObjectId(s)),
        districtIds: body.districtIds.map((s) => new ObjectId(s)),
        channelIds: body.channelIds.map((s) => new ObjectId(s)),
      },
    },
  );
  if (res.matchedCount === 0) throw new HttpError(404, "Campaign not found");
  return Response.json({ id: id.toHexString() });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  await col.campaigns.deleteOne({ _id: id });
  return Response.json({ ok: true });
});
