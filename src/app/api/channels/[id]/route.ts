import { ObjectId } from "mongodb";
import { col } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { listChannels } from "@/lib/channels";
import { handle, HttpError, idFrom } from "@/lib/http";
import { channelSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  const [row] = await listChannels({ _id: id });
  if (!row) throw new HttpError(404, "Channel not found");
  return Response.json(row);
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  const raw = (await req.json()) as Record<string, unknown>;
  const body = channelSchema.partial().parse(raw);
  const has = (k: string) => k in raw;

  const exists = await col.channels.findOne({ _id: id }, { projection: { _id: 1 } });
  if (!exists) throw new HttpError(404, "Channel not found");

  const patch: Record<string, unknown> = {};
  if (has("name") && body.name !== undefined) patch.name = body.name;
  if (has("url") && body.url !== undefined) patch.url = body.url;
  if (has("operatorName")) patch.operatorName = body.operatorName ?? null;
  if (has("operatorContact")) patch.operatorContact = body.operatorContact ?? null;
  if (has("operatorEmail")) patch.operatorEmail = body.operatorEmail ?? null;
  if (has("stateId") && body.stateId !== undefined) patch.stateId = new ObjectId(body.stateId);
  if (has("active") && body.active !== undefined) patch.active = body.active;
  if (Object.keys(patch).length) await col.channels.updateOne({ _id: id }, { $set: patch });

  if (has("districtIds") && body.districtIds) {
    await col.channelDistricts.deleteMany({ channelId: id });
    if (body.districtIds.length)
      await col.channelDistricts.insertMany(body.districtIds.map((districtId) => ({ _id: new ObjectId(), channelId: id, districtId: new ObjectId(districtId) })));
  }
  if (has("msoIds") && body.msoIds) {
    await col.channelMsos.deleteMany({ channelId: id });
    if (body.msoIds.length) await col.channelMsos.insertMany(body.msoIds.map((msoId) => ({ _id: new ObjectId(), channelId: id, msoId: new ObjectId(msoId) })));
  }
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  // Remove the channel from every campaign that references it, then delete it.
  await col.campaigns.updateMany({ channelIds: id }, { $pull: { channelIds: id } });
  await col.channelDistricts.deleteMany({ channelId: id });
  await col.channelMsos.deleteMany({ channelId: id });
  await col.channels.deleteOne({ _id: id });
  return Response.json({ ok: true });
});
