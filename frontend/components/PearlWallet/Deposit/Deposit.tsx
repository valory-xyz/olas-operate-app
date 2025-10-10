import { Button, Flex, Select, Typography } from 'antd';
import { isEmpty, kebabCase, values } from 'lodash';
import Image from 'next/image';

import { CustomAlert } from '@/components/Alert';
import {
  BackButton,
  CardFlex,
  cardStyles,
  TokenAmountInput,
  WalletTransferDirection,
} from '@/components/ui';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

import { formatTokenAmounts } from '../helpers';
import { usePearlWallet } from '../PearlWalletProvider';

const { Title, Text } = Typography;

const DepositTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Deposit to Pearl Wallet
    </Title>
    <Text>Enter the token amounts you want to deposit.</Text>
  </Flex>
);

const LowPearlWalletBalanceAlertForCurrentChain = () => {
  const { walletChainId, defaultRequirementDepositValues } = usePearlWallet();

  if (!walletChainId || isEmpty(defaultRequirementDepositValues)) return null;

  return (
    <CustomAlert
      type="error"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="text-sm font-weight-500">
            Low Pearl Wallet Balance on{' '}
            {asEvmChainDetails(asMiddlewareChain(walletChainId)).displayName}{' '}
            Chain
          </Text>
          <Text className="text-sm">
            To continue using Pearl without interruption, deposit{' '}
            {formatTokenAmounts(defaultRequirementDepositValues)} on your Pearl
            Wallet.
          </Text>
        </Flex>
      }
    />
  );
};

const SelectChainToDeposit = () => {
  const { chains, walletChainId, onWalletChainChange } = usePearlWallet();
  return (
    <Select
      value={walletChainId}
      onChange={(value) =>
        onWalletChainChange(value, { canNavigateOnReset: false })
      }
      size="large"
      style={{ maxWidth: 200 }}
    >
      {chains.map((chain) => (
        <Select.Option key={chain.chainId} value={chain.chainId}>
          <Flex align="center" gap={8}>
            <Image
              src={`/chains/${kebabCase(chain.chainName)}-chain.png`}
              alt={chain.chainName}
              width={20}
              height={20}
            />
            {`${chain.chainName} Chain`}
          </Flex>
        </Select.Option>
      ))}
    </Select>
  );
};

type DepositProps = {
  onBack: () => void;
  onContinue: () => void;
};

export const Deposit = ({ onBack, onContinue }: DepositProps) => {
  const { onDepositAmountChange, amountsToDeposit, availableAssets } =
    usePearlWallet();

  return (
    <CardFlex $noBorder $padding="32px" style={cardStyles}>
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <DepositTitle />
        </Flex>
        <WalletTransferDirection from="External Wallet" to="Pearl Wallet" />

        <Flex vertical gap={16}>
          <SelectChainToDeposit />
          <LowPearlWalletBalanceAlertForCurrentChain />
          <Flex justify="space-between" align="center" vertical gap={16}>
            {availableAssets.map(({ amount, symbol }) => (
              <TokenAmountInput
                key={symbol}
                tokenSymbol={symbol}
                value={amountsToDeposit?.[symbol] ?? 0}
                totalAmount={amount}
                onChange={(x) => onDepositAmountChange(symbol, x ?? 0)}
                showQuickSelects={false}
              />
            ))}
          </Flex>
        </Flex>

        <Button
          disabled={values(amountsToDeposit).every((i) => i === 0)}
          onClick={onContinue}
          type="primary"
          size="large"
          block
        >
          Continue
        </Button>
      </Flex>
    </CardFlex>
  );
};
