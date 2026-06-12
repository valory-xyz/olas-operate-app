import { resolveToken } from '../../../../components/PearlWallet/History/tokenLookup';
import { GNOSIS_TOKEN_CONFIG, TokenSymbolMap } from '../../../../config/tokens';
import { EvmChainIdMap } from '../../../../constants/chains';
import { Address } from '../../../../types/Address';
import {
  INVALID_CHAIN_ID,
  MOCK_OLAS_TOKEN_ADDRESS,
  UNKNOWN_TOKEN_ADDRESS,
} from '../../../helpers/factories';

describe('resolveToken', () => {
  it('returns null when chainId is undefined', () => {
    expect(resolveToken(undefined, MOCK_OLAS_TOKEN_ADDRESS)).toBeNull();
  });

  it('returns null when chain is not in TOKEN_CONFIG', () => {
    expect(resolveToken(INVALID_CHAIN_ID, MOCK_OLAS_TOKEN_ADDRESS)).toBeNull();
  });

  it('resolves the native token when tokenAddress is null', () => {
    const native = resolveToken(EvmChainIdMap.Gnosis, null);
    expect(native?.symbol).toBe(TokenSymbolMap.XDAI);
    expect(native?.decimals).toBe(18);
  });

  it('resolves the native token when tokenAddress is the zero address', () => {
    const native = resolveToken(
      EvmChainIdMap.Gnosis,
      '0x0000000000000000000000000000000000000000' as Address,
    );
    expect(native?.symbol).toBe(TokenSymbolMap.XDAI);
  });

  it('resolves ERC-20 by address (case-insensitive)', () => {
    const olasAddr = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS]
      ?.address as Address;
    expect(resolveToken(EvmChainIdMap.Gnosis, olasAddr)?.symbol).toBe(
      TokenSymbolMap.OLAS,
    );
    expect(
      resolveToken(EvmChainIdMap.Gnosis, olasAddr.toUpperCase() as Address)
        ?.symbol,
    ).toBe(TokenSymbolMap.OLAS);
  });

  it('returns null for an unknown ERC-20 address', () => {
    expect(
      resolveToken(EvmChainIdMap.Gnosis, UNKNOWN_TOKEN_ADDRESS),
    ).toBeNull();
  });
});
