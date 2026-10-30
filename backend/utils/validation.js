import { z } from 'zod';

export function validate(schema, data) {
  return schema.parse(data);
}

// Zod schemas for request validation across the API
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerDonorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  bloodGroup: z.string().length(2).regex(/^(A|B|AB|O)[+-]$/),
  dob: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid date' }),
  locationId: z.number().int().positive()
});

export const registerHospitalSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  address: z.string().min(1),
  locationId: z.number().int().positive()
});

export const campCreateSchema = z.object({
  name: z.string().min(1),
  locationId: z.number().int().positive(),
  startDate: z.string().refine(v => !isNaN(Date.parse(v))),
  endDate: z.string().refine(v => !isNaN(Date.parse(v))),
  capacity: z.number().int().positive()
});

export const campRegisterSchema = z.object({
  donorId: z.number().int().positive()
});

export const requestCreateSchema = z.object({
  hospitalId: z.number().int().positive(),
  bloodGroup: z.string().length(2).regex(/^(A|B|AB|O)[+-]$/),
  unitsNeeded: z.number().int().positive(),
  deadline: z.string().refine(v => !isNaN(Date.parse(v)))
});

export const transferCreateSchema = z.object({
  fromHospitalId: z.number().int().positive(),
  toHospitalId: z.number().int().positive(),
  bloodGroup: z.string().length(2).regex(/^(A|B|AB|O)[+-]$/),
  units: z.number().int().positive()
});

export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional()
});

export default {
  loginSchema,
  registerDonorSchema,
  registerHospitalSchema,
  campCreateSchema,
  campRegisterSchema,
  requestCreateSchema,
  transferCreateSchema,
  paginationSchema
};
