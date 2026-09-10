import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OnboardingSurvey } from '../../../components/OnboardingSurvey';

const mockUseOnboardingSurvey = jest.fn();
const mockTermsWindowShow = jest.fn();
const mockMessageError = jest.fn();

jest.mock('../../../hooks', () => ({
  useOnboardingSurvey: () => mockUseOnboardingSurvey(),
  useElectronApi: () => ({
    termsAndConditionsWindow: { show: mockTermsWindowShow },
  }),
}));
jest.mock('../../../context/MessageProvider', () => ({
  useMessageApi: () => ({ error: mockMessageError }),
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
  const utils = render(<OnboardingSurvey />);
  return { ...state, ...utils };
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

  it('keeps Continue disabled until something is picked', () => {
    renderSurvey();

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    pick('Other');
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled();
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

  it('disables the fast exit while any friction option is picked', () => {
    renderSurvey();

    const fastExit = () =>
      screen.getByText('Everything was smooth').closest('label') as HTMLElement;
    expect(fastExit().querySelector('input')).not.toBeDisabled();

    pick('Funding your agent');
    expect(fastExit().querySelector('input')).toBeDisabled();

    // Clicking a disabled checkbox must not select it.
    pick('Everything was smooth');
    expect(fastExit().querySelector('input')).not.toBeChecked();

    pick('Funding your agent');
    expect(fastExit().querySelector('input')).not.toBeDisabled();
  });

  it('clears the fast exit when a friction option is picked after it', () => {
    renderSurvey();

    pick('Everything was smooth');
    pick('Understanding activity rewards');

    const fastExit = screen
      .getByText('Everything was smooth')
      .closest('label') as HTMLElement;
    expect(fastExit.querySelector('input')).not.toBeChecked();
    const friction = screen
      .getByText('Understanding activity rewards')
      .closest('label') as HTMLElement;
    expect(friction.querySelector('input')).toBeChecked();
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

    // Nothing is pre-selected.
    expect(
      screen.queryByRole('radio', { checked: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send Feedback' }),
    ).toBeDisabled();

    fireEvent.click(screen.getByText('OK'));
    expect(screen.getByRole('radio', { checked: true })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send Feedback' }),
    ).not.toBeDisabled();
  });

  it('submits the numeric rating with the selections and comment', async () => {
    const state = renderSurvey();

    pick('Setting up backup wallet');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByText('Bad'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'the deposit address confused me' },
    });
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

    // A silent failure reads as a dead button and invites a duplicate submission. The message
    // fires after the awaited submit settles, so wait for it before checking the button, which
    // has a different accessible name while its spinner is showing.
    await waitFor(() =>
      expect(mockMessageError).toHaveBeenCalledWith(
        'Could not send your feedback. Please try again.',
      ),
    );
    expect(
      screen.getByText('How was your experience overall?'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Thanks for your feedback!'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send Feedback' }),
    ).toBeEnabled();
  });

  it('tells the user when the fast exit fails too', async () => {
    const state = renderSurvey({
      submitEverythingSmooth: jest
        .fn()
        .mockResolvedValue({ success: false, error: 'boom' }),
    });

    pick('Everything was smooth');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(state.submitEverythingSmooth).toHaveBeenCalled(),
    );
    expect(mockMessageError).toHaveBeenCalledTimes(1);
    expect(screen.getByText('How did setup go?')).toBeInTheDocument();
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

    it('disables the fast-exit Continue, which submits from step 1, and says why', () => {
      const state = renderSurvey({ isOnline: false });

      // The friction options can proceed offline, so no hint until the fast exit is picked.
      pick('Other');
      expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Continue' }),
      ).not.toBeDisabled();

      pick('Other');
      pick('Everything was smooth');

      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
      expect(state.submitEverythingSmooth).not.toHaveBeenCalled();
    });
  });

  // The component stays mounted while the modal is closed, so its step and selections outlive a
  // dismissal. These cover the transition, not the frame.
  describe('reopening from the nudge', () => {
    it('returns to step 1 with the previous selections cleared', () => {
      const state = renderSurvey();

      pick('Funding your agent');
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(
        screen.getByText('How was your experience overall?'),
      ).toBeInTheDocument();

      // Dismiss, then reopen — what the sidebar nudge does.
      mockUseOnboardingSurvey.mockReturnValue({ ...state, isModalOpen: false });
      state.rerender(<OnboardingSurvey />);
      mockUseOnboardingSurvey.mockReturnValue({ ...state, isModalOpen: true });
      state.rerender(<OnboardingSurvey />);

      expect(screen.getByText('How did setup go?')).toBeInTheDocument();
      const card = screen
        .getByText('Funding your agent')
        .closest('label') as HTMLElement;
      expect(card.querySelector('input')).not.toBeChecked();
    });

    it('does not come back on the success view after a completed submission', async () => {
      const state = renderSurvey();

      pick('Everything was smooth');
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await screen.findByText('Thanks for your feedback!');

      mockUseOnboardingSurvey.mockReturnValue({ ...state, isModalOpen: false });
      state.rerender(<OnboardingSurvey />);
      mockUseOnboardingSurvey.mockReturnValue({ ...state, isModalOpen: true });
      state.rerender(<OnboardingSurvey />);

      expect(screen.getByText('How did setup go?')).toBeInTheDocument();
      expect(
        screen.queryByText('Thanks for your feedback!'),
      ).not.toBeInTheDocument();
    });

    it('clears a failed attempt so the retry starts clean', async () => {
      const state = renderSurvey({
        submit: jest.fn().mockResolvedValue({ success: false, error: 'boom' }),
      });

      pick('Other');
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      fireEvent.click(screen.getByText('Bad'));
      fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));
      await waitFor(() => expect(state.submit).toHaveBeenCalledTimes(1));

      mockUseOnboardingSurvey.mockReturnValue({ ...state, isModalOpen: false });
      state.rerender(<OnboardingSurvey />);
      mockUseOnboardingSurvey.mockReturnValue({ ...state, isModalOpen: true });
      state.rerender(<OnboardingSurvey />);

      // Back at step 1 with the selection cleared, not stuck mid-flight on a step 2 that still
      // shows the old rating. Continue is disabled again only because nothing is picked.
      expect(screen.getByText('How did setup go?')).toBeInTheDocument();
      const card = screen.getByText('Other').closest('label') as HTMLElement;
      expect(card.querySelector('input')).not.toBeChecked();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
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
