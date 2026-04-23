import { Button } from 'antd';

import { WarningOutlined } from '@/components/custom-icons';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';
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

type InsufficientSignerGasModalProps = {
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
  const nativeSymbol = asEvmChainDetails(chain).symbol;
  const amount = formatUnitsToNumber(String(prefillAmountWei), 18, 6);

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
