import { parseUnits } from 'ethers/lib/utils';

import {
  Erc20TokenConfig,
  TOKEN_CONFIG,
  TokenSymbol,
  TokenSymbolMap,
  TokenType,
  WrappedTokenConfig,
} from '@/config/tokens';
import { EvmChainId, EvmChainIdMap } from '@/constants/chains';
import { Address } from '@/types/Address';
import {
  FundsMovement,
  TransactionHistoryResponse,
} from '@/types/TransactionHistory';

const MASTER_EOA = '0x1234567890aBcdef1234567890ABcDeF12345678' as Address;
const AGENT_SAFE = '0x2222222222222222222222222222222222222222' as Address;
const AGENT_EOA = '0x1111111111111111111111111111111111111111' as Address;
const STAKING_PROXY = '0x3333333333333333333333333333333333333333' as Address;
const EXTERNAL_ADDRESS =
  '0xcccccccccccccccccccccccccccccccccccccccc' as Address;

const SERVICE_REF = { id: '12345', agentIds: [25] };
const AGENT_SAFE_REF = { id: AGENT_SAFE, service: SERVICE_REF };

const BASE_TIMESTAMP_S = 1_720_000_000; // ~2024-07-03

const txHash = (n: number): string =>
  `0x${n.toString().padStart(64, '0')}` as const;

type ChainTokens = {
  /** Native gas token address — null sentinel preserved through the subgraph. */
  native: null;
  /** OLAS address on this chain (lowercased for parity with subgraph output). */
  olas: string;
  /** Stablecoin used for agent funding: USDC.e on Gnosis/Optimism/Polygon, USDC on Base/Mode. */
  stable: string;
  stableDecimals: number;
  /** Optional WXDAI on Gnosis (used for the multi-token withdrawal example). */
  wrappedNative: string | null;
};

const isErc20OrWrapped = (
  config: unknown,
): config is Erc20TokenConfig | WrappedTokenConfig =>
  !!config &&
  typeof config === 'object' &&
  'tokenType' in config &&
  (config.tokenType === TokenType.Erc20 ||
    config.tokenType === TokenType.Wrapped);

const getAddressForSymbol = (
  chainId: EvmChainId,
  symbol: TokenSymbol,
): string | null => {
  const cfg = TOKEN_CONFIG[chainId]?.[symbol];
  return isErc20OrWrapped(cfg) ? cfg.address.toLowerCase() : null;
};

const getDecimalsForSymbol = (
  chainId: EvmChainId,
  symbol: TokenSymbol,
): number => TOKEN_CONFIG[chainId]?.[symbol]?.decimals ?? 18;

const getChainTokens = (chainId: EvmChainId): ChainTokens => {
  const olas = getAddressForSymbol(chainId, TokenSymbolMap.OLAS) ?? '0x';
  const usdcE = getAddressForSymbol(chainId, TokenSymbolMap['USDC.e']);
  const usdc = getAddressForSymbol(chainId, TokenSymbolMap.USDC);
  const stable = usdcE ?? usdc ?? olas;
  const stableSymbol: TokenSymbol = usdcE
    ? TokenSymbolMap['USDC.e']
    : usdc
      ? TokenSymbolMap.USDC
      : TokenSymbolMap.OLAS;
  const wrappedNative =
    chainId === EvmChainIdMap.Gnosis
      ? getAddressForSymbol(chainId, TokenSymbolMap.WXDAI)
      : null;
  return {
    native: null,
    olas,
    stable,
    stableDecimals: getDecimalsForSymbol(chainId, stableSymbol),
    wrappedNative,
  };
};

const e18 = (humanReadable: string): string =>
  parseUnits(humanReadable, 18).toString();

const e = (humanReadable: string, decimals: number): string =>
  parseUnits(humanReadable, decimals).toString();

const baseFundsMovement = (
  partial: Omit<FundsMovement, 'agentSafe'> & {
    agentSafe?: FundsMovement['agentSafe'];
  },
): FundsMovement => ({
  agentSafe: partial.agentSafe ?? null,
  ...partial,
});

/**
 * Per VLOP-73 design (Figma node 17758:73120) — fixture mirrors the reference
 * row set. Token addresses + decimals adapt to the chain the wallet is viewing,
 * so amounts render correctly on Gnosis, Polygon, Optimism, and Base alike.
 *
 * Replace this with the live `pearl-transactions` subgraph once it deploys.
 */
