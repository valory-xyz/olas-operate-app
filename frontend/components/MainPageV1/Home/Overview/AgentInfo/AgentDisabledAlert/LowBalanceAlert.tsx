import { Button, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
// TODO: move hook once decided how to handle low funds alerts
import { useLowFundsDetails } from '@/components/MainPage/sections/AlertSections/LowFunds/useLowFunds';
import { useMasterBalances } from '@/hooks/useBalanceContext';

const { Text } = Typography;

export const LowBalanceAlert = () => {
  const {
    isMasterEoaLowOnGas,
    masterEoaGasRequirement,
    isMasterSafeLowOnNativeGas,
    masterSafeNativeGasRequirement,
  } = useMasterBalances();

  const { chainName, tokenSymbol } = useLowFundsDetails();

  return (
    <>
      {!isMasterEoaLowOnGas ? (
        <CustomAlert
          showIcon
          className="mt-16"
          type="error"
          message={
            <>
              <Text className="text-sm">
                <span className="font-weight-600">
                  Pearl wallet balance is too low
                </span>
                <br />
                To keep your agent operational, add at least{' '}
                <span className="font-weight-600">
                  {`${masterEoaGasRequirement} ${tokenSymbol} `}
                  on {chainName} chain
                </span>{' '}
                to Pearl Wallet. Your agent is at risk of missing its targets,
                which would result in several days&apos; suspension.
              </Text>
              <br />
              <Button
                // TODO: handle navigation
                disabled
                size="small"
                className="mt-8"
              >
                Fund Pearl Wallet
              </Button>
            </>
          }
        />
      ) : null}

      {!isMasterSafeLowOnNativeGas ? (
        <CustomAlert
          showIcon
          className="mt-16"
          type="error"
          message={
            <>
              <Text className="text-sm">
                <span className="font-weight-600">
                  Agent wallet balance is too low
                </span>
                <br />
                To keep running your agent, add at least{' '}
                <span className="font-weight-600">
                  {`${masterSafeNativeGasRequirement} ${tokenSymbol} `}
                  on {chainName} chain{' '}
                </span>
                to the agent wallet. It&apos;s needed for the agent to perform
                on-chain activity and meet staking requirements.
              </Text>
              <br />
              <Button
                // TODO: handle navigation
                disabled
                size="small"
                className="mt-8"
              >
                Fund Agent
              </Button>
            </>
          }
        />
      ) : null}
    </>
  );
};
