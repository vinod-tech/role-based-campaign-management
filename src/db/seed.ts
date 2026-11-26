import { ObjectId } from "mongodb";
import { col, ensureIndexes } from "./index";
import type { Campaign, Channel, District, Mso, Sponsor, State, User } from "./schema";import { hashPassword } from "../lib/password";
import { addDays, todayStr } from "../lib/date";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const DISTRICTS: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivagangai", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  Puducherry: ["Pondicherry", "Karaikal", "Mahe", "Yanam"],
  Kerala: ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  Karnataka: ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Belagavi", "Ballari", "Shivamogga", "Tumakuru"],
  Telangana: ["Hyderabad", "Rangareddy", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  Delhi: ["New Delhi", "North Delhi", "South Delhi"],
};

const BRANDS = [
  "7 Star TV", "Amma TV", "SS Varma", "Vasantham Local", "Namma Cable", "Kovai Vision", "Pasumai Channel",
  "Sun City Net", "Thendral Local", "Metro Vision", "Star Cable Net", "Ocean TV", "Rainbow Vision", "Lotus Media",
  "Sri Murugan TV", "Galaxy Network", "Hi-Tech Vision", "Pearl Digital", "Raja Local TV", "Valluvar TV",
  "Kaveri Vision", "Aadhavan TV", "Tamizh Local", "Sakthi Cable",
];
const OPERATORS = ["Ramesh", "Senthil Kumar", "Murugan", "Karthik", "Balaji", "Prakash", "Anand", "Suresh", "Dinesh", "Manikandan", "Gopal", "Arun"];

const STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
];

const SPONSORS = [
  { name: "777 Foods", username: "777foods", email: "marketing@777foods.in", contactNo: "9840012345", contactPerson: "Rajesh Kumar" },
  { name: "The Chennai Mobiles", username: "tcm", email: "ads@chennaimobiles.com", contactNo: "9514155000", contactPerson: "Saddam" },
  { name: "Star Vijay", username: "starvijay", email: "promo@starvijay.example", contactNo: "9840234567", contactPerson: "Meena Sundaram" },
  { name: "Pathway Productions", username: "pathway", email: "hello@pathwayprod.example", contactNo: "9840094129", contactPerson: "Arun" },
  { name: "Vummidi Bangaru Jewellers", username: "vbj2026", email: "campaigns@vbj.example", contactNo: "9790045701", contactPerson: "Caleb" },
  { name: "iHorse Pictures", username: "ihp", email: "media@ihorsepictures.example", contactNo: "9840938232", contactPerson: "Vinod Thanigai Arasu" },
  { name: "Aachi Masala", username: "aachi", email: "brand@aachi.example", contactNo: "9444123456", contactPerson: "Lakshmi Narayanan" },
  { name: "Saravana Stores", username: "saravana", email: "ads@saravanastores.example", contactNo: "9444765432", contactPerson: "Ganesh Babu" },
  { name: "Pothys Silks", username: "pothys", email: "marketing@pothys.example", contactNo: "9382012345", contactPerson: "Revathi" },
  { name: "Nalli Silks", username: "nalli", email: "ads@nalli.example", contactNo: "9444333222", contactPerson: "Padmini" },
];

type CampaignSeed = {
  name: string;
  sponsor: string;
  start: number;
  end: number;
  slot: number;
  states: string[];
  districts: string[];
};

