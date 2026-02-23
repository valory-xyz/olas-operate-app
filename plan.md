Very crucial and big feature request to plan and once finalized we will start the implementation. Please read also find any caveats I am missing and understand the repository thoroughly especially frontend and the electron store.
 
Problem to solve: Today users need to run and stop agents manually.
Solution outlined: We want users to be able to start running an agent, and when an agent has earned its rewards it should move to the next agent available.

High level feature requirements - MVP
- Users can enable or disable auto-running agents globally.
- Users can configure which agents participate in auto-run via settings (a simple check list that includes agents in auto-run, by default all agents that aren’t decommissioned are included). By default, all configured & active (non-decommissioned) agents are included.
- Skips agents with:
  - Low AgentEOA balance
  - Evicted
  - Regional restriction (Polystrat)
- The system runs agents sequentially, moving to the next eligible agent once one completes or becomes idle .Idea below:
  - The sequence is set as is A -> B -> C
  - A earns rewards
  - Pearl checks if B has earned rewards. 
     - If yes, check if C has earned rewards
     - If no, runs B
     - If B & C have earned rewards, A continues to run (Periodically, checks again until one of B & C have changed epoch).
- A global auto-run toggle allows quick start/stop (segmented on off from antd) If enabled show a popover with list of agents and each agent with plus or minus button. If plus included in "can run" list if not, the "cannot run" list.
- Users can exclude specific agents from auto-run at any time using minus button.

Current architecture context (from code)
- Pearl already runs only one local service at a time in practice:
   - frontend blocks start when another agent is running (useAgentRunning, useServiceDeployment) — prevents user from starting a second agent while one is active
   - backend start endpoint calls pause_all_services() before deploying any new agent, forcefully stopping all running services first (/api/v2/service/{id} in middleware) — ensures only one agent runs at a time.
- Service runtime state is already available and polled:
   - deployment statuses: BUILT (service ready but not running), DEPLOYING (starting up), DEPLOYED (running and active), STOPPING (graceful shutdown in progress), STOPPED (stopped).
   - endpoints: /api/v2/services (list all), /api/v2/services/deployment (get active deployment), /api/v2/service/{id}/deployment (get specific service deployment state)
- “Rewards earned / idle for epoch” signal already exists in frontend:
   - RewardProvider exposes isEligibleForRewards
   - useNotifyOnAgentRewards already treats isEligibleForRewards === true as "agent has earned rewards for this epoch and is now idle" (ready to be stopped and swapped for the next agent)
- Persistent app settings already use Electron Store (electron/store.js + StoreProvider), which can store auto-run configuration: enabled/disabled flag, participant list, and execution order (future enhancement).

High-level technical scope (not detailed spec)
- Add global auto-run state
  - Add persisted setting for enabled/disabled.
  - Add runtime controller state (running, stopping, currentAgent, queue).
- Add auto-run participant popover
  - Per-agent include/exclude flag.
  - Default: include all configured + active agents.
  - Exclude decommissioned/not-eligible agents from candidate queue (no plus button).
- Add orchestration loop (sequential execution)
  - Start first eligible agent from the queue.
  - Poll deployment status and check if isEligibleForRewards === true (agent earned rewards and is idle).
  - Once idle signal detected, stop the running agent and start the next eligible agent in queue.
  - Repeat until auto-run is manually disabled or all agents in queue have run. 
- Add UI controls and observability
  - Global toggle (toolbar/header level).
  - Per-agent include/exclude controls.
- Add safety guardrails
  - Cooldown/debounce between stop/start transitions (e.g., wait 15-30 seconds after stopping Agent A before starting Agent B to let system stabilize).
  - Retry policy for failed starts (if Agent B fails to deploy, retry N times with exponential backoff before skipping to next agent).
  - Auto-run skip on safety checks (skip auto-run for the agent if wallet balance drops below minimum, Safe is not deployed, user's geolocation is restricted, or agent staking rank is no longer eligible).

PLEASE FEEL TO FREE TO ASK ANY QUESTIONS / CAVEATS AND plan it with 100% confidence score.
