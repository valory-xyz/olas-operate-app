import { Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { BackButton } from '@/components/ui/BackButton';
import { ChainImageMap, EvmChainName } from '@/constants/chains';
import { SetupScreen } from '@/enums/SetupScreen';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';

import { FundingDescription } from './FundingDescription';
import { TokenRequirementsTable } from './TokenRequirementsTable';

const { Title, Text } = Typography;

export const TransferFunds = () => {
  const { goto } = useSetup();
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId } = selectedAgentConfig;
  const chainName = EvmChainName[evmHomeChainId];
  const chainImage = ChainImageMap[evmHomeChainId];

  return (
    <Flex justify="center" style={{ marginTop: 40 }}>
      <CardFlex $noBorder style={{ width: 624, padding: 8 }}>
        <BackButton onPrev={() => goto(SetupScreen.FundYourAgent)} />
        <Title
          className="text-neutral-primary"
          level={4}
          style={{ fontWeight: 500, margin: '12px 0' }}
        >
          Transfer Crypto on {chainName}
        </Title>
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
