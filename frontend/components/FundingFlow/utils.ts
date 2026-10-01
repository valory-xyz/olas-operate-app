import { isNil } from 'lodash';

import {
  ALL_TOKEN_CONFIG,
  TokenSymbol,
  TokenSymbolConfigMap,
  TokenType,
} from '@/config/tokens';
import { AddressZero, CHAIN_IMAGE_MAP, MiddlewareChain } from '@/constants';
import { Address } from '@/types/Address';
import {
  FundingRun,
  FundingRunMode,
  FundingRunStatus,
  FundingRunStep,
} from '@/types/FundingRun';
import { areAddressesEqual } from '@/utils/address';
import { asAllEvmChainId, asEvmChainDetails } from '@/utils/middlewareHelpers';
import { formatAmount, formatUnits } from '@/utils/numberFormatters';

import { STEP_COPY } from './constants';

type TokenMeta = { symbol: string; decimals: number };

const tryAllEvmChainId = (chain: MiddlewareChain) => {
  try {
    return asAllEvmChainId(chain);
  } catch {
    return null;
  }
};

export const getChainName = (chain: MiddlewareChain) => {
  try {
    return asEvmChainDetails(chain).displayName;
  } catch {
    return chain;
  }
};

const getChainNativeSymbol = (chain: MiddlewareChain) => {
  try {
    return asEvmChainDetails(chain).symbol;
  } catch {
    return '';
  }
};

export const getChainImage = (chain: MiddlewareChain): string | undefined => {
  const chainId = tryAllEvmChainId(chain);
  return isNil(chainId)
    ? undefined
    : CHAIN_IMAGE_MAP[chainId as keyof typeof CHAIN_IMAGE_MAP];
};

export const getTokenImage = (symbol: string): string | undefined => {
  const key = (Object.keys(TokenSymbolConfigMap) as TokenSymbol[]).find(
    (tokenSymbol) => tokenSymbol.toLowerCase() === symbol.toLowerCase(),
  );
  return key ? TokenSymbolConfigMap[key].image : undefined;
};

/** Symbol and decimals of a token address on a chain, or `null` if unknown to the app. */
export const getTokenMeta = (
  chain: MiddlewareChain,
  token: Address,
): TokenMeta | null => {
  const chainId = tryAllEvmChainId(chain);
  if (isNil(chainId)) return null;
  const config = Object.values(ALL_TOKEN_CONFIG[chainId] ?? {}).find(
    (tokenConfig) =>
      areAddressesEqual(token, AddressZero)
        ? tokenConfig.tokenType === TokenType.NativeGas
        : !!tokenConfig.address &&
          areAddressesEqual(tokenConfig.address, token),
  );
  return config ? { symbol: config.symbol, decimals: config.decimals } : null;
};

/** Base-unit amount as a two-decimal display string, e.g. "15.00". */
export const formatBaseUnits = (amount: string, decimals: number) =>
  formatAmount(formatUnits(amount, decimals), 2);

type RunPhase = 'editable' | 'processing' | 'completed' | 'cancelled';

