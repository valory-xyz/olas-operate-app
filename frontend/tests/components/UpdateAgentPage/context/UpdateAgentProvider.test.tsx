import { render, screen } from '@testing-library/react';
import React, { act, useContext } from 'react';

import {
  UpdateAgentContext,
  UpdateAgentProvider,
} from '../../../../components/UpdateAgentPage/context/UpdateAgentProvider';
import { AgentMap, PAGES } from '../../../../constants';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeService,
} from '../../../helpers/factories';

const mockGoto = jest.fn();
const mockRefetchServices = jest.fn().mockResolvedValue(undefined);
const mockUpdateService = jest.fn().mockResolvedValue(undefined);

const mockFormGetFieldsValue = jest.fn();
const mockFormInstance = {
  getFieldsValue: mockFormGetFieldsValue,
  getFieldValue: jest.fn(),
  setFieldsValue: jest.fn(),
  setFieldValue: jest.fn(),
  resetFields: jest.fn(),
  validateFields: jest.fn(),
  isFieldsTouched: jest.fn(),
  isFieldTouched: jest.fn(),
  isFieldValidating: jest.fn(),
  getFieldError: jest.fn(),
  getFieldsError: jest.fn(),
  getFieldWarning: jest.fn(),
  isFieldsValidating: jest.fn(),
  submit: jest.fn(),
  scrollToField: jest.fn(),
};

