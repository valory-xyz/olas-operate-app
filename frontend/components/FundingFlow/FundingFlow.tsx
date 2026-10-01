import { Button, Flex, Skeleton, Typography } from 'antd';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import {
  AgentSetupCompleteModal,
  BackButton,
  CardFlex,
  cardStyles,
  TransferCompletedModal,
} from '@/components/ui';
import { MiddlewareChain } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useFundingRun } from '@/hooks/useFundingRun';
import { Address } from '@/types/Address';
import {
  CreateFundingRunRequest,
  FundingRun,
  FundingRunMode,
} from '@/types/FundingRun';

import {
  ACTIVE_RUN_ERROR,
  CANCEL_FAILED,
  CONNECTION_LOST,
  NO_DEPOSIT_AMOUNTS,
  TITLES,
} from './constants';
import { FundingProgress } from './FundingProgress';
import { QuoteAndDeposit } from './QuoteAndDeposit';
import { RequestChainOrToken } from './RequestChainOrToken';
import { SelectSourceChain } from './SelectSourceChain';
import { SelectSourceToken } from './SelectSourceToken';
import { Banner, CardRow, SelectionRow } from './styles';
import { ToReceiveItem, ToReceiveSummary } from './ToReceiveSummary';
import {
  acknowledgeRun,
  getChainImage,
  getChainName,
  getTokenImage,
  getTokenMeta,
  isRunEditable,
  isRunLive,
  isRunProcessing,
  resolveDisplayedRun,
} from './utils';

const { Text, Title } = Typography;

type Selection = { chain: MiddlewareChain; token: Address };

type SelectionStep = 'chain' | 'token' | 'request-chain' | 'request-token';

type ModeProps =
  | { mode: 'onboard'; serviceConfigId: string; backupOwner?: Address }
  | {
      mode: 'deposit';
      /** Target balances in base units, keyed by token address. */
      depositAmounts: Record<Address, string>;
    }
  | { mode: 'signer_gas' };

export type FundingFlowProps = ModeProps & {
  destinationChain: MiddlewareChain;
  onBack: () => void;
  /** A persistent exit to the Pearl Wallet, for hosts opened from it. */
  onBackToPearlWallet?: () => void;
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
    source: { chain, token },
    destination: { chain: props.destinationChain },
  };
  switch (props.mode) {
    case 'onboard':
      return {
        ...base,
        mode: props.mode,
        service_config_id: props.serviceConfigId,
        backup_owner: props.backupOwner,
      };
    case 'deposit':
      return {
        ...base,
        mode: props.mode,
        deposit_amounts: props.depositAmounts,
      };
    case 'signer_gas':
      return { ...base, mode: props.mode };
  }
};

const getTitle = (run: FundingRun | null, mode: FundingRunMode) =>
  run && isRunProcessing(run)
    ? TITLES[run.mode].processing
    : TITLES[run?.mode ?? mode].selecting;

