import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OnboardingSurvey } from '../../../components/OnboardingSurvey';

const mockUseOnboardingSurvey = jest.fn();
const mockTermsWindowShow = jest.fn();

jest.mock('../../../hooks', () => ({
  useOnboardingSurvey: () => mockUseOnboardingSurvey(),
  useElectronApi: () => ({
    termsAndConditionsWindow: { show: mockTermsWindowShow },
  }),
}));

const surveyState = (overrides = {}) => ({
  isModalOpen: true,
  isOnline: true,
  close: jest.fn(),
  dismiss: jest.fn(),
  submit: jest.fn().mockResolvedValue({ success: true }),
  submitEverythingSmooth: jest.fn().mockResolvedValue({ success: true }),
  ...overrides,
});

const renderSurvey = (overrides = {}) => {
  const state = surveyState(overrides);
  mockUseOnboardingSurvey.mockReturnValue(state);
  render(<OnboardingSurvey />);
  return state;
};

/** Ticks the checkbox inside the card carrying `label`. */
const pick = (label: string) => {
  const card = screen.getByText(label).closest('label') as HTMLElement;
  fireEvent.click(card.querySelector('input') as HTMLElement);
};

beforeEach(() => jest.clearAllMocks());

describe('OnboardingSurvey', () => {
  it('renders nothing when the hook says the modal is closed', () => {
    renderSurvey({ isModalOpen: false });

    expect(screen.queryByText('How did setup go?')).not.toBeInTheDocument();
  });

  it('opens on step 1 with every option and the design copy', () => {
    renderSurvey();

    expect(screen.getByText('How did setup go?')).toBeInTheDocument();
    expect(
      screen.getByText("Pick anything that didn't go smoothly."),
    ).toBeInTheDocument();

    [
      'Setting up backup wallet',
      'Choosing your agent',
      'Understanding activity rewards',
      'Funding your agent',
      'Understanding what your agent does',
      'Other',
      'Everything was smooth',
    ].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('advances to step 2 when a friction area is selected', () => {
    renderSurvey();

    pick('Funding your agent');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      screen.getByText('How was your experience overall?'),
    ).toBeInTheDocument();
  });

  it('preserves step 1 selections when going Back', () => {
    renderSurvey();

    pick('Funding your agent');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    const card = screen
      .getByText('Funding your agent')
      .closest('label') as HTMLElement;
    expect(card.querySelector('input')).toBeChecked();
  });

  it('makes the fast exit mutually exclusive with the friction options', () => {
    renderSurvey();

    pick('Funding your agent');
    pick('Everything was smooth');

    const friction = screen
      .getByText('Funding your agent')
      .closest('label') as HTMLElement;
    expect(friction.querySelector('input')).not.toBeChecked();

    pick('Understanding activity rewards');
    const fastExit = screen
      .getByText('Everything was smooth')
      .closest('label') as HTMLElement;
    expect(fastExit.querySelector('input')).not.toBeChecked();
  });

  it('the fast exit skips step 2 and lands on the success view', async () => {
    const state = renderSurvey();

    pick('Everything was smooth');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument(),
    );
    expect(state.submitEverythingSmooth).toHaveBeenCalledTimes(1);
    expect(state.submit).not.toHaveBeenCalled();
    expect(
      screen.queryByText('How was your experience overall?'),
    ).not.toBeInTheDocument();
  });

  it('requires a rating before Send Feedback is available', () => {
    renderSurvey();

    pick('Other');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      screen.getByRole('button', { name: 'Send Feedback' }),
    ).toBeDisabled();

    fireEvent.click(screen.getByText('OK'));
    expect(
      screen.getByRole('button', { name: 'Send Feedback' }),
    ).not.toBeDisabled();
  });

  it('submits the numeric rating with the selections and comment', async () => {
    const state = renderSurvey();

    pick('Setting up backup wallet');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByText('Bad'));
    fireEvent.change(
      screen.getByPlaceholderText('What issues did you encounter?'),
      { target: { value: 'the deposit address confused me' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));

    await waitFor(() =>
      expect(state.submit).toHaveBeenCalledWith({
        frictionAreas: ['backup_wallet'],
        rating: 1,
        comment: 'the deposit address confused me',
      }),
    );
    expect(
      await screen.findByText('Thanks for your feedback!'),
    ).toBeInTheDocument();
  });

  it('stays on step 2 when the submission fails', async () => {
    const state = renderSurvey({
      submit: jest.fn().mockResolvedValue({ success: false, error: 'boom' }),
    });

    pick('Other');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByText('Good'));
    fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));

    await waitFor(() => expect(state.submit).toHaveBeenCalled());
    expect(
      screen.getByText('How was your experience overall?'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Thanks for your feedback!'),
    ).not.toBeInTheDocument();
  });

  it('opens the in-app terms window rather than a browser tab', () => {
    renderSurvey();

    pick('Other');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByText('Pearl Terms'));

    expect(mockTermsWindowShow).toHaveBeenCalledTimes(1);
  });

  it('links the success view to the Olas Telegram community', async () => {
    renderSurvey();

    pick('Everything was smooth');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const cta = await screen.findByRole('button', {
      name: 'Join the Olas community',
    });
    expect(cta.closest('a')).toHaveAttribute('href', 'https://t.me/olaschat');
  });

  describe('offline', () => {
    it('disables Send Feedback and sends nothing', () => {
      const state = renderSurvey({ isOnline: false });

      pick('Other');
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      fireEvent.click(screen.getByText('Good'));

      expect(
        screen.getByRole('button', { name: 'Send Feedback' }),
      ).toBeDisabled();
      expect(state.submit).not.toHaveBeenCalled();
    });

    it('disables the fast-exit Continue, which submits from step 1', () => {
      const state = renderSurvey({ isOnline: false });

      pick('Everything was smooth');

      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
      expect(state.submitEverythingSmooth).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('closing before submitting is a dismissal', () => {
      const state = renderSurvey();

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(state.dismiss).toHaveBeenCalledTimes(1);
      expect(state.close).not.toHaveBeenCalled();
    });

    it('closing the success view is not a dismissal', async () => {
      const state = renderSurvey();

      pick('Everything was smooth');
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await screen.findByText('Thanks for your feedback!');

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(state.close).toHaveBeenCalledTimes(1);
      expect(state.dismiss).not.toHaveBeenCalled();
    });
  });
});
