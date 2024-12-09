import { Button } from 'antd';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

/**
 * Displays the last transaction time and link to the transaction on GnosisScan
 * by agent safe.
 */
export const WhatIsAgentDoing = () => {
  const { goto } = usePageState();
  return (
    <Button
      type="link"
      className="p-0 text-xs"
      onClick={() => goto(Pages.AgentActivity)}
    >
      What&apos;s my agent doing?
    </Button>
  );
};
