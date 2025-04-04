import { BridgeExecutionStatus, QuoteBundleStatus } from '@/types/Bridge';

type BridgeStatus = {
  id: string;
  status: QuoteBundleStatus;
  executions: {
    explorer_link: string;
    message: string;
    status: BridgeExecutionStatus;
    tx_hash: string;
  }[];
  error: boolean;
};

// TODO: remove this mock data and use the real API
/**
 * Returns the bridge status of the given quote
 */
export const getBridgeStatus = async (
  quoteId: string = 'qb-bdaafd7f-0698-4e10-83dd-d742cc0e656d',
): Promise<BridgeStatus> => {
  return {
    id: quoteId,
    status: 'SUBMITTED' satisfies QuoteBundleStatus,
    executions: [
      {
        explorer_link:
          'https://scan.li.fi/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
        message: '',
        status: 'DONE' satisfies BridgeExecutionStatus,
        tx_hash:
          '0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
      },
      {
        explorer_link: '',
        message: '',
        status: 'PENDING' satisfies BridgeExecutionStatus,
        tx_hash:
          '0x0e53f1b6aa5552f2d4cfe8e623dd95e54ca079c4b23b89d0c0aa6ed4a6442384',
      },
    ],
    error: false,
  };
};
