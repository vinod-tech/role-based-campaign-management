import { col } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { monthLabel, todayStr } from "@/lib/date";
import { handle } from "@/lib/http";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

function lastSixMonths(today: string): string[] {
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  const keys: string[] = [];
  for (let i = 0; i < 6; i++) {
    keys.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return keys;
}

type MonthRow = { m: string; n: number };

export const GET = handle(async () => {
  await requireAdmin();
  const today = todayStr();
  const months = lastSixMonths(today);
  const since = `${months[0]}-01`;

  const [totals, chan, spon, camp, byState, campM, chanM, sponM, ending] = await Promise.all([
    Promise.all([col.channels.countDocuments(), col.sponsors.countDocuments(), col.campaigns.countDocuments(), col.msos.countDocuments()]).then(
      ([channels, sponsors, campaigns, msos]) => ({ channels, sponsors, campaigns, msos }),
    ),
    Promise.all([col.channels.countDocuments({ active: true }), col.channels.countDocuments({ active: false })]).then(
      ([active, inactive]) => ({ active, inactive }),
    ),
    Promise.all([col.campaigns.distinct("sponsorId"), col.sponsors.countDocuments()]).then(([ids, total]) => ({
      with_c: ids.length,
      total,
    })),
    Promise.all([
      col.campaigns.countDocuments({ startDate: { $lte: today }, endDate: { $gte: today } }),
      col.campaigns.countDocuments({ startDate: { $gt: today } }),
      col.campaigns.countDocuments({ endDate: { $lt: today } }),
    ]).then(([running, upcoming, completed]) => ({ running, upcoming, completed })),
    col.channels
      .aggregate<{ name: string; value: number }>([
        { $match: { stateId: { $ne: null } } },
        { $lookup: { from: "states", localField: "stateId", foreignField: "_id", as: "s" } },
        { $unwind: "$s" },
        { $group: { _id: "$s.name", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, name: "$_id", value: 1 } },
      ])
      .toArray(),
    col.campaigns
      .aggregate<MonthRow>([
        { $match: { startDate: { $gte: since } } },
        { $group: { _id: { $substrCP: ["$startDate", 0, 7] }, n: { $sum: 1 } } },
        { $project: { _id: 0, m: "$_id", n: 1 } },
      ])
      .toArray(),
    col.channels
      .aggregate<MonthRow>([
        { $match: { createdAt: { $gte: new Date(`${since}T00:00:00Z`) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, n: { $sum: 1 } } },
        { $project: { _id: 0, m: "$_id", n: 1 } },
      ])
      .toArray(),
    col.sponsors
      .aggregate<MonthRow>([
        { $match: { createdAt: { $gte: new Date(`${since}T00:00:00Z`) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, n: { $sum: 1 } } },
        { $project: { _id: 0, m: "$_id", n: 1 } },
      ])
      .toArray(),
    col.campaigns
      .aggregate<{ id: string; name: string; sponsor_name: string; end_date: string }>([
        { $match: { startDate: { $lte: today }, endDate: { $gte: today } } },
        { $sort: { endDate: 1 } },
        { $limit: 5 },
        { $lookup: { from: "sponsors", localField: "sponsorId", foreignField: "_id", as: "s" } },
        { $project: { _id: 0, id: { $toString: "$_id" }, name: 1, sponsor_name: { $arrayElemAt: ["$s.name", 0] }, end_date: "$endDate" } },
      ])
      .toArray(),
  ]);

  const series = (r: MonthRow[]) =>
    months.map((k) => ({ label: monthLabel(`${k}-01`), value: r.find((x) => x.m === k)?.n ?? 0 }));

  const data: DashboardData = {
    totals,
    channels: chan,
    sponsors: { withCampaigns: spon.with_c, without: spon.total - spon.with_c },
    campaigns: camp,
    channelsByState: byState,
    campaignsByMonth: series(campM),
    channelsByMonth: series(chanM),
    sponsorsByMonth: series(sponM),
    endingSoon: ending.map((e) => ({ id: e.id, name: e.name, sponsorName: e.sponsor_name, endDate: e.end_date })),
  };
  return Response.json(data);
});