/** One transfer from any supported source, rendered from the middleware's funding run. */
export const FundingFlow = (props: FundingFlowProps) => {
  const {
    mode,
    destinationChain,
    onBack,
    onBackToPearlWallet,
    onTransferCompleted,
  } = props;
  const {
    activeRun,
    isActiveRunFetched,
    isActiveRunError,
    refetchActiveRun,
    sources,
    isSourcesLoading,
    isSourcesError,
    refetchSources,
    createMutation,
    refreshQuoteMutation,
    retryMutation,
    cancelMutation,
  } = useFundingRun();

  const seenLiveRunIds = useRef(new Set<string>());
  if (activeRun && isRunLive(activeRun)) {
    seenLiveRunIds.current.add(activeRun.id);
  }
  // A run this flow created counts as seen, even if it came back already COMPLETED.
  if (createMutation.data) seenLiveRunIds.current.add(createMutation.data.id);
  const run = resolveDisplayedRun(activeRun, mode, seenLiveRunIds.current);

  const [step, setStep] = useState<SelectionStep | null>(null);
  const [selectedChain, setSelectedChain] = useState<MiddlewareChain | null>(
    null,
  );
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(
    null,
  );

  const message = useMessageApi();
  const showMutationError = (error: Error) => message.error(error.message);

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

  // Requirements poll hourly while no agent runs, so Start and refill state would lag a finished run.
  const { refetch: refetchRequirements } =
    useBalanceAndRefillRequirementsContext();
  const requirementsRefreshedForRunId = useRef<string | null>(null);
  const finishedRunId = activeRun?.status === 'COMPLETED' ? activeRun.id : null;
  useEffect(() => {
    if (
      !finishedRunId ||
      requirementsRefreshedForRunId.current === finishedRunId
    ) {
      return;
    }
    requirementsRefreshedForRunId.current = finishedRunId;
    refetchRequirements();
  }, [finishedRunId, refetchRequirements]);

  const { isError: isCreateError, reset: resetCreateMutation } = createMutation;
  const resetCreate = useCallback(() => {
    resetCreateMutation();
    setPendingSelection(null);
  }, [resetCreateMutation]);

  // A different run replacing a failed create (e.g. the live run behind a 409) spends the error.
  const runIdAtCreate = useRef<string | null>(null);
  const displayedRunId = run?.id;
  useEffect(() => {
    if (
      isCreateError &&
      displayedRunId &&
      displayedRunId !== runIdAtCreate.current
    ) {
      resetCreate();
    }
  }, [displayedRunId, isCreateError, resetCreate]);

  const cancelRun = (runId: string) =>
    cancelMutation.mutate(runId, {
      onSuccess: () => {
        resetCreate();
        setStep(null);
      },
      onError: () => message.error(CANCEL_FAILED),
    });

  const create = (selection: Selection) => {
    runIdAtCreate.current = run?.id ?? null;
    setPendingSelection(selection);
    setStep(null);
    createMutation.mutate(buildCreateRequest(props, selection), {
      onError: showMutationError,
    });
  };

  const handleSelectChain = (chain: MiddlewareChain) => {
    setSelectedChain(chain);
    setStep('token');
  };

  // A run can only be (re)created with this host's own parameters, so another
  // mode's run, or a deposit with no amounts, cannot be changed from here.
  const hasCreateParams =
    props.mode !== 'deposit' || Object.keys(props.depositAmounts).length > 0;
  const canCreate = hasCreateParams && (!run || run.mode === mode);
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
              disabledReason={hasCreateParams ? undefined : NO_DEPOSIT_AMOUNTS}
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
    // While a create is pending, or has failed with no run to fall back on,
    // the new selection is what counts. A run found after a failed create
    // (e.g. the live run behind a 409) is the truth, so it is shown instead.
    const isCreateUnresolved =
      createMutation.isPending || (createMutation.isError && !run);
    const selection: Selection | null =
      run && !isCreateUnresolved
        ? { chain: run.source.chain, token: run.source.token }
        : pendingSelection;
    if (!selection) return null;
    const tokenSymbol =
      getTokenMeta(selection.chain, selection.token)?.symbol ??
      run?.source.symbol ??
      '';
    const canChange = editable && canCreate;
    const onChangeChain = canChange
      ? () => {
          resetCreate();
          setStep('chain');
        }
      : undefined;
    const onChangeToken = canChange
      ? () => {
          resetCreate();
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
            onRetry={() =>
              retryMutation.mutate(run.id, { onError: showMutationError })
            }
            isRetrying={retryMutation.isPending}
            onCancel={() => cancelRun(run.id)}
            isCancelling={cancelMutation.isPending}
          />
        ) : (
          <>
            <QuoteAndDeposit
              run={isCreateUnresolved ? null : run}
              createError={createMutation.error}
              onRetryCreate={() => pendingSelection && create(pendingSelection)}
              onRefreshQuote={() =>
                run &&
                refreshQuoteMutation.mutate(run.id, {
                  onError: showMutationError,
                })
              }
              isRefreshing={refreshQuoteMutation.isPending}
            />
            {run && run.mode !== mode && (
              <CardRow>
                <Button
                  size="small"
                  onClick={() => cancelRun(run.id)}
                  loading={cancelMutation.isPending}
                >
                  Cancel
                </Button>
              </CardRow>
            )}
          </>
        )}
      </>
    );
  };

  const renderBody = () => {
    if (isActiveRunError && !activeRun) {
      return (
        <CardRow vertical gap={8} align="flex-start">
          <Text>{ACTIVE_RUN_ERROR}</Text>
          <Button size="small" onClick={() => refetchActiveRun()}>
            Retry
          </Button>
        </CardRow>
      );
    }
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

  // The last run fetched stays on screen when a poll fails; say it may be stale.
  const isShowingStaleRun = isActiveRunError && !!activeRun;

  return (
    <Flex vertical gap={16} style={cardStyles}>
      <Flex vertical gap={12}>
        <BackButton onPrev={onBack} />
        <Title level={3} className="m-0">
          {getTitle(run, mode)}
        </Title>
      </Flex>
      <CardFlex $noBorder $noBodyPadding>
        {isShowingStaleRun && <Banner tone="error">{CONNECTION_LOST}</Banner>}
        {renderBody()}
      </CardFlex>
      <ToReceiveSummary
        toReceive={run?.to_receive}
        destinationChain={run?.destination.chain ?? destinationChain}
        fallback={props.fallbackToReceive}
      />
      {onBackToPearlWallet && (
        <Button size="large" onClick={onBackToPearlWallet}>
          Back to Pearl Wallet
        </Button>
      )}
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
