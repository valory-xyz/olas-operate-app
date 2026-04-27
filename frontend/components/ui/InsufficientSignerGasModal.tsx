import { Button } from 'antd';
import { useMemo } from 'react';

import { WarningOutlined } from '@/components/custom-icons';
import { CHAIN_CONFIG } from '@/config/chains';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { Modal } from './Modal';

export type InsufficientSignerGasCase =
  | 'agent-withdraw'
  | 'pearl-withdraw'
  | 'fund-agent';

const COPY: Record<
  InsufficientSignerGasCase,
  { title: string; walletLabel: string; ctaLabel: string }
> = {
  'agent-withdraw': {
    title: 'Withdrawal Failed: Insufficient Balance',
    walletLabel: 'agent wallet',
    ctaLabel: 'Fund Agent',
  },
  'pearl-withdraw': {
    title: 'Withdrawal Failed: Insufficient Balance',
    walletLabel: 'Pearl wallet',
    ctaLabel: 'Fund Pearl Wallet',
  },
  'fund-agent': {
    title: 'Transfer Failed: Insufficient Balance',
    walletLabel: 'Pearl wallet',
    ctaLabel: 'Fund Agent',
  },
};

export type InsufficientSignerGasModalProps = {
  caseType: InsufficientSignerGasCase;
  chain: string;
  prefillAmountWei: number | string;
  onFund: () => void;
  onClose: () => void;
};

export const InsufficientSignerGasModal = ({
  caseType,
  chain,
  prefillAmountWei,
  onFund,
  onClose,
}: InsufficientSignerGasModalProps) => {
  const { title, walletLabel, ctaLabel } = COPY[caseType];

  // Resolve native-token symbol + decimals from the chain string so we
  // don't hardcode 18 (in case a future supported chain ships a non-18
  // native). Defensive: `asEvmChainId` throws on unknown / unsupported
  // chains — fall back to safe defaults so the modal still renders.
  const { nativeSymbol, decimals } = useMemo(() => {
    try {
      const evmChainId = asEvmChainId(chain);
      const { symbol, decimals: nativeDecimals } =
        CHAIN_CONFIG[evmChainId].nativeToken;
      return { nativeSymbol: symbol, decimals: nativeDecimals };
    } catch {
      return { nativeSymbol: '', decimals: 18 };
    }
  }, [chain]);

  const amount = formatUnitsToNumber(String(prefillAmountWei), decimals, 6);

  return (
    <Modal
      header={<WarningOutlined />}
      title={title}
      description={`Fund your ${walletLabel} with at least ${amount} ${nativeSymbol} to cover gas fees.`}
      closable
      onCancel={onClose}
      action={
        <Button
          type="primary"
          block
          size="large"
          className="mt-12"
          onClick={onFund}
        >
          {ctaLabel}
        </Button>
      }
    />
  );
};
