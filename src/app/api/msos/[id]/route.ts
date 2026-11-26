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
  districtId: idSchema,
  noBox: z.coerce.number().int().min(0, "Must be 0 or more").max(100000000).default(0),
});
type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  const body = schema.parse(await req.json());
  const res = await col.msos.updateOne(
    { _id: id },
    { $set: { name: body.name, stateId: new ObjectId(body.stateId), districtId: new ObjectId(body.districtId), noBox: body.noBox } },
  );
  if (res.matchedCount === 0) throw new HttpError(404, "MSO not found");
  return Response.json({ id: id.toHexString(), name: body.name, stateId: body.stateId, districtId: body.districtId, noBox: body.noBox });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  await col.channelMsos.deleteMany({ msoId: id });
  await col.msos.deleteOne({ _id: id });
  return Response.json({ ok: true });
});
