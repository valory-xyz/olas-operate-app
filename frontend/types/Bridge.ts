export type BridgingStepStatus = 'loading' | 'completed' | 'error';

export type QuoteBundleStatus = 'CREATED' | 'QUOTED' | 'SUBMITTED' | 'FINISHED';

export type BridgeExecutionStatus =
  | 'NOT_FOUND'
  | 'INVALID '
  | 'PENDING'
  | 'DONE'
  | 'FAILED'
  | 'UNKNOWN';
