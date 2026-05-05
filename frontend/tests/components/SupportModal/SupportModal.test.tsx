import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

import { SupportModal } from '../../../components/SupportModal/SupportModal';
// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------
import { useUploadSupportFiles } from '../../../components/SupportModal/useUploadSupportFiles';
import { SUPPORT_URL } from '../../../constants/urls';
import { SupportService } from '../../../service/Support';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockCleanupSupportLogs = jest.fn(() => Promise.resolve());
const mockTermsAndConditionsWindowShow = jest.fn();
const mockResetFields = jest.fn();

jest.mock('../../../hooks', () => ({
  useElectronApi: jest.fn(() => ({
    cleanupSupportLogs: mockCleanupSupportLogs,
    termsAndConditionsWindow: { show: mockTermsAndConditionsWindowShow },
  })),
}));

jest.mock('../../../service/Support', () => ({
  SupportService: {
    createTicket: jest.fn(),
  },
}));

const mockUploadFiles = jest.fn(() => Promise.resolve(['token1', 'token2']));

jest.mock('../../../components/SupportModal/useUploadSupportFiles', () => ({
  useUploadSupportFiles: jest.fn(() => ({
    uploadFiles: mockUploadFiles,
  })),
}));

// Capture FileUploadWithList props so we can invoke onChange/onRemoveFile
let capturedFileUploadProps: {
  onChange?: (info: { fileList: Array<{ uid: string; name: string }> }) => void;
  onRemoveFile?: (uid: string) => void;
} = {};

jest.mock('../../../components/SupportModal/FileUpload', () => ({
  FileUploadWithList: (props: Record<string, unknown>) => {
    capturedFileUploadProps = props as typeof capturedFileUploadProps;
    return <div data-testid="file-upload" />;
  },
}));

jest.mock('../../../components/custom-icons', () => ({
  SuccessOutlined: () => <div data-testid="success-icon" />,
  WarningOutlined: () => <div data-testid="warning-icon" />,
}));

