import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import React from 'react';

import { SelectStakingButton } from '../../../../components/SelectStakingPage/components/SelectStakingButton';
import { useServices } from '../../../../hooks';
import {
  onDummyServiceCreation,
  updateServiceIfNeeded,
} from '../../../../utils';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('antd', () => {
  const R = require('react');
  return {
    Button: ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
    }) => R.createElement('button', { onClick }, children),
    message: { error: jest.fn() },
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('usehooks-ts', () => ({
  useBoolean: () => ({
    value: false,
    setTrue: jest.fn(),
    setFalse: jest.fn(),
  }),
}));

jest.mock('../../../../constants/serviceTemplates', () => ({
  SERVICE_TEMPLATES: [{ agentType: 'trader' }],
}));

jest.mock('../../../../hooks', () => ({
  useIsInitiallyFunded: () => ({ markServiceAsNotInitiallyFunded: jest.fn() }),
  useServices: jest.fn(),
  useSetup: () => ({ goto: jest.fn() }),
  useStakingProgram: () => ({ setDefaultStakingProgramId: jest.fn() }),
}));

jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  onDummyServiceCreation: jest.fn(),
  updateServiceIfNeeded: jest.fn(),
}));

jest.mock('../../../../utils/fundingRoute', () => ({
  resolveFundingRoute: jest.fn(),
}));

jest.mock(
  '../../../../components/SelectStakingPage/hooks/useCanMigrate',
  () => ({
    useCanMigrate: () => ({ canMigrate: true, buttonText: 'Select' }),
  }),
);

const mockUseServices = useServices as jest.Mock;
const mockOnDummyServiceCreation = onDummyServiceCreation as jest.Mock;
const mockUpdateServiceIfNeeded = updateServiceIfNeeded as jest.Mock;
const mockMessageError = message.error as jest.Mock;

const DOWNLOAD_FAILED_MESSAGE =
  "Couldn't download the agent. Check your internet connection, VPN, proxy or antivirus HTTPS scanning, then try again.";
const CREATE_FAILED_MESSAGE = "Couldn't create the agent. Please try again.";
const UPDATE_FAILED_MESSAGE =
  'An error occurred while updating the staking contract.';

/** Mirrors what `ServicesService.createService` throws on a non-ok response. */
const makeCreateError = (body: Record<string, unknown>) =>
  Object.assign(new Error(String(body.error)), body);

const renderAndSelect = () => {
  render(<SelectStakingButton stakingProgramId={'pearl_beta' as never} />);
  fireEvent.click(screen.getByRole('button', { name: 'Select' }));
};

const servicesState = (selectedService?: unknown) => ({
  selectedService,
  selectedAgentType: 'trader',
  isLoading: false,
  refetch: jest.fn(),
  updateSelectedServiceConfigId: jest.fn(),
});

describe('SelectStakingButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when creating a new agent', () => {
    beforeEach(() => {
      mockUseServices.mockReturnValue(servicesState());
    });

    it('shows the download message when the package download fails', async () => {
      mockOnDummyServiceCreation.mockRejectedValue(
        makeCreateError({
          error:
            'Failed to download the service package: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED]>',
          error_code: 'SERVICE_PACKAGE_DOWNLOAD_FAILED',
        }),
      );

      renderAndSelect();

      await waitFor(() =>
        expect(mockMessageError).toHaveBeenCalledWith(DOWNLOAD_FAILED_MESSAGE),
      );
      expect(mockMessageError).toHaveBeenCalledTimes(1);
    });

    it('shows the generic create message for any other failure', async () => {
      mockOnDummyServiceCreation.mockRejectedValue(
        makeCreateError({ error: "KeyError: 'home_chain'" }),
      );

      renderAndSelect();

      await waitFor(() =>
        expect(mockMessageError).toHaveBeenCalledWith(CREATE_FAILED_MESSAGE),
      );
      expect(mockMessageError).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the agent already exists', () => {
    it('keeps the staking-contract message when updating the contract fails', async () => {
      mockUseServices.mockReturnValue(
        servicesState({ service_config_id: 'sc-existing' }),
      );
      mockUpdateServiceIfNeeded.mockRejectedValue(
        makeCreateError({
          error: 'Failed to download the service package',
          error_code: 'SERVICE_PACKAGE_DOWNLOAD_FAILED',
        }),
      );

      renderAndSelect();

      await waitFor(() =>
        expect(mockMessageError).toHaveBeenCalledWith(UPDATE_FAILED_MESSAGE),
      );
      expect(mockOnDummyServiceCreation).not.toHaveBeenCalled();
    });
  });
});
