import { Flex, Skeleton, Typography } from 'antd';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import {
  AgentSetupCompleteModal,
  BackButton,
  CardFlex,
  cardStyles,
  TransferCompletedModal,
} from '@/components/ui';
import { MiddlewareChain } from '@/constants';
import { useFundingRun } from '@/hooks/useFundingRun';
import { Address } from '@/types/Address';
import {
  CreateFundingRunRequest,
  FundingRun,
  FundingRunMode,
} from '@/types/FundingRun';

import { TITLES } from './constants';
import { FundingProgress } from './FundingProgress';
import { QuoteAndDeposit } from './QuoteAndDeposit';
import { RequestChainOrToken } from './RequestChainOrToken';
import { SelectSourceChain } from './SelectSourceChain';
import { SelectSourceToken } from './SelectSourceToken';
import { SelectionRow } from './styles';
import { ToReceiveItem, ToReceiveSummary } from './ToReceiveSummary';
import {
  acknowledgeRun,
  getChainImage,
  getChainName,
  getTokenImage,
  getTokenMeta,
  isRunEditable,
  isRunProcessing,
  resolveDisplayedRun,
} from './utils';

const { Title } = Typography;

type Selection = { chain: MiddlewareChain; token: Address };

type SelectionStep = 'chain' | 'token' | 'request-chain' | 'request-token';

type ModeProps =
  | { mode: 'onboard'; serviceConfigId?: string; backupOwner?: Address }
  | {
      mode: 'deposit';
      /** Target balances in base units, keyed by token address. */
      depositAmounts: Record<Address, string>;
    }
  | { mode: 'signer_gas' };

export type FundingFlowProps = ModeProps & {
  /** The chain the funds must end up on. */
  destinationChain: MiddlewareChain;
  onBack: () => void;
  /** "Go to Pearl Wallet" on a completed deposit or signer-gas run. */
  onTransferCompleted?: () => void;
  /** The entry point's requirement, shown as "To receive" before a run exists. */
  fallbackToReceive?: ToReceiveItem[];
};

const buildCreateRequest = (
  props: FundingFlowProps,
  { chain, token }: Selection,
): CreateFundingRunRequest => {
  const base = {
    mode: props.mode,
    source: { chain, token },
    destination: { chain: props.destinationChain },
  };
  switch (props.mode) {
    case 'onboard':
      return {
        ...base,
        service_config_id: props.serviceConfigId,
        backup_owner: props.backupOwner,
      };
    case 'deposit':
      return { ...base, deposit_amounts: props.depositAmounts };
    default:
      return base;
  }
};

const getTitle = (run: FundingRun | null, mode: FundingRunMode) =>
  run && isRunProcessing(run)
    ? TITLES[run.mode].processing
    : TITLES[run?.mode ?? mode].selecting;

/**
 * The one-transaction funding flow: pick a source chain and token, send one
 * transfer to the Pearl Signer, then watch Pearl bridge and swap it. The
 * screen is derived from the middleware's funding run, so reopening any
 * entry point resumes the live run.
 */