jest.mock('antd', () => ({
  Form: {
    useForm: () => [mockFormInstance],
    Item: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  Flex: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  message: {
    loading: jest.fn(),
    destroy: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../../hooks', () => ({
  usePageState: jest.fn(() => ({ goto: mockGoto })),
  useService: jest.fn(() => ({
    isServiceRunning: false,
    service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
  })),
  useServices: jest.fn(() => ({
    refetch: mockRefetchServices,
    selectedService: {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      name: 'Trader Agent',
    },
    selectedAgentType: 'trader',
  })),
}));

jest.mock('../../../../service/Services', () => ({
  ServicesService: {
    updateService: (...args: unknown[]) => mockUpdateService(...args),
  },
}));

jest.mock('../../../../constants/serviceTemplates', () => ({
  SERVICE_TEMPLATES: [
    {
      name: 'Trader Agent',
      agentType: 'trader',
      env_variables: {
        SOME_VAR: {
          name: 'Some var',
          description: 'desc',
          value: 'default',
          provision_type: 'user',
        },
      },
    },
  ],
}));

jest.mock('../../../../components/ui', () => ({
  Modal: ({
    children,
    title,
    open,
  }: {
    children?: React.ReactNode;
    title?: string;
    open?: boolean;
  }) =>
    open ? (
      <div data-testid="modal" data-title={title}>
        {children}
      </div>
    ) : null,
}));

jest.mock(
  '../../../../components/UpdateAgentPage/hooks/useConfirmModal',
  () => ({
    useConfirmUpdateModal: ({
      confirmCallback,
    }: {
      confirmCallback: () => Promise<void>;
    }) => ({
      open: false,
      openModal: jest.fn(),
      closeModal: jest.fn(),
      cancel: jest.fn(),
      confirm: confirmCallback,
      pending: false,
    }),
  }),
);

jest.mock(
  '../../../../components/UpdateAgentPage/hooks/useUnsavedModal',
  () => ({
    useUnsavedModal: ({
      confirmCallback,
    }: {
      confirmCallback: () => void;
    }) => ({
      open: false,
      openModal: jest.fn(),
      closeModal: jest.fn(),
      cancel: jest.fn(),
      confirm: confirmCallback,
    }),
  }),
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useServices } = require('../../../../hooks') as {
  useServices: jest.Mock;
};

/**
 * Helper: renders UpdateAgentProvider and exposes context via a consumer hook.
 */
const renderProvider = () => {
  const TestConsumer = () => {
    const ctx = useContext(UpdateAgentContext);
    return (
      <div>
        <span data-testid="isEditing">{String(ctx.isEditing)}</span>
        <button
          data-testid="confirmUpdate"
          onClick={() =>
            (ctx.confirmUpdateModal.confirm as () => Promise<void>)()
          }
        />
        <button
          data-testid="confirmUnsaved"
          onClick={() => ctx.unsavedModal.confirm()}
        />
        <button
          data-testid="setEditing"
          onClick={() => ctx.setIsEditing(true)}
        />
      </div>
    );
  };

  return render(
    <UpdateAgentProvider>
      <TestConsumer />
    </UpdateAgentProvider>,
  );
};

describe('UpdateAgentProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useServices.mockReturnValue({
      refetch: mockRefetchServices,
      selectedService: makeService(),
      selectedAgentType: AgentMap.PredictTrader,
    });
    mockFormGetFieldsValue.mockReturnValue({
      env_variables: { SOME_VAR: 'new-value' },
    });
    mockUpdateService.mockResolvedValue(undefined);
    mockRefetchServices.mockResolvedValue(undefined);
  });

  it('renders children', () => {
    render(
      <UpdateAgentProvider>
        <span data-testid="child">Hello</span>
      </UpdateAgentProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides isEditing=false by default', () => {
    renderProvider();
    expect(screen.getByTestId('isEditing')).toHaveTextContent('false');
  });

  it('allows toggling isEditing via setIsEditing', () => {
    renderProvider();
    act(() => {
      screen.getByTestId('setEditing').click();
    });
    expect(screen.getByTestId('isEditing')).toHaveTextContent('true');
  });

  describe('confirmUpdateCallback', () => {
    it('calls ServicesService.updateService with correct payload', async () => {
      renderProvider();
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      expect(mockUpdateService).toHaveBeenCalledTimes(1);
      const callArg = mockUpdateService.mock.calls[0][0];
      expect(callArg.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
      expect(callArg.partialServiceTemplate.env_variables).toEqual({
        SOME_VAR: {
          name: 'Some var',
          description: 'desc',
          value: 'new-value',
          provision_type: 'user',
        },
      });
    });

    it('refetches services after save', async () => {
      renderProvider();
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      expect(mockRefetchServices).toHaveBeenCalledTimes(1);
    });

    it('sets isEditing=false after save', async () => {
      renderProvider();
      act(() => {
        screen.getByTestId('setEditing').click();
      });
      expect(screen.getByTestId('isEditing')).toHaveTextContent('true');
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      expect(screen.getByTestId('isEditing')).toHaveTextContent('false');
    });

    it('sets isEditing=false even when update fails', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockUpdateService.mockRejectedValue(new Error('Network error'));
      renderProvider();
      act(() => {
        screen.getByTestId('setEditing').click();
      });
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      expect(screen.getByTestId('isEditing')).toHaveTextContent('false');
      consoleSpy.mockRestore();
    });

    it('does nothing when selectedService is undefined', async () => {
      useServices.mockReturnValue({
        refetch: mockRefetchServices,
        selectedService: undefined,
        selectedAgentType: AgentMap.PredictTrader,
      });
      renderProvider();
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      expect(mockUpdateService).not.toHaveBeenCalled();
    });

    it('does nothing when service_config_id is falsy', async () => {
      useServices.mockReturnValue({
        refetch: mockRefetchServices,
        selectedService: makeService({ service_config_id: '' }),
        selectedAgentType: AgentMap.PredictTrader,
      });
      renderProvider();
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      expect(mockUpdateService).not.toHaveBeenCalled();
    });

    it('handles AgentsFun xUsername -> description mapping', async () => {
      useServices.mockReturnValue({
        refetch: mockRefetchServices,
        selectedService: makeService({ name: 'Agents.Fun' }),
        selectedAgentType: AgentMap.AgentsFun,
      });
      mockFormGetFieldsValue.mockReturnValue({
        xUsername: 'cooluser',
        env_variables: { SOME_VAR: 'val' },
      });
      renderProvider();
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      expect(mockUpdateService).toHaveBeenCalledTimes(1);
      const callArg = mockUpdateService.mock.calls[0][0];
      expect(callArg.partialServiceTemplate.description).toBe(
        'Agents.Fun @cooluser',
      );
      expect(callArg.partialServiceTemplate).not.toHaveProperty('xUsername');
    });

    it('merges env_variables with template defaults', async () => {
      mockFormGetFieldsValue.mockReturnValue({
        env_variables: { NEW_KEY: 'new-val' },
      });
      renderProvider();
      await act(async () => {
        screen.getByTestId('confirmUpdate').click();
      });
      const callArg = mockUpdateService.mock.calls[0][0];
      expect(callArg.partialServiceTemplate.env_variables.NEW_KEY).toEqual({
        value: 'new-val',
      });
    });
  });

  describe('confirmUnsavedCallback', () => {
    it('navigates to Main page', async () => {
      renderProvider();
      await act(async () => {
        screen.getByTestId('confirmUnsaved').click();
      });
      expect(mockGoto).toHaveBeenCalledWith(PAGES.Main);
    });
  });
});
