import { ObjectId } from "mongodb";
import { z } from "zod";
import { col, ensureIndexes } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { handle, intParam, rxQ, paging } from "@/lib/http";
import { idSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  stateId: idSchema,
});

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  await ensureIndexes();
  const { u, page, pageSize, q, offset } = paging(req);
  const stateId = intParam(u, "stateId");
  const where: Record<string, unknown> = {};
  if (q) {
    const states = await col.states.find({ name: { $regex: rxQ(q), $options: "i" } }, { projection: { _id: 1 } }).toArray();
    const rx = { $regex: rxQ(q), $options: "i" };
    where.$or = [{ name: rx }, ...(states.length ? [{ stateId: { $in: states.map((s) => s._id) } }] : [])];
  }
  if (stateId !== undefined) {
    if (!ObjectId.isValid(String(stateId))) return Response.json({ items: [], total: 0, page, pageSize });
    where.stateId = new ObjectId(String(stateId));
  }
  const [total, items] = await Promise.all([
    col.districts.countDocuments(where),
    col.districts
      .aggregate<{ id: string; name: string; stateId: string; stateName: string }>([
        { $match: where },
        { $lookup: { from: "states", localField: "stateId", foreignField: "_id", as: "s" } },
        { $unwind: "$s" },
        { $sort: { "s.name": 1, name: 1 } },
        { $skip: offset },
        { $limit: pageSize },
        { $project: { _id: 0, id: { $toString: "$_id" }, name: 1, stateId: { $toString: "$stateId" }, stateName: "$s.name" } },
      ])
      .toArray(),
  ]);
  return Response.json({ items, total, page, pageSize });
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const body = schema.parse(await req.json());
  const _id = new ObjectId();
  await col.districts.insertOne({ _id, name: body.name, stateId: new ObjectId(body.stateId) });
  return Response.json({ id: _id.toHexString(), name: body.name, stateId: body.stateId }, { status: 201 });
});