export const TRANSACTION_HISTORY_FIXTURE = (
  masterSafe: Address,
  chainId: EvmChainId = EvmChainIdMap.Gnosis,
): TransactionHistoryResponse => {
  const tokens = getChainTokens(chainId);
  const lowerSafe = masterSafe.toLowerCase();
  const t = (offset: number) => `${BASE_TIMESTAMP_S + offset}`;

  let nonce = 0;
  const movementId = (tx: string) => `${tx}-${nonce++}`;

  const tx1 = txHash(1);
  const tx2 = txHash(2);
  const tx3 = txHash(3);
  const tx4 = txHash(4);
  const tx5 = txHash(5);
  const tx6 = txHash(6);
  const tx7 = txHash(7);
  const tx8 = txHash(8);
  const tx9 = txHash(9);
  const tx10 = txHash(10);
  const tx11 = txHash(11);
  const tx12 = txHash(12);

  // Multi-token "Withdraw to external wallet" — stablecoin + native + OLAS.
  // Includes wrappedNative only on Gnosis (matches the design exactly there);
  // omits it on other chains so we don't fabricate non-existent tokens.
  const externalWithdrawal: FundsMovement[] = [
    baseFundsMovement({
      id: movementId(tx1),
      category: 'MASTER_WITHDRAWAL',
      source: 'RAW_TRANSFER',
      token: tokens.stable,
      amount: e('3.25', tokens.stableDecimals),
      from: lowerSafe,
      to: EXTERNAL_ADDRESS,
      blockTimestamp: t(11_000),
      transactionHash: tx1,
    }),
    baseFundsMovement({
      id: movementId(tx1),
      category: 'MASTER_WITHDRAWAL',
      source: 'RAW_TRANSFER',
      token: tokens.native,
      amount: e18('23.15'),
      from: lowerSafe,
      to: EXTERNAL_ADDRESS,
      blockTimestamp: t(11_000),
      transactionHash: tx1,
    }),
    baseFundsMovement({
      id: movementId(tx1),
      category: 'MASTER_WITHDRAWAL',
      source: 'RAW_TRANSFER',
      token: tokens.olas,
      amount: e18('5255.87'),
      from: lowerSafe,
      to: EXTERNAL_ADDRESS,
      blockTimestamp: t(11_000),
      transactionHash: tx1,
    }),
  ];
  if (tokens.wrappedNative) {
    externalWithdrawal.push(
      baseFundsMovement({
        id: movementId(tx1),
        category: 'MASTER_WITHDRAWAL',
        source: 'RAW_TRANSFER',
        token: tokens.wrappedNative,
        amount: e18('6.53'),
        from: lowerSafe,
        to: EXTERNAL_ADDRESS,
        blockTimestamp: t(11_000),
        transactionHash: tx1,
      }),
    );
  }

  const agentWithdrawal: FundsMovement[] = [
    baseFundsMovement({
      id: movementId(tx2),
      category: 'AGENT_TO_MASTER',
      source: 'RAW_TRANSFER',
      token: tokens.olas,
      amount: e18('182.42'),
      from: AGENT_SAFE,
      to: lowerSafe,
      blockTimestamp: t(10_000),
      transactionHash: tx2,
      agentSafe: AGENT_SAFE_REF,
    }),
    baseFundsMovement({
      id: movementId(tx2),
      category: 'AGENT_TO_MASTER',
      source: 'RAW_TRANSFER',
      token: tokens.native,
      amount: e18('6.25'),
      from: AGENT_SAFE,
      to: lowerSafe,
      blockTimestamp: t(10_000),
      transactionHash: tx2,
      agentSafe: AGENT_SAFE_REF,
    }),
  ];
  if (tokens.wrappedNative) {
    agentWithdrawal.push(
      baseFundsMovement({
        id: movementId(tx2),
        category: 'AGENT_TO_MASTER',
        source: 'RAW_TRANSFER',
        token: tokens.wrappedNative,
        amount: e18('3.25'),
        from: AGENT_SAFE,
        to: lowerSafe,
        blockTimestamp: t(10_000),
        transactionHash: tx2,
        agentSafe: AGENT_SAFE_REF,
      }),
    );
  }

  const fundingTransfer = (
    txId: string,
    timestampOffset: number,
  ): FundsMovement => ({
    id: `${txId}-0`,
    category: 'MASTER_TO_AGENT',
    source: 'RAW_TRANSFER',
    token: tokens.stable,
    amount: e('5', tokens.stableDecimals),
    from: lowerSafe,
    to: AGENT_SAFE,
    blockTimestamp: t(timestampOffset),
    transactionHash: txId,
    agentSafe: AGENT_SAFE_REF,
  });

  const fundingEvent = (txId: string, timestampOffset: number) => ({
    id: `${txId}-${lowerSafe}-${SERVICE_REF.id}`,
    txHash: txId,
    blockTimestamp: t(timestampOffset),
    totalNativeAmount: '0',
    totalOlasAmount: '0',
    agentSafe: AGENT_SAFE_REF,
    transfers: [fundingTransfer(txId, timestampOffset)],
  });

  return {
    masterSafe: {
      id: lowerSafe,
      masterEoa: MASTER_EOA.toLowerCase(),
      owners: [MASTER_EOA.toLowerCase()],
      threshold: '1',
    },
    fundsMovements: [
      ...externalWithdrawal,
      ...agentWithdrawal,
      // Unstake — Rev. 2 schema emits SERVICE_BOND_REFUND twice (terminate +
      // unbond). Frontend groups by (txHash, category) so these collapse
      // into a single "<agent> unstake" UI row with two transfers.
      baseFundsMovement({
        id: movementId(tx3),
        category: 'SERVICE_BOND_REFUND',
        source: 'SEMANTIC',
        bondType: 'SECURITY_DEPOSIT',
        token: tokens.olas,
        amount: e18('2500'),
        from: lowerSafe,
        to: lowerSafe,
        blockTimestamp: t(9_000),
        transactionHash: tx3,
        agentSafe: AGENT_SAFE_REF,
      }),
      baseFundsMovement({
        id: movementId(tx3),
        category: 'SERVICE_BOND_REFUND',
        source: 'SEMANTIC',
        bondType: 'AGENT_BOND',
        token: tokens.olas,
        amount: e18('2500'),
        from: lowerSafe,
        to: lowerSafe,
        blockTimestamp: t(9_000),
        transactionHash: tx3,
        agentSafe: AGENT_SAFE_REF,
      }),
      // Stake — Rev. 2 schema emits SERVICE_BOND_DEPOSIT twice (activate +
      // register). Collapses to a single "<agent> stake" UI row.
      baseFundsMovement({
        id: movementId(tx4),
        category: 'SERVICE_BOND_DEPOSIT',
        source: 'SEMANTIC',
        bondType: 'SECURITY_DEPOSIT',
        token: tokens.olas,
        amount: e18('2500'),
        from: lowerSafe,
        to: STAKING_PROXY,
        blockTimestamp: t(8_000),
        transactionHash: tx4,
        agentSafe: AGENT_SAFE_REF,
      }),
      baseFundsMovement({
        id: movementId(tx4),
        category: 'SERVICE_BOND_DEPOSIT',
        source: 'SEMANTIC',
        bondType: 'AGENT_BOND',
        token: tokens.olas,
        amount: e18('2500'),
        from: lowerSafe,
        to: STAKING_PROXY,
        blockTimestamp: t(8_000),
        transactionHash: tx4,
        agentSafe: AGENT_SAFE_REF,
      }),
      baseFundsMovement({
        id: movementId(tx8),
        category: 'MASTER_TO_AGENT',
        source: 'RAW_TRANSFER',
        token: tokens.native,
        amount: e18('2'),
        from: lowerSafe,
        to: AGENT_EOA,
        blockTimestamp: t(4_000),
        transactionHash: tx8,
        agentSafe: AGENT_SAFE_REF,
      }),
      baseFundsMovement({
        id: movementId(tx9),
        category: 'MASTER_FUNDING_IN',
        source: 'RAW_TRANSFER',
        token: tokens.native,
        amount: e18('10'),
        from: MASTER_EOA,
        to: lowerSafe,
        blockTimestamp: t(3_000),
        transactionHash: tx9,
      }),
      baseFundsMovement({
        id: movementId(tx10),
        category: 'MASTER_FUNDING_IN',
        source: 'RAW_TRANSFER',
        token: tokens.native,
        amount: e18('10'),
        from: MASTER_EOA,
        to: lowerSafe,
        blockTimestamp: t(2_000),
        transactionHash: tx10,
      }),
      baseFundsMovement({
        id: movementId(tx11),
        category: 'MASTER_FUNDING_IN',
        source: 'RAW_TRANSFER',
        token: tokens.native,
        amount: e18('10'),
        from: MASTER_EOA,
        to: lowerSafe,
        blockTimestamp: t(1_000),
        transactionHash: tx11,
      }),
      baseFundsMovement({
        id: movementId(tx12),
        category: 'SAFE_SETUP_TRANSFER',
        source: 'RAW_TRANSFER',
        token: tokens.native,
        amount: e18('30'),
        from: MASTER_EOA,
        to: lowerSafe,
        blockTimestamp: t(0),
        transactionHash: tx12,
      }),
    ],
    agentFundingEvents: [
      fundingEvent(tx5, 7_000),
      fundingEvent(tx6, 6_000),
      fundingEvent(tx7, 5_000),
    ],
    _meta: {
      block: {
        number: 35_000_000,
        timestamp: BASE_TIMESTAMP_S + 11_000,
      },
      hasIndexingErrors: false,
    },
  };
};
