import {
  AGENT_SERVER_URL,
  CONTENT_TYPE_JSON_UTF8,
  EvmChainId,
  EvmChainIdMap,
  StakingProgramId,
} from '@/constants';
import {
  Address,
  ConnectSessionResponse,
  ConnectSessionResult,
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types';

import { StakedAgentService } from './shared-services/StakedAgentService';

/**
 * Connect agent service.
 *
 * Connect runs with `staking_program_id: 'no_staking'`, so none of the staking
 * methods below are ever invoked at runtime — the `'no_staking'` guards in
 * `StakingContractDetailsProvider` / `RewardProvider` short-circuit before the
 * call. They exist only to satisfy the `StakedAgentService` contract and the
 * `serviceApi` union in `AgentConfig`.
 *
 * @warning DO NOT STORE STATE IN THIS CLASS. It is a singleton shared across
 * the application.
 */
export abstract class ConnectService extends StakedAgentService {
  static getAgentStakingRewardsInfo = async (_args: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    chainId?: EvmChainId;
  }): Promise<StakingRewardsInfo | undefined> => {
    // no_staking: Connect never stakes, so there are no rewards to report.
    return undefined;
  };

  static getAvailableRewardsForEpoch = async (
    _stakingProgramId: StakingProgramId,
    _chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<bigint | undefined> => {
    return undefined;
  };

  static getServiceStakingDetails = async (
    _serviceNftTokenId: number,
    _stakingProgramId: StakingProgramId,
    _chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<ServiceStakingDetails> => {
    // Never called for no_staking (query is disabled upstream).
    throw new Error('Connect agent does not support staking (no_staking).');
  };

  static getStakingContractDetails = async (
    _stakingProgramId: StakingProgramId,
    _chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<StakingContractDetails | undefined> => {
    return undefined;
  };

  /**
   * Launch (or re-launch) the local Claude Code session via the running agent's
   * local server (`POST /session`). Only meaningful once the Connect service is
   * deployed and its local server is up.
   *
   * Never throws: a response that reaches us (2xx or 4xx/503) is returned as
   * `{ reachable: true, ok, launched, error? }`; a transport/abort error becomes
   * `{ reachable: false }` so the caller can render the retry / install UI.
   * `ok` carries the HTTP 2xx flag so the caller can keep non-2xx responses
   * (unknown harness / not-ready / malformed) out of the "not installed" state.
   */
  static startSession = async (
    signal?: AbortSignal,
  ): Promise<ConnectSessionResult> => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/session`, {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        signal,
      });
      const body = (await response
        .json()
        .catch(() => ({}))) as ConnectSessionResponse;

      return {
        reachable: true,
        ok: response.ok,
        launched: Boolean(body.launched),
        // 200 failures carry `error`; 4xx/5xx HTTPExceptions carry `detail`.
        error: body.error ?? body.detail,
      };
    } catch {
      // Network/abort error — the server may be starting up; retryable.
      return { reachable: false };
    }
  };
}
