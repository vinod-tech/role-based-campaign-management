import { z } from "zod";
import { ObjectId } from "mongodb";
import { col } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { handle, HttpError, idFrom } from "@/lib/http";
import { idSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  stateId: idSchema,
});
type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  const body = schema.parse(await req.json());
  const res = await col.districts.updateOne({ _id: id }, { $set: { name: body.name, stateId: new ObjectId(body.stateId) } });
  if (res.matchedCount === 0) throw new HttpError(404, "District not found");
  return Response.json({ id: id.toHexString(), name: body.name, stateId: body.stateId });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  // Cascade: MSOs in the district and channel coverage links to it.
  await col.msos.deleteMany({ districtId: id });
  await col.channelDistricts.deleteMany({ districtId: id });
  await col.campaigns.updateMany({ districtIds: id }, { $pull: { districtIds: id } });
  await col.districts.deleteOne({ _id: id });
  return Response.json({ ok: true });
});
