import { z } from 'zod';

export const EpochDetailsResponseSchema = z.object({
  epoch: z.string(),
  epochLength: z.string(),
  blockTimestamp: z.string(),
});
export type EpochDetailsResponse = z.infer<typeof EpochDetailsResponseSchema>;
