import { AddFundsThroughBridge } from './AddFundsThroughBridge';

/**
 * Add funds through bridge to the master safe (using "Add Funds").
 */
export const AddFundsToMasterSafeThroughBridge = () => {
  return (
    <AddFundsThroughBridge completionMessage="Funds have been bridged to your Pearl Safe." />
  );
};
