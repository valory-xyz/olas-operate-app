/**
 * Status of the each step in the bridging process.
 */
export type BridgingStepStatus = 'process' | 'wait' | 'finish' | 'error';

/**
 * Status of the overall quote.
 */
export type QuoteBundleStatus = 'CREATED' | 'QUOTED' | 'SUBMITTED' | 'FINISHED';

/**
 * Execution status of each bridge step.
 * For example, status of bridging ethereum to base.
 */
export type BridgeExecutionStatus =
  | 'NOT_FOUND'
  | 'INVALID'
  | 'PENDING'
  | 'DONE'
  | 'FAILED'
  | 'UNKNOWN';
