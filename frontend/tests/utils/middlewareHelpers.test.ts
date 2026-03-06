import { TokenSymbolMap } from '../../config/tokens';
import { AddressZero } from '../../constants/address';
import {
  AllEvmChainIdMap,
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../constants/chains';
import {
  asAllEvmChainId,
  asAllMiddlewareChain,
  asEvmChainDetails,
  asEvmChainId,
  asMiddlewareChain,
  getTokenDetailsFromAddress,
} from '../../utils/middlewareHelpers';
import { INVALID_CHAIN_ID, UNKNOWN_TOKEN_ADDRESS } from '../mocks/factories';

describe('asEvmChainId', () => {
  it('converts gnosis to 100', () => {
    expect(asEvmChainId(MiddlewareChainMap.GNOSIS)).toBe(EvmChainIdMap.Gnosis);
  });

  it('converts base to 8453', () => {
    expect(asEvmChainId(MiddlewareChainMap.BASE)).toBe(EvmChainIdMap.Base);
  });

  it('converts mode to 34443', () => {
    expect(asEvmChainId(MiddlewareChainMap.MODE)).toBe(EvmChainIdMap.Mode);
  });

  it('converts optimism to 10', () => {
    expect(asEvmChainId(MiddlewareChainMap.OPTIMISM)).toBe(
      EvmChainIdMap.Optimism,
    );
  });

  it('converts polygon to 137', () => {
    expect(asEvmChainId(MiddlewareChainMap.POLYGON)).toBe(
      EvmChainIdMap.Polygon,
    );
  });

  it('throws for invalid chain', () => {
    expect(() => asEvmChainId('invalid')).toThrow(
      'Invalid middleware chain enum',
    );
  });

  it('throws for undefined', () => {
    expect(() => asEvmChainId(undefined)).toThrow(
      'Invalid middleware chain enum',
    );
  });
});

describe('asAllEvmChainId', () => {
  it('converts ethereum to 1', () => {
    expect(asAllEvmChainId(MiddlewareChainMap.ETHEREUM)).toBe(
      AllEvmChainIdMap.Ethereum,
    );
  });

  it('delegates non-ethereum chains to asEvmChainId', () => {
    expect(asAllEvmChainId(MiddlewareChainMap.GNOSIS)).toBe(
      EvmChainIdMap.Gnosis,
    );
  });
});

describe('asEvmChainDetails', () => {
  it('returns correct details for ethereum', () => {
    const result = asEvmChainDetails(MiddlewareChainMap.ETHEREUM);
    expect(result.name).toBe('ethereum');
    expect(result.displayName).toBe('Ethereum');
    expect(result.symbol).toBe(TokenSymbolMap.ETH);
    expect(result.chainId).toBe(AllEvmChainIdMap.Ethereum);
  });

  it('returns correct details for gnosis', () => {
    const result = asEvmChainDetails(MiddlewareChainMap.GNOSIS);
    expect(result.name).toBe('gnosis');
    expect(result.displayName).toBe('Gnosis');
    expect(result.symbol).toBe(TokenSymbolMap.XDAI);
  });

  it('returns correct details for polygon', () => {
    const result = asEvmChainDetails(MiddlewareChainMap.POLYGON);
    expect(result.symbol).toBe(TokenSymbolMap.POL);
  });

  it('returns ETH symbol for base, mode, optimism', () => {
    expect(asEvmChainDetails(MiddlewareChainMap.BASE).symbol).toBe(
      TokenSymbolMap.ETH,
    );
    expect(asEvmChainDetails(MiddlewareChainMap.MODE).symbol).toBe(
      TokenSymbolMap.ETH,
    );
    expect(asEvmChainDetails(MiddlewareChainMap.OPTIMISM).symbol).toBe(
      TokenSymbolMap.ETH,
    );
  });

  it('throws for invalid chain', () => {
    expect(() => asEvmChainDetails('invalid')).toThrow(
      'Invalid middleware chain enum',
    );
  });
});

describe('asMiddlewareChain', () => {
  it('converts chain IDs to middleware chain enums', () => {
    expect(asMiddlewareChain(EvmChainIdMap.Gnosis)).toBe(
      MiddlewareChainMap.GNOSIS,
    );
    expect(asMiddlewareChain(EvmChainIdMap.Base)).toBe(MiddlewareChainMap.BASE);
    expect(asMiddlewareChain(EvmChainIdMap.Mode)).toBe(MiddlewareChainMap.MODE);
    expect(asMiddlewareChain(EvmChainIdMap.Optimism)).toBe(
      MiddlewareChainMap.OPTIMISM,
    );
    expect(asMiddlewareChain(EvmChainIdMap.Polygon)).toBe(
      MiddlewareChainMap.POLYGON,
    );
  });

  it('throws for invalid chain ID', () => {
    expect(() => asMiddlewareChain(INVALID_CHAIN_ID)).toThrow(
      'Invalid chain id',
    );
  });

  it('throws for undefined', () => {
    expect(() => asMiddlewareChain(undefined)).toThrow('Invalid chain id');
  });
});

describe('asAllMiddlewareChain', () => {
  it('converts Ethereum chain ID to ethereum middleware chain', () => {
    expect(asAllMiddlewareChain(AllEvmChainIdMap.Ethereum)).toBe(
      MiddlewareChainMap.ETHEREUM,
    );
  });

  it('delegates non-ethereum chain IDs to asMiddlewareChain', () => {
    expect(asAllMiddlewareChain(AllEvmChainIdMap.Gnosis)).toBe(
      MiddlewareChainMap.GNOSIS,
    );
  });
});

describe('getTokenDetailsFromAddress', () => {
  it('returns native token details for AddressZero', () => {
    const details = getTokenDetailsFromAddress(
      MiddlewareChainMap.GNOSIS,
      AddressZero,
    );
    expect(details.symbol).toBe(TokenSymbolMap.XDAI);
  });

  it('returns token details for a known ERC20 address', () => {
    // OLAS on Gnosis
    const olasAddress = '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f';
    const details = getTokenDetailsFromAddress(
      MiddlewareChainMap.GNOSIS,
      olasAddress,
    );
    expect(details.symbol).toBe(TokenSymbolMap.OLAS);
  });

  it('is case-insensitive for token address matching', () => {
    const olasAddress = '0xce11e14225575945b8e6dc0d4f2dd4c570f79d9f';
    const details = getTokenDetailsFromAddress(
      MiddlewareChainMap.GNOSIS,
      olasAddress,
    );
    expect(details.symbol).toBe(TokenSymbolMap.OLAS);
  });

  it('throws for unknown token address', () => {
    expect(() =>
      getTokenDetailsFromAddress(
        MiddlewareChainMap.GNOSIS,
        UNKNOWN_TOKEN_ADDRESS,
      ),
    ).toThrow('Token details not found');
  });
});
