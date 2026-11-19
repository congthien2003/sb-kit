import { z } from 'zod';

export const contactFormSchema = z
  .object({
    name: z.string().trim().min(1, 'required').max(120, 'fieldInvalid'),
    mail: z.string().trim().email('invalidEmail').max(254, 'fieldInvalid'),
    phone: z.string().trim().min(1, 'required').max(40, 'fieldInvalid'),
    companyName: z.string().trim().min(1, 'required').max(160, 'fieldInvalid'),
    message: z
      .string()
      .trim()
      .min(10, 'messageTooShort')
      .max(4000, 'fieldInvalid'),
    website: z.string().max(0, 'fieldInvalid').optional(),
  })
  .strict();

export type ContactFormData = z.infer<typeof contactFormSchema>;
