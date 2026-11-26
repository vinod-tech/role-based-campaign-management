import type { CampaignStatus } from "./date";

export type Role = "admin" | "sponsor";

export type Id = string;

export type SessionUser = {
  id: Id;
  username: string;
  name: string;
  role: Role;
  sponsorId: Id | null;
};

export type ListResult<T> = { items: T[]; total: number; page: number; pageSize: number };

export type StateRow = { id: Id; name: string; districtCount: number };
export type DistrictRow = { id: Id; name: string; stateId: Id; stateName: string };
export type MsoRow = {
  id: Id;
  name: string;
  stateId: Id;
  stateName: string;
  districtId: Id;
  districtName: string;
  noBox: number;
};
export type SponsorRow = {
  id: Id;
  name: string;
  username: string | null;
  email: string | null;
  contactNo: string | null;
  contactPerson: string | null;
  campaignCount: number;
};
export type ChannelRow = {
  id: Id;
  name: string;
  url: string;
  operatorName: string | null;
  operatorContact: string | null;
  operatorEmail: string | null;
  stateId: Id | null;
  stateName: string | null;
  active: boolean;
  districtIds: Id[];
  districtNames: string[];
  msoIds: Id[];
  msoNames: string[];
};

export type CampaignChannel = {
  id: Id;
  name: string;
  operatorName: string | null;
  districts: string[];
  active: boolean;
};

export type CampaignDetail = {
  id: Id;
  name: string;
  sponsorId: Id;
  sponsorName: string;
  startDate: string;
  endDate: string;
  slot: number;
  status: CampaignStatus;
  stateIds: Id[];
  districtIds: Id[];
  channelIds: Id[];
  states: string[];
  districts: string[];
  channels: CampaignChannel[];
};

export type Options = {
  states: { id: Id; name: string }[];
  districts: { id: Id; name: string; stateId: Id }[];
  msos: { id: Id; name: string; stateId: Id; districtId: Id }[];
  sponsors: { id: Id; name: string }[];
  channels: { id: Id; name: string; stateId: Id | null; districtIds: Id[]; active: boolean }[];
};

export type DashboardData = {
  totals: { channels: number; sponsors: number; campaigns: number; msos: number };
  channels: { active: number; inactive: number };
  sponsors: { withCampaigns: number; without: number };
  campaigns: { running: number; upcoming: number; completed: number };
  channelsByState: { name: string; value: number }[];
  campaignsByMonth: { label: string; value: number }[];
  channelsByMonth: { label: string; value: number }[];
  sponsorsByMonth: { label: string; value: number }[];
  endingSoon: { id: Id; name: string; sponsorName: string; endDate: string }[];
};
