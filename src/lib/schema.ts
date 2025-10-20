import { z } from 'zod';

export const VisiblePostingSchema = z.object({
  id: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  origin: z.object({
    city: z.string(),
    state: z.string(),
  }),
  destination: z.object({
    city: z.string(),
    state: z.string(),
  }),
  totalMileage: z.number().optional().nullable(),
  deadheadMileage: z.number().optional().nullable(),
  rate: z.number().optional().nullable(),
  pickupDate: z.string().optional().nullable(),
  pickupTime: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  deliveryTime: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
  postedDate: z.string().optional().nullable(),
  broker: z.object({
    name: z.string(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    mcNumber: z.string().optional().nullable(),
  }),
  notes: z.string().optional().nullable(),
});

export const EmailTemplateSchema = z.object({
  subject: z.string().max(120).default('New load inquiry - {{origin_city}} to {{destination_city}}'),
  body: z
    .string()
    .max(4000)
    .default(
      `Hello {{broker_name}},\n\nWe are interested in the load from {{origin_city}}, {{origin_state}} to {{destination_city}}, {{destination_state}} for {{rate}} at {{total_mileage}} miles.\n\nRegards,\n{{company}} (MC {{mc}})\n{{phone}}`
    ),
});

export const CompanyProfileSchema = z.object({
  name: z.string().default(''),
  mc: z.string().default(''),
  phone: z.string().default(''),
});

export const IdentityProfileSchema = z.object({
  loginEmail: z.string().email().or(z.literal('')).default(''),
  senderEmail: z.string().email().or(z.literal('')).default(''),
});

export const OperationsSettingsSchema = z.object({
  deadheadRadius: z.number().min(0).max(500).default(50),
});

export const EncryptedTokenSchema = z
  .object({
    ciphertext: z.string(),
    iv: z.string(),
    createdAt: z.number(),
  })
  .optional()
  .nullable();

export const TmsSettingsSchema = z.object({
  url: z.string().url().or(z.literal('')).default(''),
  token: EncryptedTokenSchema.default(null),
});

export const SettingsSchema = z.object({
  company: CompanyProfileSchema,
  identity: IdentityProfileSchema,
  emailTemplate: EmailTemplateSchema,
  operations: OperationsSettingsSchema,
  tms: TmsSettingsSchema,
  allowedHosts: z.array(z.string()).default(['power.dat.com']),
  telemetryEnabled: z.boolean().default(false),
});

export const TmsPayloadSchema = z.object({
  source: z.literal('DAT'),
  record: VisiblePostingSchema,
  company: CompanyProfileSchema.extend({
    senderEmail: z.string().email().or(z.literal('')).default(''),
  }),
  notes: z.string().optional(),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;
export type VisiblePostingInput = z.infer<typeof VisiblePostingSchema>;

export function createDefaultSettings(): SettingsInput {
  return SettingsSchema.parse({});
}
