/**
 * "not-running" - the agent is not running
 * "loading" - the agent is deploying and waiting confirmation from BE that it's running
 * "running" - the agent is running; also used once it has earned rewards but is still working toward its activity goal
 * "activity-not-ready" - the agent is running, but healthcheck is not responding, might happen for up to 1min after running
 * "idle" - the agent has reached its activity goal (and earned rewards) and is in standby for the next epoch
 */
export type AgentStatus =
  | 'not-running'
  | 'loading'
  | 'running'
  | 'activity-not-ready'
  | 'idle';
