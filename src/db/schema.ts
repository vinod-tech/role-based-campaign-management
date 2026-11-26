// MongoDB document models (replaces the Drizzle/Postgres schema).
// Related documents reference each other by ObjectId; campaigns keep
// arrays of ObjectIds for their state/district/channel coverage.
import type { ObjectId } from "mongodb";

export type Sponsor = {
  _id: ObjectId;
  name: string;
  email: string | null;
  contactNo: string | null;
  contactPerson: string | null;
  createdAt: Date;
};

export type User = {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  name: string;
  role: "admin" | "sponsor";
  sponsorId: ObjectId | null;
};

export type State = { _id: ObjectId; name: string };

export type District = { _id: ObjectId; name: string; stateId: ObjectId };

export type Mso = { _id: ObjectId; name: string; stateId: ObjectId; districtId: ObjectId; noBox: number };

export type Channel = {
  _id: ObjectId;
  name: string;
  url: string;
  operatorName: string | null;
  operatorContact: string | null;
  operatorEmail: string | null;
  stateId: ObjectId | null;
  active: boolean;
  createdAt: Date;
};

export type ChannelDistrict = { _id: ObjectId; channelId: ObjectId; districtId: ObjectId };

export type ChannelMso = { _id: ObjectId; channelId: ObjectId; msoId: ObjectId };

export type Campaign = {
  _id: ObjectId;
  name: string;
  sponsorId: ObjectId;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  slot: number;
  stateIds: ObjectId[];
  districtIds: ObjectId[];
  channelIds: ObjectId[];
  createdAt: Date;
};

export type ChannelDistrictLink = { channelId: ObjectId; districtId: ObjectId };

export type ChannelMsoLink = { channelId: ObjectId; msoId: ObjectId };

export type SeedLock = { _id: string; at: Date };
