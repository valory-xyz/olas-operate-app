import { Pages } from '@/enums';

const PEARL_WALLET_PAGES = [
  Pages.PearlWallet,
  Pages.PearlWalletDeposit,
  Pages.PearlWalletWithdraw,
  Pages.PearlWalletEnterWithdrawalAddress,
  Pages.PearlWalletSelectPaymentMethod,
] as const;

export const isPearlWalletPage = (page: Pages) => {
  return (PEARL_WALLET_PAGES as readonly Pages[]).includes(page);
};
