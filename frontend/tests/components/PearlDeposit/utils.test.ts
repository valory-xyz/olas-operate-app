import {
  getNetDepositAmounts,
  toTargetBalances,
} from '../../../components/PearlDeposit/utils';
import { TokenSymbolMap } from '../../../config/tokens';
import { AvailableAsset } from '../../../types/Wallet';

const asset = (symbol: AvailableAsset['symbol'], amount: number) =>
  ({ symbol, amount }) as AvailableAsset;

describe('toTargetBalances', () => {
  const assets = [asset(TokenSymbolMap.OLAS, 8), asset(TokenSymbolMap.XDAI, 2)];

  it('adds each amount to the balance already held', () => {
    expect(
      toTargetBalances(
        {
          [TokenSymbolMap.OLAS]: { amount: 10 },
          [TokenSymbolMap.XDAI]: { amount: 1 },
        },
        assets,
      ),
    ).toEqual({
      [TokenSymbolMap.OLAS]: { amount: 18 },
      [TokenSymbolMap.XDAI]: { amount: 3 },
    });
  });

  it('keeps a token with nothing to add at 0 rather than its balance', () => {
    expect(
      toTargetBalances({ [TokenSymbolMap.OLAS]: { amount: 0 } }, assets),
    ).toEqual({ [TokenSymbolMap.OLAS]: { amount: 0 } });
  });

  it('treats a token with no listed balance as holding nothing', () => {
    expect(
      toTargetBalances({ [TokenSymbolMap.USDC]: { amount: 5 } }, assets),
    ).toEqual({ [TokenSymbolMap.USDC]: { amount: 5 } });
  });

  it('round-trips through getNetDepositAmounts to the amounts to add', () => {
    // A shortfall held in full must neither vanish nor block Continue.
    const targets = toTargetBalances(
      { [TokenSymbolMap.OLAS]: { amount: 10 } },
      [asset(TokenSymbolMap.OLAS, 10)],
    );
    expect(
      getNetDepositAmounts(targets, [asset(TokenSymbolMap.OLAS, 10)]),
    ).toEqual([{ symbol: TokenSymbolMap.OLAS, amount: 10 }]);
  });
});
