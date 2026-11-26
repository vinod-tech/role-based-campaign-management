import { z } from "zod";
import { col } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { handle, HttpError, idFrom } from "@/lib/http";

export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().trim().min(2, "Name is too short").max(80) });
type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  const body = schema.parse(await req.json());
  const res = await col.states.updateOne({ _id: id }, { $set: { name: body.name } });
  if (res.matchedCount === 0) throw new HttpError(404, "State not found");
  return Response.json({ id: id.toHexString(), name: body.name });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  // Cascade: districts under the state, MSOs under those districts, and
  // channel coverage links pointing at the removed districts.
  const districts = await col.districts.find({ stateId: id }, { projection: { _id: 1 } }).toArray();
  const dIds = districts.map((d) => d._id);
  if (dIds.length) {
    await col.msos.deleteMany({ districtId: { $in: dIds } });
    await col.channelDistricts.deleteMany({ districtId: { $in: dIds } });
    await col.districts.deleteMany({ _id: { $in: dIds } });
  }
  await col.channels.updateMany({ stateId: id }, { $set: { stateId: null } });
  await col.campaigns.updateMany({ stateIds: id }, { $pull: { stateIds: id } });
  await col.states.deleteOne({ _id: id });
  return Response.json({ ok: true });
});
