import { render, screen } from '@testing-library/react';
import React from 'react';

import { AgentRunButton } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton';
import {
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '../../../../../../../constants/deployment';
import { usePrestartCheck } from '../../../../../../../hooks/usePrestartCheck';
import { useServices } from '../../../../../../../hooks/useServices';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeService,
} from '../../../../../../helpers/factories';

jest.mock('../../../../../../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../../../../../../hooks/usePrestartCheck', () => ({
  usePrestartCheck: jest.fn(),
}));
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton/AgentBusyButton',
  () => ({
    AgentBusyButton: ({ text }: { text: string }) => <div>{text}</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton/AgentNotRunningButton',
  () => ({ AgentNotRunningButton: () => <div>not-running</div> }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton/AgentRunningButton',
  () => ({ AgentRunningButton: () => <div>running</div> }),
);

const renderButton = (
  deploymentStatus: MiddlewareDeploymentStatus,
  isChecking: boolean,
) => {
  (useServices as jest.Mock).mockReturnValue({
    selectedService: makeService({
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      deploymentStatus,
    }),
  });
  (usePrestartCheck as jest.Mock).mockReturnValue({ isChecking });
  render(<AgentRunButton />);
};

describe('AgentRunButton', () => {
  it('reads "Checking" while the start runs the prestart check', () => {
    renderButton(MiddlewareDeploymentStatusMap.DEPLOYING, true);

    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(usePrestartCheck).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
  });

  it('reads "Starting" once the check is done', () => {
    renderButton(MiddlewareDeploymentStatusMap.DEPLOYING, false);

    expect(screen.getByText('Starting')).toBeInTheDocument();
  });

  it.each([
    [MiddlewareDeploymentStatusMap.STOPPING, 'Stopping'],
    [MiddlewareDeploymentStatusMap.DEPLOYED, 'running'],
    [MiddlewareDeploymentStatusMap.BUILT, 'not-running'],
  ])('keeps the button of status %s', (status, expected) => {
    renderButton(status, false);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