const CAMPAIGNS: CampaignSeed[] = [
  { name: "777 Gingelly Oil – 30s", sponsor: "777 Foods", start: -12, end: 18, slot: 20, states: ["Tamil Nadu"], districts: ["Chennai", "Coimbatore", "Madurai", "Salem"] },
  { name: "Digital Hub – Smartphone Kaalam", sponsor: "The Chennai Mobiles", start: -5, end: 25, slot: 20, states: ["Tamil Nadu"], districts: ["Chennai", "Tiruchirappalli", "Vellore"] },
  { name: "Illatharigalin Neram", sponsor: "Star Vijay", start: -20, end: 10, slot: 15, states: ["Tamil Nadu", "Puducherry"], districts: ["Madurai", "Tirunelveli", "Pondicherry", "Karaikal"] },
  { name: "Carmeni Selvam", sponsor: "Pathway Productions", start: 7, end: 67, slot: 20, states: ["Tamil Nadu"], districts: ["Chennai", "Kancheepuram", "Tiruvallur"] },
  { name: "Akshaya Tritiya Gold Rush", sponsor: "Vummidi Bangaru Jewellers", start: -45, end: -15, slot: 25, states: ["Tamil Nadu"], districts: ["Chennai", "Chengalpattu", "Kancheepuram"] },
  { name: "Aachi Masala – Summer Taste", sponsor: "Aachi Masala", start: -70, end: -40, slot: 20, states: ["Tamil Nadu"], districts: ["Coimbatore", "Erode", "Tiruppur"] },
  { name: "Aachi Masala – Monsoon Recipes", sponsor: "Aachi Masala", start: -3, end: 27, slot: 20, states: ["Tamil Nadu", "Puducherry"], districts: ["Chennai", "Pondicherry", "Cuddalore"] },
  { name: "Pongal Special Offers", sponsor: "Saravana Stores", start: -130, end: -100, slot: 30, states: ["Tamil Nadu"], districts: ["Chennai", "Madurai", "Thanjavur"] },
  { name: "Saravana Stores – Festive Rush", sponsor: "Saravana Stores", start: -1, end: 29, slot: 30, states: ["Tamil Nadu"], districts: ["Chennai", "Tiruvallur", "Vellore", "Ranipet"] },
  { name: "Diwali Silk Festival", sponsor: "Pothys Silks", start: -210, end: -180, slot: 20, states: ["Tamil Nadu"], districts: ["Chennai", "Coimbatore", "Salem"] },
  { name: "Wedding Season Sarees", sponsor: "Pothys Silks", start: 14, end: 44, slot: 20, states: ["Tamil Nadu"], districts: ["Madurai", "Tiruchirappalli", "Thanjavur"] },
  { name: "Onam Bonanza", sponsor: "Nalli Silks", start: -2, end: 12, slot: 18, states: ["Kerala"], districts: ["Ernakulam", "Thrissur", "Kozhikode", "Thiruvananthapuram"] },
  { name: "iHorse Pictures – Film Promo", sponsor: "iHorse Pictures", start: 2, end: 30, slot: 20, states: ["Tamil Nadu", "Andhra Pradesh"], districts: ["Chennai", "Guntur", "Krishna"] },
  { name: "777 Sunflower Oil Launch", sponsor: "777 Foods", start: 15, end: 45, slot: 20, states: ["Tamil Nadu", "Kerala"], districts: ["Chennai", "Kannur", "Kollam"] },
  { name: "777 Gingelly Oil Festival", sponsor: "777 Foods", start: -95, end: -65, slot: 20, states: ["Tamil Nadu"], districts: ["Salem", "Namakkal", "Dindigul"] },
  { name: "Mega Mobile Sale", sponsor: "The Chennai Mobiles", start: -40, end: -10, slot: 20, states: ["Tamil Nadu"], districts: ["Chennai", "Chengalpattu"] },
];

let seeding: Promise<void> | null = null;

export function seedIfEmpty(): Promise<void> {
  if (!seeding) {
    seeding = runSeed().catch((e) => {
      seeding = null;
      throw e;
    });
  }
  return seeding;
}

