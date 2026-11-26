import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { col } from "@/db";
import type { Campaign } from "@/db/schema";
import { statusOf, todayStr } from "./date";
import type { CampaignDetail } from "./types";

export type CampaignDoc = Campaign;

export type CampaignWhere = Filter<CampaignDoc>;

const uniq = (a: string[]) => [...new Set(a)];

export async function loadCampaignDetails(opts: { where?: CampaignWhere; limit?: number; skip?: number } = {}): Promise<CampaignDetail[]> {
  const cursor = col.campaigns
    .find(opts.where ?? {})
    .sort({ startDate: -1, _id: -1 });
  const rows = opts.limit !== undefined ? await cursor.skip(opts.skip ?? 0).limit(opts.limit).toArray() : await cursor.toArray();
  if (rows.length === 0) return [];

  const stateIds = uniq(rows.flatMap((r) => r.stateIds.map(String)));
  const districtIds = uniq(rows.flatMap((r) => r.districtIds.map(String)));
  const channelIds = uniq(rows.flatMap((r) => r.channelIds.map(String)));
  const sponsorIds = uniq(rows.map((r) => r.sponsorId.toHexString()));

  const oidIn = (ids: string[]) => ({ $in: ids.map((s) => new ObjectId(s)) });

  const [stateRows, districtRows, channelRows, cdRows, sponsorRows] = await Promise.all([
    stateIds.length ? col.states.find({ _id: oidIn(stateIds) }).toArray() : [],
    districtIds.length ? col.districts.find({ _id: oidIn(districtIds) }).toArray() : [],
    channelIds.length
      ? col.channels.find({ _id: oidIn(channelIds) }, { projection: { name: 1, operatorName: 1, active: 1 } }).toArray()
      : [],
    channelIds.length
      ? col.channelDistricts
          .aggregate<{ _id: ObjectId; names: string[] }>([
            { $match: { channelId: oidIn(channelIds) } },
            { $lookup: { from: "districts", localField: "districtId", foreignField: "_id", as: "d" } },
            { $unwind: "$d" },
            { $group: { _id: "$channelId", names: { $push: "$d.name" } } },
          ])
          .toArray()
      : [],
    sponsorIds.length ? col.sponsors.find({ _id: oidIn(sponsorIds) }, { projection: { name: 1 } }).toArray() : [],
  ]);

  const stateMap = new Map(stateRows.map((s) => [s._id.toHexString(), s.name]));
  const districtMap = new Map(districtRows.map((d) => [d._id.toHexString(), d.name]));
  const channelMap = new Map(channelRows.map((c) => [c._id.toHexString(), c]));
  const sponsorMap = new Map(sponsorRows.map((s) => [s._id.toHexString(), s.name]));
  const cdMap = new Map(cdRows.map((r) => [r._id.toHexString(), r.names]));

  const today = todayStr();
  return rows.map((r) => {
    const sid = r._id.toHexString();
    return {
      id: sid,
      name: r.name,
      sponsorId: r.sponsorId.toHexString(),
      sponsorName: sponsorMap.get(r.sponsorId.toHexString()) ?? "",
      startDate: r.startDate,
      endDate: r.endDate,
      slot: r.slot,
      status: statusOf(r.startDate, r.endDate, today),
      stateIds: r.stateIds.map(String),
      districtIds: r.districtIds.map(String),
      channelIds: r.channelIds.map(String),
      states: r.stateIds.map((id) => stateMap.get(id.toHexString())).filter((x): x is string => !!x),
      districts: r.districtIds.map((id) => districtMap.get(id.toHexString())).filter((x): x is string => !!x),
      channels: r.channelIds
        .map((id) => channelMap.get(id.toHexString()))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => ({ id: c._id.toHexString(), name: c.name, operatorName: c.operatorName, active: c.active, districts: (cdMap.get(c._id.toHexString()) ?? []).sort() })),
    };
  });
}
