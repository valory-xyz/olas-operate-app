type ConnectAutoRunMigrationResult = {
  userExcludedInstances: string[];
  /** `false` once the migration has run; nothing should be written then. */
  shouldMigrate: boolean;
};

/**
 * Connect instances that existed before Connect could join Auto-run stay out
 * of it: they are added to the user-excluded list once, so the user opts them
 * in from the checklist. Instances created afterwards are auto-added like any
 * other agent.
 *
 * @example
 * prepareConnectAutoRunMigration({ userExcludedAgentInstances: ['sc-a'] }, ['sc-c'])
 * // => { userExcludedInstances: ['sc-a', 'sc-c'], shouldMigrate: true }
 */
export const prepareConnectAutoRunMigration = (
  autoRun:
    | {
        connectAutoRunMigrated?: boolean;
        userExcludedAgentInstances?: string[];
      }
    | undefined,
  connectInstanceIds: string[],
): ConnectAutoRunMigrationResult => {
  const userExcluded = autoRun?.userExcludedAgentInstances ?? [];
  if (autoRun?.connectAutoRunMigrated) {
    return { userExcludedInstances: userExcluded, shouldMigrate: false };
  }

  const excludedSet = new Set(userExcluded);
  const newlyExcluded = connectInstanceIds.filter((id) => !excludedSet.has(id));
  return {
    userExcludedInstances: [...userExcluded, ...newlyExcluded],
    shouldMigrate: true,
  };
};
