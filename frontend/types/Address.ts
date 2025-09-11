import { z } from 'zod';

export type Address = `0x${string}`;

export const TxnHashSchema = z.string().refine((value) => {
  return /^0x([A-Fa-f0-9]{64})$/.test(value);
}, 'Invalid transaction hash format');

export type TxnHash = z.infer<typeof TxnHashSchema>;

export const AddressSchema = z.string().refine((value) => {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
});
