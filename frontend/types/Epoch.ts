import { z } from 'zod';

export const EpochTimeResponseSchema = z.object({
  epoch: z.string(),
  epochLength: z.string(),
  blockTimestamp: z.string(),
});
export type EpochTimeResponse = z.infer<typeof EpochTimeResponseSchema>;
