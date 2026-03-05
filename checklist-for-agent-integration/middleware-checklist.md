1. Introduction
This checklist outlines the steps required to integrate your AI agent with the Pearl platform. Please complete each item and provide the requested information. This document will serve as a tracking tool for both your team and the Pearl development team.

2. Prerequisites
- [ ] The agent is going to be deployed on one of these supported EVM chains: Ethereum, Arbitrum, Base, Celo, Gnosis, Mode, Optimism, Polygon.
- [ ] The agent is well specified, including its activity checker logic.
- [ ] Agent Development Framework: Confirm what framework is used to develop the agent (1 or 2):
  - Regular Open Autonomy Agent: Agent developed with required packages and FSM https://docs.olas.network/open-autonomy/.
  - Olas SDK Agent: External agent integrated into a minimal Open Autonomy agent https://docs.olas.network/olas-sdk/.
- [ ] The Agent is completed and tested locally. The business logic works as expected (self-reported by developer).
- [ ] The Agent satisfies the agent architecture requirements specified below (this implies the agent will be registered as an “autonomous service” in the Olas Registry(https://marketplace.olas.network/ethereum/ai-agents) and have an on-chain safe).
- [ ] All dev packages have been pushed to via the autonomy push-all command.
  - IPFS Hash: [Fill-in the IPFS Hash]
- [ ] All agent components (excluding service components) have been minted on the Olas Registry (https://marketplace.olas.network/ethereum/ai-agents).
- [ ] Staking contract and activity checker are deployed

3. Agent architecture requirements
- [ ] Agent uses the directory specified by the environment variable STORE_PATH to store persistent data managed by itself.
  - [ ] Agent saves data periodically and recovers state after a SIGKILL signal.
- [ ] Keys:
  - [ ] Agent reads the file ethereum_private_key.txt from its working directory, which contains the Agent EOA private key.
  - [ ] Agent reads the environment variable SAFE_CONTRACT_ADDRESSES which contains the addresses of the Agent Safe in the relevant chains.
- [ ] Agent logs:
  - [ ] Agent produces a log.txt file in its working directory.
  - [ ] Log file follows format [YYYY-MM-DD HH:MM:SS,mmm] [LOG_LEVEL] [agent] Your message.
- [ ] Agent healthcheck interface:
  - [ ] Agent exposes the endpoint at GET http://127.0.0.1:8716/healthcheck.
  - [ ] Healthcheck response should include is_healthy (boolean).
  - [ ] Other healthcheck fields (seconds_since_last_transition, etc.) are still recommended for observability.
- [ ]Agent user interface (optional):
  - [ ] Agent exposes the endpoint at GET http://127.0.0.1:8716/.
  - [ ] Agent handles POST requests for real-time communication if needed.
  - [ ] Endpoints can also return HTML content with appropriate content-type    headers for agent specific UI.
- [ ] Environment variables:
  - [ ] Agent uses standard environment variables set by Pearl where needed (ETHEREUM_LEDGER_RPC, GNOSIS_LEDGER_RPC, BASE_LEDGER_RPC, etc.).
  - [ ] All the used environment variables are specified in the service template JSON with the standard schema
  - [ ] The same environment variables are mentioned in the service.yaml of the service package, and used by the agent with the prefix path where these variables are mentioned. For example: CONNECTION_CONFIGS_CONFIG_<variable_name>
- [ ] Agent source code adheres to robust security standards (e.g., OWASP Developer Guide, CWE Top 25, etc.).
- [ ] Withdrawal (if required, tentative):
  - [ ] Agent handles withdrawal of invested funds to Agent Safe.
  - [ ] Agent works in withdrawal mode by reading the environment variable WITHDRAWAL_MODE = true.
- Architecture requirements specific to Open Autonomy agents
  - [ ] Agent is developed in the current Open Autonomy version used by the Pearl repository and with a Python version that is compatible with the framework.
  - [ ] Agent source code only includes characters within the ASCII printable range (32-126).
  - [ ] The Agent repository passes linter and security tools (Isort, Black, Mypy, Bandit, etc.) commonly used by Open Autonomy agents.

4. Packaging of the agent
  - [ ] The agent repository should have a github workflow to build the executable binaries, triggered on release.
  - [ ] The binaries should be built for all the platforms where Pearl is released, with the naming convention agent_runner_{os_name}_{arch}(.exe). Where .exe suffixes only in case of windows, os_name is one of linux, macos or windows, and arch is one of x64 or arm64 (note: currently only linux x64 is supported).
  - [ ] The binaries should be uploaded to the github action artifacts and should be downloadable from the github release.

5. Integration with Pearl
- [ ] Ensure the github repository of the agent have the following things present:
  - [ ] A packages/packages.json file that contains the service hash. For example: packages.json of the Predict Trader agent (https://github.com/valory-xyz/trader/blob/main/packages/packages.json#L26)
  - [ ] A github workflow that triggers on every release and prepares the agent’s binaries as per the above specifications. For example: Binary creation workflow of Predict Trader agent (https://github.com/valory-xyz/trader/blob/main/.github/workflows/release.yaml#L149-L284) on release
- [ ] Provide this repository’s access to Valory, so that Valory can fork it.
- [ ] Have your staking contract deployed on-chain and note its
  - [ ] Staking contract chain: [chain]
  - [ ] Staking contract address: [address]
- [ ] Create a PR on the olas-operate-middleware (https://github.com/valory-xyz/olas-operate-middleware) repo from main branch, which makes the following changes:
  - [ ] Add your staking contract in operate/ledger/profiles.py here (https://github.com/valory-xyz/olas-operate-middleware/blob/df4e440fccff4364321ffec6b97f6939792c14f6/operate/ledger/profiles.py#L62).
  - [ ] If you want to make it available through quickstart, then add it here (https://github.com/valory-xyz/olas-operate-middleware/blob/df4e440fccff4364321ffec6b97f6939792c14f6/operate/quickstart/run_service.py#L74) also.
  - [ ] Ask in the PR comments if anything is unclear.
- [ ] Create a PR on the olas-operate-app (https://github.com/valory-xyz/olas-operate-app) repo from staging branch, which makes the following changes:
  - [ ] Update the olas-operate-middleware dependency version in the pyproject.toml (https://github.com/valory-xyz/olas-operate-app/blob/6ba703e91d84837b0cb773e4490875e4011ab6e7/pyproject.toml#L13) file, such that it installs from your commit hash from the above PR of olas-operate-middleware (https://github.com/valory-xyz/olas-operate-middleware). For example:
```
olas-operate-middleware = {git = "https://github.com/valory-xyz/olas-operate-middleware.git", rev = "518b0ec2444ca535983ba1a9de8a0413f9c40752"}
```
  - [ ] Add your staking contract with the same name you gave to it in middleware repo here (https://github.com/valory-xyz/olas-operate-app/tree/main/frontend/config/stakingPrograms), add corresponding activity checker here (https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/activityCheckers.ts).  
  - [ ] Add your agent’s service template in frontend/constants/serviceTemplates.ts, following other agents’ schema. The agentType should be defined here (https://github.com/valory-xyz/olas-operate-app/blob/6ba703e91d84837b0cb773e4490875e4011ab6e7/frontend/enums/Agent.ts) first.
  - [ ] Refer to this guide (https://github.com/valory-xyz/quickstart/?tab=readme-ov-file#guide-for-the-service-configjson), to know what each field means.
  - [ ] Add the feature flags for your agent here (https://github.com/valory-xyz/olas-operate-app/blob/1b104c741bacbb8f2622a5d5ef2a9759798c8c21/frontend/hooks/useFeatureFlag.ts#L33), similar to other agents.
  - [ ] The following information in the PR description:
    - Agent Presence:
      - Agent name, logo, and description.
    - Agent introduction steps are provided, similar to other agents in Pearl when setting them for the first time.
    - Agent setup flow is provided. This includes the user flow when the agent is set up for the first time on Pearl. For example:
        - Required input fields of “user” provision_type in service template.
        - Any validation to be done on the inputs.
        - Etc.
  - Ask in the PR comments if anything is unclear.

6. Next Steps
Status Tracking
- [ ] Completed: Check this box when the entire checklist is completed.

Please fill in the bracketed information and check off each item as it is completed. This will help ensure a smooth integration process.

For further assistance, reach out to the Pearl development team (PM: Iason Rovis - iason.rovis@valory.xyz)
