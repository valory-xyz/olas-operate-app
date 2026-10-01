import { render } from '@testing-library/react';

import { DepositOlasForStaking } from '../../../components/ConfirmSwitch/DepositOlasForStaking';
import { useShouldAllowStakingContractSwitch } from '../../../components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch';
import { TokenSymbolMap } from '../../../config/tokens';
import { usePearlWallet } from '../../../context/PearlWalletProvider';

jest.mock('../../../components/PearlDeposit', () => ({
  PearlDeposit: () => null,
}));
jest.mock(
  '../../../components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch',
  () => ({ useShouldAllowStakingContractSwitch: jest.fn() }),
);
jest.mock('../../../context/PearlWalletProvider', () => ({
  usePearlWallet: jest.fn(),
}));
jest.mock('../../../hooks', () => ({
  usePageState: () => ({ goto: jest.fn() }),
}));

const mockUseShouldAllowStakingContractSwitch =
  useShouldAllowStakingContractSwitch as jest.Mock;
const mockUsePearlWallet = usePearlWallet as jest.Mock;
const mockUpdateAmountsToDeposit = jest.fn();

const setup = ({
  olasRequiredToMigrate,
  olasBalance,
  isLoading = false,
}: {
  olasRequiredToMigrate: number;
  olasBalance: number;
  isLoading?: boolean;
}) => {
  mockUseShouldAllowStakingContractSwitch.mockReturnValue({
    olasRequiredToMigrate,
  });
  mockUsePearlWallet.mockReturnValue({
    isLoading,
    availableAssets: [{ symbol: TokenSymbolMap.OLAS, amount: olasBalance }],
    updateAmountsToDeposit: mockUpdateAmountsToDeposit,
  });
  render(<DepositOlasForStaking />);
};

describe('DepositOlasForStaking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pre-fills the OLAS target as the balance plus what the switch needs', () => {
    setup({ olasRequiredToMigrate: 10, olasBalance: 8 });
    expect(mockUpdateAmountsToDeposit).toHaveBeenLastCalledWith({
      OLAS: { amount: 18 },
    });
  });

  it('pre-fills 0 when the switch needs no more OLAS', () => {
    setup({ olasRequiredToMigrate: 0, olasBalance: 8 });
    expect(mockUpdateAmountsToDeposit).toHaveBeenLastCalledWith({
      OLAS: { amount: 0 },
    });
  });

  it('does not pre-fill until balances have loaded', () => {
    setup({ olasRequiredToMigrate: 10, olasBalance: 0, isLoading: true });
    expect(mockUpdateAmountsToDeposit).not.toHaveBeenCalled();
  });
});
