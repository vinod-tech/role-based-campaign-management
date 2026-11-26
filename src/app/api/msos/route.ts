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
  districtId: idSchema,
  noBox: z.coerce.number().int().min(0, "Must be 0 or more").max(100000000).default(0),
});

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  await ensureIndexes();
  const { u, page, pageSize, q, offset } = paging(req);
  const stateId = intParam(u, "stateId");
  const where: Record<string, unknown> = {};
  if (q) {
    const rx = { $regex: rxQ(q), $options: "i" };
    const [states, districts] = await Promise.all([
      col.states.find({ name: rx }, { projection: { _id: 1 } }).toArray(),
      col.districts.find({ name: rx }, { projection: { _id: 1 } }).toArray(),
    ]);
    const ors: Record<string, unknown>[] = [{ name: rx }];
    if (states.length) ors.push({ stateId: { $in: states.map((s) => s._id) } });
    if (districts.length) ors.push({ districtId: { $in: districts.map((d) => d._id) } });
    where.$or = ors;
  }
  if (stateId !== undefined) {
    if (!ObjectId.isValid(String(stateId))) return Response.json({ items: [], total: 0, page, pageSize });
    where.stateId = new ObjectId(String(stateId));
  }
  const [total, items] = await Promise.all([
    col.msos.countDocuments(where),
    col.msos
      .aggregate<{ id: string; name: string; stateId: string; stateName: string; districtId: string; districtName: string; noBox: number }>([
        { $match: where },
        { $lookup: { from: "states", localField: "stateId", foreignField: "_id", as: "s" } },
        { $lookup: { from: "districts", localField: "districtId", foreignField: "_id", as: "d" } },
        { $unwind: "$s" },
        { $unwind: "$d" },
        { $sort: { "s.name": 1, "d.name": 1, name: 1 } },
        { $skip: offset },
        { $limit: pageSize },
        {
          $project: {
            _id: 0,
            id: { $toString: "$_id" },
            name: 1,
            stateId: { $toString: "$stateId" },
            stateName: "$s.name",
            districtId: { $toString: "$districtId" },
            districtName: "$d.name",
            noBox: 1,
          },
        },
      ])
      .toArray(),
  ]);
  return Response.json({ items, total, page, pageSize });
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const body = schema.parse(await req.json());
  const _id = new ObjectId();
  await col.msos.insertOne({ _id, name: body.name, stateId: new ObjectId(body.stateId), districtId: new ObjectId(body.districtId), noBox: body.noBox });
  return Response.json({ id: _id.toHexString(), name: body.name, stateId: body.stateId, districtId: body.districtId, noBox: body.noBox }, { status: 201 });
});
