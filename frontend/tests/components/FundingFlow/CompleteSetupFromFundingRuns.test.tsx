import { render } from '@testing-library/react';

import { CompleteSetupFromFundingRuns } from '../../../components/FundingFlow/CompleteSetupFromFundingRuns';
import { useCompleteSetupFromFundingRuns } from '../../../hooks/useCompleteSetupFromFundingRuns';

jest.mock('../../../hooks/useCompleteSetupFromFundingRuns', () => ({
  useCompleteSetupFromFundingRuns: jest.fn(),
}));

describe('CompleteSetupFromFundingRuns', () => {
  it('runs the setup completion hook and renders nothing', () => {
    const { container } = render(<CompleteSetupFromFundingRuns />);

    expect(useCompleteSetupFromFundingRuns).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
