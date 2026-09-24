/**
 * "not-running" - the agent is not running
 * "loading" - the agent is deploying and waiting confirmation from BE that it's running
 * "running" - the agent is running
 * "activity-not-ready" - the agent is running, but healthcheck is not responding, might happen for up to 1min after running
 * "idle" - the agent is running and has earned rewards
 * "stalled" - the agent is running and answering, but has stopped advancing its FSM (OPE-1941)
 * "redeploying" - the middleware restarted the agent and it has not reported healthy since
 */
export type AgentStatus =
  | 'not-running'
  | 'loading'
  | 'running'
  | 'activity-not-ready'
  | 'idle'
  | 'stalled'
  | 'redeploying';
