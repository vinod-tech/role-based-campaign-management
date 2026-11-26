import { z } from "zod";
import { ObjectId } from "mongodb";

const emptyToNull = (v: string | undefined) => (v && v.length ? v : null);

export const optionalText = (max = 120) => z.string().trim().max(max).optional().transform(emptyToNull);

export const optionalEmail = z
  .union([z.literal(""), z.string().trim().email("Enter a valid email")])
  .optional()
  .transform(emptyToNull);

/** Mongo ObjectId as a 24-char hex string. */
export const idSchema = z.string().refine((v) => ObjectId.isValid(v), "Invalid id");

export const idArray = z.array(idSchema);

export const sponsorBase = {
  name: z.string().trim().min(2, "Name is too short").max(120),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, . _ - only"),
  email: optionalEmail,
  contactNo: optionalText(20),
  contactPerson: optionalText(80),
};

export const channelSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .refine((v) => /^https?:\/\//i.test(v), "URL must start with http:// or https://"),
  operatorName: optionalText(80),
  operatorContact: optionalText(20),
  operatorEmail: optionalEmail,
  stateId: idSchema,
  districtIds: idArray,
  msoIds: idArray,
  active: z.boolean(),
});

export const campaignSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(160),
    sponsorId: idSchema,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date"),
    slot: z.coerce.number().int().min(1, "Slot must be at least 1").max(1000),
    stateIds: idArray.min(1, "Select at least one state"),
    districtIds: idArray.min(1, "Select at least one district"),
    channelIds: idArray.min(1, "Select at least one channel"),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be on or after the start date", path: ["endDate"] });
