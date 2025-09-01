import { Flex, message, Typography } from 'antd';
import { useCallback, useEffect } from 'react';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { Title4 } from '@/components/ui/Typography/Title4';
import { ChainImageMap, EvmChainName } from '@/constants/chains';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { delayInSeconds } from '@/utils/delay';

import { FundingDescription } from './FundingDescription';
import { useTokensFundingStatus } from './hooks/useTokensFundingStatus';
import { TokenRequirementsTable } from './TokenRequirementsTable';

const { Text } = Typography;

export const TransferFunds = () => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();

  const { selectedAgentConfig } = useServices();
  const { isFullyFunded } = useTokensFundingStatus({
    selectedAgentConfig,
  });
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const chainImage = ChainImageMap[evmHomeChainId];

  const handleFunded = useCallback(async () => {
    message.success(
      `${selectedAgentConfig.displayName} has been fully funded!`,
    );

    await delayInSeconds(1);

    // TODO: before moving on to the main page we should first create the master safe, logic for that is still in discussion.
    gotoPage(Pages.Main);
  }, [gotoPage, selectedAgentConfig.displayName]);

  useEffect(() => {
    if (isFullyFunded) {
      handleFunded();
    }
  }, [isFullyFunded, handleFunded]);

  return (
    <Flex justify="center" style={{ marginTop: 40 }}>
      <CardFlex $noBorder style={{ width: 624, padding: 8 }}>
        <BackButton onPrev={() => gotoSetup(SetupScreen.FundYourAgent)} />
        <Title4>Transfer Crypto on {chainName}</Title4>
        <Text className="text-neutral-secondary">
          Send the specified amounts from your external wallet to the Pearl
          Wallet address below. Pearl will automatically detect your transfer.
        </Text>

        <CustomAlert
          showIcon
          type="warning"
          className="mt-24"
          message={`Only send on ${chainName} Chain — funds on other networks are unrecoverable.`}
        />

        <FundingDescription chainName={chainName} chainImage={chainImage} />

        <TokenRequirementsTable />
      </CardFlex>
    </Flex>
  );
};
