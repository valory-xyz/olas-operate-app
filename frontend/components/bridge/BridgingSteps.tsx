import { Steps } from 'antd';
import React from 'react';

const description = 'This is a description.';

// TODO: Mohan to update
/**
 * Presentational component for the bridging steps.
 */
export const BridgingSteps = () => (
  <Steps
    direction="vertical"
    current={1}
    items={[
      {
        title: 'Finished',
        description,
      },
      {
        title: 'In Progress',
        description,
      },
      {
        title: 'Waiting',
        description,
      },
    ]}
  />
);
