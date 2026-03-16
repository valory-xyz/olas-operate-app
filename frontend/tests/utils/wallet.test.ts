/* eslint-disable @typescript-eslint/no-var-requires */
import {
  ChainTokenConfig,
  ETHEREUM_TOKEN_CONFIG,
  GNOSIS_TOKEN_CONFIG,
  POLYGON_TOKEN_CONFIG,
  TokenType,
} from '../../config/tokens';
import { AddressZero } from '../../constants/address';
import { Address } from '../../types/Address';
import { TokenAmounts } from '../../types/Wallet';
import {
  getFromToken,
  getTokenDecimal,
  getTokenDetails,
  tokenBalancesToSentence,
} from '../../utils/wallet';
import { UNKNOWN_TOKEN_ADDRESS } from '../helpers/factories';

jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

describe('tokenBalancesToSentence', () => {
  it('returns empty string for empty object', () => {
    expect(tokenBalancesToSentence({})).toBe('');
  });

  it('returns empty string when all amounts are zero', () => {
    const amounts: TokenAmounts = {
      ETH: { amount: 0 },
      OLAS: { amount: 0 },
    };
    expect(tokenBalancesToSentence(amounts)).toBe('');
  });

  it('formats single token', () => {
    const amounts: TokenAmounts = { ETH: { amount: 0.5 } };
    expect(tokenBalancesToSentence(amounts)).toBe('0.5000 ETH');
  });

  it('formats two tokens with "and"', () => {
    const amounts: TokenAmounts = {
      ETH: { amount: 0.5 },
      XDAI: { amount: 100 },
    };
    expect(tokenBalancesToSentence(amounts)).toBe(
      '0.5000 ETH and 100.0000 XDAI',
    );
  });

  it('formats three or more tokens with commas and "and"', () => {
    const amounts: TokenAmounts = {
      ETH: { amount: 0.5 },
      XDAI: { amount: 100 },
      OLAS: { amount: 25 },
    };
    expect(tokenBalancesToSentence(amounts)).toBe(
      '0.5000 ETH, 100.0000 XDAI and 25.0000 OLAS',
    );
  });

  it('filters out zero amounts from mixed input', () => {
    const amounts: TokenAmounts = {
      ETH: { amount: 0 },
      OLAS: { amount: 10 },
    };
    expect(tokenBalancesToSentence(amounts)).toBe('10.0000 OLAS');
  });

  it('formats with up to 4 decimal places (truncates extra)', () => {
    const amounts: TokenAmounts = {
      ETH: { amount: 0.123456789 },
    };
    expect(tokenBalancesToSentence(amounts)).toBe('0.1235 ETH');
  });
});

describe('getTokenDetails', () => {
  it('returns native gas token for AddressZero on Gnosis', () => {
    const result = getTokenDetails(AddressZero, GNOSIS_TOKEN_CONFIG);
    expect(result).toEqual({ symbol: 'XDAI', decimals: 18 });
  });

  it('returns native gas token for AddressZero on Ethereum', () => {
    const result = getTokenDetails(AddressZero, ETHEREUM_TOKEN_CONFIG);
    expect(result).toEqual({ symbol: 'ETH', decimals: 18 });
  });

  it('defaults to ETH/18 when chain has no native token', () => {
    const emptyConfig = {};
    const result = getTokenDetails(AddressZero, emptyConfig);
    expect(result).toEqual({ symbol: 'ETH', decimals: 18 });
  });

  it('finds OLAS by address on Gnosis (case-insensitive)', () => {
    const olasAddress = GNOSIS_TOKEN_CONFIG.OLAS!.address!;
    const result = getTokenDetails(olasAddress as Address, GNOSIS_TOKEN_CONFIG);
    expect(result?.symbol).toBe('OLAS');
    expect(result?.decimals).toBe(18);
  });

  it('finds USDC.e by address on Gnosis', () => {
    const usdceAddress = GNOSIS_TOKEN_CONFIG['USDC.e']!.address!;
    const result = getTokenDetails(
      usdceAddress as Address,
      GNOSIS_TOKEN_CONFIG,
    );
    expect(result?.symbol).toBe('USDC.e');
    expect(result?.decimals).toBe(6);
  });

  it('returns undefined for unknown token address', () => {
    const unknownAddress = UNKNOWN_TOKEN_ADDRESS;
    const result = getTokenDetails(unknownAddress, GNOSIS_TOKEN_CONFIG);
    expect(result).toBeUndefined();
  });

  it('finds OLAS by address on Polygon', () => {
    const olasAddress = POLYGON_TOKEN_CONFIG.OLAS!.address!;
    const result = getTokenDetails(
      olasAddress as Address,
      POLYGON_TOKEN_CONFIG,
    );
    expect(result?.symbol).toBe('OLAS');
  });
});