async function runSeed() {
  await ensureIndexes();
  // Cross-process guard: only the first caller to claim the lock seeds.
  try {
    await col.seedLocks.insertOne({ _id: "seed", at: new Date() });
  } catch {
    return; // someone else is seeding (or has seeded)
  }
  try {
    if ((await col.users.countDocuments()) > 0) return;

    let seed = 12345;
    const rand = (min: number, max: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return min + (seed % (max - min + 1));
    };
    const day = 86400000;

    // States & districts
    const stateDocs: State[] = STATES.map((name) => ({ _id: new ObjectId(), name }));
    const stateRes = await col.states.insertMany(stateDocs, { ordered: true });
    if (stateRes.insertedCount !== stateDocs.length) {
      throw new Error(`states seed incomplete: ${stateRes.insertedCount}/${stateDocs.length}`);
    }
    const stateId = new Map(stateDocs.map((s) => [s.name, s._id]));
    const districtDocs: District[] = Object.entries(DISTRICTS).flatMap(([st, list]) =>
      list.map((name) => ({ _id: new ObjectId(), name, stateId: stateId.get(st)! })),
    );
    const districtRes = await col.districts.insertMany(districtDocs, { ordered: true });
    if (districtRes.insertedCount !== districtDocs.length) {
      throw new Error(`districts seed incomplete: ${districtRes.insertedCount}/${districtDocs.length}`);
    }
    const districtId = new Map(districtDocs.map((d) => [`${d.stateId.toHexString()}|${d.name}`, d._id]));
    const did = (st: string, name: string) => districtId.get(`${stateId.get(st)!.toHexString()}|${name}`)!;

    // MSOs
    const msoDocs: Mso[] = [];
    const msoGroups: Record<string, string[]> = {
      "Tamil Nadu": ["SCV", "GDN"],
      Puducherry: ["TCCL", "SCV"],
      Kerala: ["Kerala Vision"],
      "Andhra Pradesh": ["APSFL"],
    };
    for (const [st, mlist] of Object.entries(msoGroups)) {
      DISTRICTS[st].forEach((d, i) => {
        mlist.forEach((m, j) => {
          if (j === 1 && i % 3 !== 0) return;
          msoDocs.push({ _id: new ObjectId(), name: m, stateId: stateId.get(st)!, districtId: did(st, d), noBox: m === "TCCL" ? 0 : rand(20000, 99000) });
        });
      });
    }
    await col.msos.insertMany(msoDocs, { ordered: true });
    const msosByDistrict = new Map<string, ObjectId[]>();
    for (const m of msoDocs) msosByDistrict.set(m.districtId.toHexString(), [...(msosByDistrict.get(m.districtId.toHexString()) ?? []), m._id]);

    // Channels
    const channelDocs: Channel[] = [];
    const channelMeta: { primary: ObjectId; secondary?: ObjectId }[] = [];
    let counter = 0;
    for (const st of ["Tamil Nadu", "Puducherry", "Kerala", "Andhra Pradesh"]) {
      const list = DISTRICTS[st];
      list.forEach((d, i) => {
        for (let k = 0; k < 3; k++) {
          const brand = BRANDS[(i * 3 + k) % BRANDS.length];
          const op = OPERATORS[(counter + k) % OPERATORS.length];
          counter++;
          channelDocs.push({
            _id: new ObjectId(),
            name: brand,
            url: STREAMS[counter % STREAMS.length],
            operatorName: op,
            operatorContact: `98${rand(10000000, 99999999)}`,
            operatorEmail: counter % 3 === 0 ? `${op.toLowerCase().replace(/\s+/g, ".")}@${brand.toLowerCase().replace(/[^a-z0-9]+/g, "")}.in` : null,
            stateId: stateId.get(st)!,
            active: counter % 11 !== 0,
            createdAt: new Date(Date.now() - rand(0, 175) * day),
          });
          channelMeta.push({
            primary: did(st, d),
            secondary: counter % 5 === 0 ? did(st, list[(i + 1) % list.length]) : undefined,
          });
        }
      });
    }
    await col.channels.insertMany(channelDocs, { ordered: true });
    const cdDocs: { channelId: ObjectId; districtId: ObjectId }[] = [];
    const cmDocs: { channelId: ObjectId; msoId: ObjectId }[] = [];
    const channelsByDistrict = new Map<string, ObjectId[]>();
    channelDocs.forEach((c, i) => {
      const meta = channelMeta[i];
      for (const d of [meta.primary, meta.secondary]) {
        if (d === undefined) continue;
        cdDocs.push({ channelId: c._id, districtId: d });
        channelsByDistrict.set(d.toHexString(), [...(channelsByDistrict.get(d.toHexString()) ?? []), c._id]);
      }
      for (const m of msosByDistrict.get(meta.primary.toHexString()) ?? []) cmDocs.push({ channelId: c._id, msoId: m });
    });
    await col.channelDistricts.insertMany(cdDocs.map((x) => ({ ...x, _id: new ObjectId() })), { ordered: true });
    await col.channelMsos.insertMany(cmDocs.map((x) => ({ ...x, _id: new ObjectId() })), { ordered: true });

    // Admin + sponsors
    const admin: User = { _id: new ObjectId(), username: "admin", passwordHash: hashPassword("admin123"), name: "Vinod T", role: "admin", sponsorId: null };
    await col.users.insertOne(admin);
    const sponsorDocs: Sponsor[] = SPONSORS.map(
      (s, i): Sponsor => ({
        _id: new ObjectId(),
        name: s.name,
        email: s.email,
        contactNo: s.contactNo,
        contactPerson: s.contactPerson,
        createdAt: new Date(Date.now() - (i * 17 + 3) * day),
      }),
    );
    await col.sponsors.insertMany(sponsorDocs, { ordered: true });
    const sponsorId = new Map(sponsorDocs.map((s) => [s.name, s._id]));
    const sponsorHash = hashPassword("sponsor123");
    await col.users.insertMany(
      SPONSORS.map(
        (s): User => ({
          _id: new ObjectId(),
          username: s.username,
          passwordHash: sponsorHash,
          name: s.contactPerson,
          role: "sponsor",
          sponsorId: sponsorId.get(s.name)!,
        }),
      ),
      { ordered: true },
    );

    // Campaigns (dates are relative to today so statuses look alive)
    const today = todayStr();
    const campaignDocs: Campaign[] = CAMPAIGNS.map((c) => {
      const dIds = c.districts.map((d) => {
        const st = c.states.find((s) => DISTRICTS[s]?.includes(d));
        return did(st!, d);
      });
      const chIds = [...new Set(dIds.flatMap((d) => (channelsByDistrict.get(d.toHexString()) ?? []).slice(0, 4)))];
      return {
        _id: new ObjectId(),
        name: c.name,
        sponsorId: sponsorId.get(c.sponsor)!,
        startDate: addDays(today, c.start),
        endDate: addDays(today, c.end),
        slot: c.slot,
        stateIds: c.states.map((s) => stateId.get(s)!),
        districtIds: dIds,
        channelIds: chIds,
        createdAt: new Date(),
      };
    });
    await col.campaigns.insertMany(campaignDocs, { ordered: true });
  } catch (e) {
    // Release the lock so a transient failure can be retried on the next boot.
    await col.seedLocks.deleteOne({ _id: "seed" }).catch(() => undefined);
    throw e;
  }
}