export const FundingFlow = (props: FundingFlowProps) => {
  const { mode, destinationChain, onBack, onTransferCompleted } = props;
  const {
    activeRun,
    isActiveRunFetched,
    sources,
    isSourcesLoading,
    isSourcesError,
    refetchSources,
    createMutation,
    refreshQuoteMutation,
    retryMutation,
  } = useFundingRun();

  const seenLiveRunIds = useRef(new Set<string>());
  if (activeRun && activeRun.status !== 'COMPLETED') {
    seenLiveRunIds.current.add(activeRun.id);
  }
  const run = resolveDisplayedRun(activeRun, mode, seenLiveRunIds.current);

  const [step, setStep] = useState<SelectionStep | null>(null);
  const [selectedChain, setSelectedChain] = useState<MiddlewareChain | null>(
    null,
  );
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(
    null,
  );

  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const handleGoToPearlWallet = (runId: string) => {
    acknowledgeRun(runId);
    rerender();
    onTransferCompleted?.();
  };

  // Leaving the screen acknowledges a completed run, so it is not replayed.
  const completedRunId = run?.status === 'COMPLETED' ? run.id : null;
  useEffect(
    () => () => {
      if (completedRunId) acknowledgeRun(completedRunId);
    },
    [completedRunId],
  );

  const create = (selection: Selection) => {
    setPendingSelection(selection);
    setStep(null);
    createMutation.mutate(buildCreateRequest(props, selection));
  };

  const handleSelectChain = useCallback((chain: MiddlewareChain) => {
    setSelectedChain(chain);
    setStep('token');
  }, []);

  const canCreate = mode !== 'onboard' || !!props.serviceConfigId;
  const editable = !run || isRunEditable(run);
  const currentStep: SelectionStep | 'quote' =
    step ?? (run || pendingSelection ? 'quote' : 'chain');
  const tokenStepChain = selectedChain ?? run?.source.chain ?? null;

  const renderSelection = () => {
    switch (currentStep) {
      case 'request-chain':
        return (
          <RequestChainOrToken kind="chain" onDone={() => setStep('chain')} />
        );
      case 'request-token':
        return tokenStepChain ? (
          <RequestChainOrToken
            kind="token"
            contextChain={tokenStepChain}
            onDone={() => setStep('token')}
          />
        ) : null;
      case 'token':
        return tokenStepChain ? (
          <>
            <SelectionRow
              label="Chain"
              icon={getChainImage(tokenStepChain)}
              value={getChainName(tokenStepChain)}
              onChange={() => setStep('chain')}
            />
            <SelectSourceToken
              chain={tokenStepChain}
              tokens={sources?.[tokenStepChain] ?? []}
              disabled={!canCreate}
              onSelect={(token) => create({ chain: tokenStepChain, token })}
              onOther={() => setStep('request-token')}
            />
          </>
        ) : null;
      default:
        return (
          <SelectSourceChain
            sources={sources}
            isLoading={isSourcesLoading}
            isError={isSourcesError}
            onRetry={refetchSources}
            onSelect={handleSelectChain}
            onOther={() => setStep('request-chain')}
          />
        );
    }
  };

  const renderRun = () => {
    // While a create is pending or has failed, the new selection is what counts.
    const isCreateUnresolved =
      createMutation.isPending || createMutation.isError;
    const selection: Selection | null =
      run && !isCreateUnresolved
        ? { chain: run.source.chain, token: run.source.token }
        : pendingSelection;
    if (!selection) return null;
    const tokenSymbol =
      getTokenMeta(selection.chain, selection.token)?.symbol ??
      run?.source.symbol ??
      '';
    const onChangeChain = editable ? () => setStep('chain') : undefined;
    const onChangeToken = editable
      ? () => {
          setSelectedChain(selection.chain);
          setStep('token');
        }
      : undefined;

    return (
      <>
        <SelectionRow
          label="Chain"
          icon={getChainImage(selection.chain)}
          value={getChainName(selection.chain)}
          onChange={onChangeChain}
        />
        <SelectionRow
          label="Token"
          icon={getTokenImage(tokenSymbol)}
          value={tokenSymbol}
          onChange={onChangeToken}
        />
        {run && !editable ? (
          <FundingProgress
            run={run}
            onRetry={() => retryMutation.mutate(run.id)}
            isRetrying={retryMutation.isPending}
          />
        ) : (
          <QuoteAndDeposit
            run={isCreateUnresolved ? null : run}
            isCreateError={createMutation.isError}
            onRetryCreate={() => pendingSelection && create(pendingSelection)}
            onRefreshQuote={() => run && refreshQuoteMutation.mutate(run.id)}
            isRefreshing={refreshQuoteMutation.isPending}
          />
        )}
      </>
    );
  };

  const renderBody = () => {
    if (!isActiveRunFetched) {
      return (
        <Flex className="p-24">
          <Skeleton active />
        </Flex>
      );
    }
    if (run && !editable) return renderRun();
    return currentStep === 'quote' ? renderRun() : renderSelection();
  };

  return (
    <Flex vertical gap={16} style={cardStyles}>
      <Flex vertical gap={12}>
        <BackButton onPrev={onBack} />
        <Title level={3} className="m-0">
          {getTitle(run, mode)}
        </Title>
      </Flex>
      <CardFlex $noBorder $noBodyPadding>
        {renderBody()}
      </CardFlex>
      <ToReceiveSummary
        toReceive={run?.to_receive}
        destinationChain={run?.destination.chain ?? destinationChain}
        fallback={props.fallbackToReceive}
      />
      {run?.status === 'COMPLETED' &&
        (run.mode === 'onboard' ? (
          <AgentSetupCompleteModal />
        ) : (
          <TransferCompletedModal
            onGoToPearlWallet={() => handleGoToPearlWallet(run.id)}
          />
        ))}
    </Flex>
  );
};