describe('getTokenDecimal', () => {
  it('returns decimals for AddressZero (native)', () => {
    expect(getTokenDecimal(AddressZero, GNOSIS_TOKEN_CONFIG)).toBe(18);
  });

  it('returns 6 for USDC.e on Gnosis', () => {
    const usdceAddress = GNOSIS_TOKEN_CONFIG['USDC.e']!.address!;
    expect(getTokenDecimal(usdceAddress as Address, GNOSIS_TOKEN_CONFIG)).toBe(
      6,
    );
  });

  it('returns undefined for unknown address', () => {
    const unknownAddress = UNKNOWN_TOKEN_ADDRESS;
    expect(
      getTokenDecimal(unknownAddress, GNOSIS_TOKEN_CONFIG),
    ).toBeUndefined();
  });
});

describe('getFromToken', () => {
  it('returns AddressZero for AddressZero (native gas passthrough)', () => {
    const result = getFromToken(
      AddressZero,
      ETHEREUM_TOKEN_CONFIG,
      GNOSIS_TOKEN_CONFIG,
    );
    expect(result).toBe(AddressZero);
  });

  it('resolves same-symbol token (OLAS on Gnosis → OLAS on Ethereum)', () => {
    const gnosisOlasAddress = GNOSIS_TOKEN_CONFIG.OLAS!.address! as Address;
    const ethereumOlasAddress = ETHEREUM_TOKEN_CONFIG.OLAS!.address! as Address;

    const result = getFromToken(
      gnosisOlasAddress,
      ETHEREUM_TOKEN_CONFIG,
      GNOSIS_TOKEN_CONFIG,
    );
    expect(result).toBe(ethereumOlasAddress);
  });

  it('resolves bridged token (USDC.e on Gnosis → USDC on Ethereum)', () => {
    const gnosisUsdceAddress = GNOSIS_TOKEN_CONFIG['USDC.e']!
      .address! as Address;
    const ethereumUsdcAddress = ETHEREUM_TOKEN_CONFIG.USDC!.address! as Address;

    const result = getFromToken(
      gnosisUsdceAddress,
      ETHEREUM_TOKEN_CONFIG,
      GNOSIS_TOKEN_CONFIG,
    );
    expect(result).toBe(ethereumUsdcAddress);
  });

  it('resolves USDC.e on Polygon → USDC on Ethereum', () => {
    const polygonUsdceAddress = POLYGON_TOKEN_CONFIG['USDC.e']!
      .address! as Address;
    const ethereumUsdcAddress = ETHEREUM_TOKEN_CONFIG.USDC!.address! as Address;

    const result = getFromToken(
      polygonUsdceAddress,
      ETHEREUM_TOKEN_CONFIG,
      POLYGON_TOKEN_CONFIG,
    );
    expect(result).toBe(ethereumUsdcAddress);
  });

  it('throws when destination token address is not found in destination chain config', () => {
    const unknownAddress = UNKNOWN_TOKEN_ADDRESS;

    expect(() =>
      getFromToken(unknownAddress, ETHEREUM_TOKEN_CONFIG, GNOSIS_TOKEN_CONFIG),
    ).toThrow(
      `Failed to get token symbol for the destination token: ${unknownAddress}`,
    );
  });

  it('throws when source token is not found on source chain', () => {
    // We need a token that exists on destination but NOT on source
    const usdcAddress = ETHEREUM_TOKEN_CONFIG.USDC!.address!;
    const destinationConfig: ChainTokenConfig = {
      USDC: {
        address: usdcAddress,
        decimals: 6,
        tokenType: TokenType.Erc20,
        symbol: 'USDC' as const,
      },
    };
    const sourceConfig: ChainTokenConfig = {}; // Source has no USDC token

    expect(() =>
      getFromToken(usdcAddress as Address, sourceConfig, destinationConfig),
    ).toThrow(
      `Failed to get source token for the destination token: ${usdcAddress}`,
    );
  });
});
