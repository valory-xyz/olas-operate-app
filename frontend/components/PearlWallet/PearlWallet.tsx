import { Flex } from 'antd';
import { useCallback, useMemo } from 'react';

import { MAIN_CONTENT_MAX_WIDTH } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { Deposit } from './Deposit/Deposit';
import { SelectPaymentMethod } from './Deposit/SelectPaymentMethod/SelectPaymentMethod';
import { PearlWalletProvider } from './PearlWalletProvider';
import { BalancesAndAssets } from './Withdraw/BalancesAndAssets/BalancesAndAssets';
import { EnterWithdrawalAddress } from './Withdraw/EnterWithdrawalAddress/EnterWithdrawalAddress';
import { SelectAmountToWithdraw } from './Withdraw/SelectAmountToWithdraw';

/**
 * To display the Pearl Wallet page.
 */
const PearlWalletContent = () => {
  const { pageState, goto } = usePageState();

  const handleNext = useCallback(() => {
    switch (pageState) {
      case Pages.PearlWallet:
        goto(Pages.PearlWalletWithdraw);
        break;
      case Pages.PearlWalletWithdraw:
        goto(Pages.PearlWalletEnterWithdrawalAddress);
        break;
      case Pages.PearlWalletDeposit:
        goto(Pages.PearlWalletSelectPaymentMethod);
        break;
      default:
        break;
    }
  }, [goto, pageState]);

  const handleBack = useCallback(() => {
    switch (pageState) {
      case Pages.PearlWalletWithdraw:
      case Pages.PearlWalletDeposit:
        goto(Pages.PearlWallet);
        break;
      case Pages.PearlWalletEnterWithdrawalAddress:
        goto(Pages.PearlWalletWithdraw);
        break;
      case Pages.PearlWalletSelectPaymentMethod:
        goto(Pages.PearlWalletDeposit);
        break;
      default:
        break;
    }
  }, [goto, pageState]);

  const content = useMemo(() => {
    switch (pageState) {
      case Pages.PearlWallet:
        return (
          <BalancesAndAssets
            onWithdraw={handleNext}
            onDeposit={() => goto(Pages.PearlWalletDeposit)}
          />
        );
      case Pages.PearlWalletWithdraw:
        return (
          <SelectAmountToWithdraw onBack={handleBack} onContinue={handleNext} />
        );
      case Pages.PearlWalletEnterWithdrawalAddress:
        return <EnterWithdrawalAddress onBack={handleBack} />;
      case Pages.PearlWalletDeposit:
        return <Deposit onBack={handleBack} onContinue={handleNext} />;
      case Pages.PearlWalletSelectPaymentMethod:
        return <SelectPaymentMethod onBack={handleBack} />;
      default:
        throw new Error('Invalid page');
    }
  }, [pageState, handleNext, handleBack, goto]);

  return content;
};

export const PearlWallet = () => {
  const { pageState } = usePageState();

  return (
    <PearlWalletProvider>
      <Flex
        vertical
        style={{
          width:
            pageState === Pages.PearlWalletSelectPaymentMethod
              ? undefined
              : MAIN_CONTENT_MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <PearlWalletContent />
      </Flex>
    </PearlWalletProvider>
  );
};
