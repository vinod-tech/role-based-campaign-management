import { ObjectId } from "mongodb";
import { col, ensureIndexes } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { listChannels } from "@/lib/channels";
import { handle, intParam, rxQ, paging } from "@/lib/http";
import { channelSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  await ensureIndexes();
  const { u, page, pageSize, q, offset } = paging(req);
  const stateId = intParam(u, "stateId");
  const active = u.searchParams.get("active");
  const where: Record<string, unknown> = {};
  if (q) {
    const districts = await col.districts.find({ name: { $regex: rxQ(q), $options: "i" } }, { projection: { _id: 1 } }).toArray();
    const rx = { $regex: rxQ(q), $options: "i" };
    const ors: Record<string, unknown>[] = [{ name: rx }, { operatorName: rx }];
    if (districts.length) {
      const cds = await col.channelDistricts.find({ districtId: { $in: districts.map((d) => d._id) } }, { projection: { channelId: 1 } }).toArray();
      if (cds.length) ors.push({ _id: { $in: [...new Set(cds.map((c) => c.channelId))] } });
    }
    where.$or = ors;
  }
  if (stateId !== undefined) {
    if (!ObjectId.isValid(String(stateId))) return Response.json({ items: [], total: 0, page, pageSize });
    where.stateId = new ObjectId(String(stateId));
  }
  if (active === "1") where.active = true;
  if (active === "0") where.active = false;

  const total = await col.channels.countDocuments(where);
  const items = await listChannels(where, pageSize, offset);
  return Response.json({ items, total, page, pageSize });
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const body = channelSchema.parse(await req.json());
  const { districtIds, msoIds, ...fields } = body;
  const id = new ObjectId();
  await col.channels.insertOne({
    _id: id,
    name: fields.name,
    url: fields.url,
    operatorName: fields.operatorName,
    operatorContact: fields.operatorContact,
    operatorEmail: fields.operatorEmail,
    stateId: new ObjectId(fields.stateId),
    active: fields.active,
    createdAt: new Date(),
  });
  if (districtIds.length) await col.channelDistricts.insertMany(districtIds.map((districtId) => ({ _id: new ObjectId(), channelId: id, districtId: new ObjectId(districtId) })));
  if (msoIds.length) await col.channelMsos.insertMany(msoIds.map((msoId) => ({ _id: new ObjectId(), channelId: id, msoId: new ObjectId(msoId) })));
  return Response.json({ id: id.toHexString() }, { status: 201 });
});