// Capture the onFinish handler from the Antd Form
let capturedOnFinish: ((values: Record<string, unknown>) => void) | null = null;

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');

  const MockForm = Object.assign(
    ({
      onFinish,
      children,
    }: {
      onFinish?: (values: Record<string, unknown>) => void;
      children: React.ReactNode;
    }) => {
      capturedOnFinish = onFinish ?? null;
      return <form data-testid="support-form">{children}</form>;
    },
    {
      Item: ({
        children,
        label,
        extra,
      }: {
        children: React.ReactNode;
        label?: React.ReactNode;
        extra?: React.ReactNode;
      }) => (
        <div>
          {label && <div>{label}</div>}
          {children}
          {extra && <div>{extra}</div>}
        </div>
      ),
      useForm: () => [{ resetFields: mockResetFields }],
    },
  );

  return {
    ...actual,
    Form: MockForm,
  };
});

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../components/ui', () => ({
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
  Modal: ({
    title,
    open,
    children,
    action,
    description,
    onCancel,
    header,
  }: {
    title?: string;
    open?: boolean;
    children?: React.ReactNode;
    action?: React.ReactNode;
    description?: React.ReactNode;
    onCancel?: () => void;
    header?: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="modal">
        {header}
        {title && <div data-testid="modal-title">{title}</div>}
        {description && (
          <div data-testid="modal-description">{description}</div>
        )}
        {action}
        {children}
        {onCancel && (
          <button data-testid="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    ) : null,
  RequiredMark: undefined,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockOnClose = jest.fn();

const renderModal = (
  props: { open?: boolean; shouldUseFallbackLogs?: boolean } = {},
) => {
  const { open = true, shouldUseFallbackLogs } = props;
  return render(
    <SupportModal
      open={open}
      onClose={mockOnClose}
      shouldUseFallbackLogs={shouldUseFallbackLogs}
    />,
  );
};

const MOCK_FORM_VALUES = {
  email: 'test@example.com',
  subject: 'Test Subject',
  description: 'Test description of the issue',
  shouldShareLogs: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SupportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnFinish = null;
    capturedFileUploadProps = {};
  });

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  describe('render states', () => {
    it('renders the form with "Contact Support" title when open', () => {
      renderModal();

      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Contact Support',
      );
      expect(screen.getByTestId('support-form')).toBeInTheDocument();
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('does not render anything when open is false', () => {
      renderModal({ open: false });

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('renders success state with ticket ID after successful submission', async () => {
      const mockTicketId = 12345;
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: true,
        ticketId: mockTicketId,
      });

      renderModal();

      expect(capturedOnFinish).toBeTruthy();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Request Submitted!',
      );
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
      expect(screen.getByTestId('modal-description')).toHaveTextContent(
        `Your request ID is #${mockTicketId}`,
      );
    });

    it('renders error state with Discord link after failed submission', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Something went wrong',
      });

      renderModal();

      expect(capturedOnFinish).toBeTruthy();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Request Submission Failed',
      );
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();

      const discordLink = screen.getByRole('link');
      expect(discordLink).toHaveAttribute('href', SUPPORT_URL);
      expect(discordLink).toHaveAttribute('target', '_blank');
      expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // -------------------------------------------------------------------------
  // Form submission flow
  // -------------------------------------------------------------------------

  describe('form submission flow', () => {
    it('calls uploadFiles and createTicket with correct args on successful submit', async () => {
      const mockTicketId = 99;
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: true,
        ticketId: mockTicketId,
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(mockUploadFiles).toHaveBeenCalledWith([], true);
      expect(SupportService.createTicket).toHaveBeenCalledWith({
        email: MOCK_FORM_VALUES.email,
        subject: MOCK_FORM_VALUES.subject,
        description: MOCK_FORM_VALUES.description,
        uploadTokens: ['token1', 'token2'],
        tags: ['pearl', 'support'],
      });
      expect(mockCleanupSupportLogs).toHaveBeenCalled();
    });

    it('sets error state when createTicket returns success=false', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Ticket creation failed',
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Request Submission Failed',
      );
      expect(mockCleanupSupportLogs).toHaveBeenCalled();
    });

    it('sets error state when an exception is thrown during submission', async () => {
      mockUploadFiles.mockRejectedValueOnce(new Error('Network error'));

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Request Submission Failed',
      );
      expect(mockCleanupSupportLogs).toHaveBeenCalled();
    });

    it('calls cleanupSupportLogs even when submission fails', async () => {
      (SupportService.createTicket as jest.Mock).mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(mockCleanupSupportLogs).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // shouldUseFallbackLogs prop
  // -------------------------------------------------------------------------

  describe('shouldUseFallbackLogs prop', () => {
    it('passes shouldUseFallbackLogs=false by default to useUploadSupportFiles', () => {
      renderModal();

      expect(useUploadSupportFiles).toHaveBeenCalledWith({
        shouldUseFallbackLogs: false,
      });
    });

    it('passes shouldUseFallbackLogs=true when prop is set', () => {
      renderModal({ shouldUseFallbackLogs: true });

      expect(useUploadSupportFiles).toHaveBeenCalledWith({
        shouldUseFallbackLogs: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // handleClose behavior
  // -------------------------------------------------------------------------

  describe('handleClose behavior', () => {
    it('calls onClose when cancel is triggered on the form modal', async () => {
      renderModal();

      const cancelButton = screen.getByTestId('modal-cancel');

      await act(async () => {
        cancelButton.click();
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('resets the form when closing', async () => {
      renderModal();

      const cancelButton = screen.getByTestId('modal-cancel');

      await act(async () => {
        cancelButton.click();
      });

      expect(mockResetFields).toHaveBeenCalled();
    });

    it('calls onClose when closing the success modal', async () => {
      const mockTicketId = 42;
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: true,
        ticketId: mockTicketId,
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      // Now in success state, click cancel/close
      const cancelButton = screen.getByTestId('modal-cancel');

      await act(async () => {
        cancelButton.click();
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose and resets isError when closing the error modal', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed',
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      // Now in error state
      expect(screen.getByTestId('modal-title')).toHaveTextContent(
        'Request Submission Failed',
      );

      const cancelButton = screen.getByTestId('modal-cancel');

      await act(async () => {
        cancelButton.click();
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // VALIDATION_RULES static assertion
  // -------------------------------------------------------------------------

  describe('VALIDATION_RULES', () => {
    it('renders form items with required validation labels', () => {
      renderModal();

      // Check that the form renders labels for the required fields
      expect(screen.getByText('Your email')).toBeInTheDocument();
      expect(screen.getByText('Subject')).toBeInTheDocument();
      expect(
        screen.getByText('Describe the issue in detail'),
      ).toBeInTheDocument();
    });

    it('renders the attachments field as optional', () => {
      renderModal();

      expect(screen.getByText('Attachments (optional)')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form content assertions
  // -------------------------------------------------------------------------

  describe('form content', () => {
    it('renders the submit button with correct text', () => {
      renderModal();

      expect(screen.getByText('Submit Issue')).toBeInTheDocument();
    });

    it('renders the cancel button', () => {
      renderModal();

      // There are two "Cancel" texts: one from the antd Button in the form and one from the mock modal onCancel
      const cancelButtons = screen.getAllByText('Cancel');
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the Pearl Terms link text', () => {
      renderModal();

      expect(screen.getByText('Pearl Terms')).toBeInTheDocument();
    });

    it('renders the support description text', () => {
      renderModal();

      expect(
        screen.getByText(
          /Fill out the form below and the Valory support team will get back to you via email/,
        ),
      ).toBeInTheDocument();
    });

    it('renders the checkbox label for sharing logs', () => {
      renderModal();

      expect(
        screen.getByText(
          /Share Pearl app logs to help the support team solve this faster/,
        ),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Success modal content
  // -------------------------------------------------------------------------

  describe('success modal content', () => {
    it('displays the Close button in success state', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: true,
        ticketId: 777,
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('includes inbox message in success description', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: true,
        ticketId: 555,
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      await waitFor(() => {
        expect(screen.getByTestId('modal-description')).toHaveTextContent(
          'Keep an eye on your inbox for the response from the support team',
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error modal content
  // -------------------------------------------------------------------------

  describe('error modal content', () => {
    it('displays retry and Discord alternative text', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Server error',
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(screen.getByTestId('modal-description')).toHaveTextContent(
        'Please try contacting the Valory support team again',
      );
      expect(screen.getByTestId('modal-description')).toHaveTextContent(
        'you can contact the Olas community on Telegram',
      );
    });

    it('renders Telegram link text', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Server error',
      });

      renderModal();

      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(
        screen.getByText(/Visit Olas community on Telegram/),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Component handlers (handleFileChange, handleRemoveFile, terms link)
  // -------------------------------------------------------------------------

  describe('component handlers', () => {
    it('updates uploaded files via handleFileChange (onChange)', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: true,
        ticketId: 1,
      });

      renderModal();

      // Simulate adding files via the FileUploadWithList onChange prop
      const mockFiles = [
        { uid: 'file-1', name: 'screenshot.png' },
        { uid: 'file-2', name: 'log.zip' },
      ];

      await act(async () => {
        capturedFileUploadProps.onChange?.({ fileList: mockFiles });
      });

      // Submit the form — uploadFiles should receive the updated file list
      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(mockUploadFiles).toHaveBeenCalledWith(mockFiles, true);
    });

    it('removes a file via handleRemoveFile (onRemoveFile)', async () => {
      (SupportService.createTicket as jest.Mock).mockResolvedValueOnce({
        success: true,
        ticketId: 2,
      });

      renderModal();

      // Add two files
      const mockFiles = [
        { uid: 'file-1', name: 'screenshot.png' },
        { uid: 'file-2', name: 'log.zip' },
      ];

      await act(async () => {
        capturedFileUploadProps.onChange?.({ fileList: mockFiles });
      });

      // Remove the first file
      await act(async () => {
        capturedFileUploadProps.onRemoveFile?.('file-1');
      });

      // Submit — only file-2 should remain
      await act(async () => {
        await capturedOnFinish!(MOCK_FORM_VALUES);
      });

      expect(mockUploadFiles).toHaveBeenCalledWith(
        [{ uid: 'file-2', name: 'log.zip' }],
        true,
      );
    });

    it('calls termsAndConditionsWindow.show when Pearl Terms link is clicked', async () => {
      renderModal();

      const termsLink = screen.getByText('Pearl Terms');

      await act(async () => {
        termsLink.click();
      });

      expect(mockTermsAndConditionsWindowShow).toHaveBeenCalledTimes(1);
    });
  });
});