const RUN_PHASE: Record<FundingRunStatus, RunPhase> = {
  AWAITING_DEPOSIT: 'editable',
  QUOTE_FAILED: 'editable',
  PROCESSING: 'processing',
  FAILED: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// A status the app does not know yet is shown as a run in progress: it is
// not safe to offer Change on it, nor to start another run over it.
const getRunPhase = (run: FundingRun): RunPhase =>
  RUN_PHASE[run.status] ?? 'processing';

export const isRunEditable = (run: FundingRun) =>
  getRunPhase(run) === 'editable';

export const isRunProcessing = (run: FundingRun) => {
  const phase = getRunPhase(run);
  return phase === 'processing' || phase === 'completed';
};

export const isRunLive = (run: FundingRun) => {
  const phase = getRunPhase(run);
  return phase === 'editable' || phase === 'processing';
};

/**
 * Runs whose success the user has already acknowledged. The middleware keeps
 * returning a completed run for a few minutes; without this, reopening a
 * funding entry point would replay the previous run's success modal.
 */
const acknowledgedRunIds = new Set<string>();

export const acknowledgeRun = (runId: string) => acknowledgedRunIds.add(runId);

export type FundingHost = {
  mode: FundingRunMode;
  destinationChain: MiddlewareChain;
  /** Onboarding only: the service being funded. */
  serviceConfigId?: string;
};

/** A run of the host's mode started for another destination or service, e.g. another agent's onboarding. */
export const isRunForAnotherTarget = (run: FundingRun, host: FundingHost) =>
  run.mode === host.mode &&
  (run.destination.chain !== host.destinationChain ||
    (host.mode === 'onboard' &&
      !!run.service_config_id &&
      run.service_config_id !== host.serviceConfigId));

/** A run this host started, or could have: its mode and target. */
export const isRunForHost = (run: FundingRun, host: FundingHost) =>
  run.mode === host.mode && !isRunForAnotherTarget(run, host);

/**
 * Which run, if any, the flow should render.
 * - A live run is always shown, whatever mode or target started it: one run
 *   at a time. One that is not this host's is shown read-only, with Cancel.
 * - A completed run is shown if it was seen live in this session, or if it is
 *   this host's onboarding run reopened in onboarding (resume after a restart).
 *   Another target's completed run never is, so one agent's onboarding never
 *   shows another agent's success.
 */
export const resolveDisplayedRun = (
  run: FundingRun | null,
  host: FundingHost,
  seenLiveRunIds: ReadonlySet<string>,
): FundingRun | null => {
  if (!run) return null;
  const phase = getRunPhase(run);
  if (phase === 'cancelled') return null;
  if (phase !== 'completed') return run;
  if (acknowledgedRunIds.has(run.id)) return null;
  if (isRunForAnotherTarget(run, host)) return null;
  if (seenLiveRunIds.has(run.id)) return run;
  return run.mode === 'onboard' && host.mode === 'onboard' ? run : null;
};

/** Visible steps the app has copy for. The Safe/transfer and delegation-clearing steps never render. */
const getVisibleSteps = (run: FundingRun) =>
  run.steps.filter((step) => step.visible && !!STEP_COPY[step.kind]);

/**
 * The step a failure is reported on. A hidden step's failure (the Safe step)
 * surfaces on the last visible step, so banner and row always agree.
 */
export const getFailedStep = (run: FundingRun): FundingRunStep | null => {
  if (run.status !== 'FAILED' || !run.error) return null;
  const visibleSteps = getVisibleSteps(run);
  return (
    visibleSteps.find((step) => step.id === run.error?.step_id) ??
    visibleSteps[visibleSteps.length - 1] ??
    null
  );
};

/**
 * The step the banner names while processing: the visible step in progress,
 * or the last visible step while a hidden step finishes the run.
 */
export const getCurrentStep = (run: FundingRun): FundingRunStep | null => {
  const visibleSteps = getVisibleSteps(run);
  return (
    visibleSteps.find((step) => step.status === 'PROCESSING') ??
    visibleSteps.find((step) => step.status === 'PENDING') ??
    visibleSteps[visibleSteps.length - 1] ??
    null
  );
};

export const getLogSteps = (
  run: FundingRun,
  failedStep: FundingRunStep | null,
) =>
  getVisibleSteps(run)
    .filter((step) => step.status === 'DONE' && step.id !== failedStep?.id)
    .sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0));

/** Token symbol and decimals for a step: the receipt is in the source token. */
const getStepToken = (
  run: FundingRun,
  step: FundingRunStep,
): TokenMeta | null => {
  if (step.kind === 'RECEIVE') {
    return { symbol: run.source.symbol, decimals: run.source.decimals };
  }
  if (!step.token) return null;
  return getTokenMeta(run.destination.chain, step.token);
};

export type StepTextVariant = 'inProgress' | 'done' | 'failed';

export const getStepText = (
  run: FundingRun,
  step: FundingRunStep,
  variant: StepTextVariant,
) => {
  const copy = STEP_COPY[step.kind];
  if (!copy) return '';
  const token = getStepToken(run, step);
  const symbol = token?.symbol ?? '';
  const quantity =
    token && step.amount
      ? `${formatBaseUnits(step.amount, token.decimals)} ${token.symbol}`
      : symbol;
  return copy[variant]({
    mode: run.mode,
    quantity,
    symbol,
    chainName: getChainName(run.destination.chain),
    nativeSymbol: getChainNativeSymbol(run.destination.chain),
  });
};
