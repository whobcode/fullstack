import { z } from 'zod';

export const phoneCodeRequestSchema = z.object({
  phone: z.string().min(8, { message: 'Enter a valid phone number' }).max(24),
});

export const phoneCodeVerifySchema = z.object({
  phone: z.string().min(8, { message: 'Enter a valid phone number' }).max(24),
  code: z.string().regex(/^\d{6}$/, { message: 'Enter the 6-digit code' }),
});

// Contact discovery. The client sends the numbers from the device address book;
// the server matches them and keeps only the resulting edges. The cap keeps a
// single upload from being used to sweep large blocks of the phone space.
export const contactMatchSchema = z.object({
  phones: z.array(z.string().min(5).max(24)).min(1).max(1000),
});

export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const discoverySettingsSchema = z.object({
  discoverable_by_phone: z.boolean().optional(),
  discoverable_by_location: z.boolean().optional(),
});

export const dismissSuggestionSchema = z.object({
  userId: z.string().min(1),
});

export type PhoneCodeRequestInput = z.infer<typeof phoneCodeRequestSchema>;
export type PhoneCodeVerifyInput = z.infer<typeof phoneCodeVerifySchema>;
export type ContactMatchInput = z.infer<typeof contactMatchSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type DiscoverySettingsInput = z.infer<typeof discoverySettingsSchema>;
export type DismissSuggestionInput = z.infer<typeof dismissSuggestionSchema>;
