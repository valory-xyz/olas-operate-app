import { z } from 'zod';

import { AddressSchema } from '@/types/Address';

export const EpochDetailsSchema = z.object({
  epoch: z.number(),
  epochStartTimeStamp: z.number(),
  epochEndTimeStamp: z.number(),
  reward: z.number(),
  earned: z.boolean(),
  transactionHash: z.string(),
});

export const StakingRewardSchema = z.object({
  id: AddressSchema,
  name: z.string(),
  history: z.array(EpochDetailsSchema),
});

export type EpochDetails = z.infer<typeof EpochDetailsSchema>;
export type StakingReward = z.infer<typeof StakingRewardSchema>;
