/**
 * "not-running" - the agent is not running
 * "loading" - the agent is deploying and waiting confirmation from BE that it's running
 * "running" - the agent is running
 * "activity-not-ready" - the agent is running, but healthcheck is not responding, might happen for up to 1min after running
 * "idle" - the agent is running and has earned rewards
 */
export type AgentStatus =
  | 'not-running'
  | 'loading'
  | 'running'
  | 'activity-not-ready'
  | 'idle'; // TODO: implement idle status
