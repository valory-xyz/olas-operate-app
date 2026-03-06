import { renderHook } from '@testing-library/react';

jest.mock('../../../../hooks/usePageState', () => ({
  usePageState: jest.fn().mockReturnValue({ pageState: 'Main' }),
}));
jest.mock('../../../../hooks/useServices', () => ({
  useServices: jest.fn().mockReturnValue({ selectedAgentType: 'trader' }),
}));

import { useScrollPage } from '../../../../components/MainPageV1/hooks/useScrollPage';

describe('useScrollPage', () => {
  it('returns a ref object', () => {
    const { result } = renderHook(() => useScrollPage());
    expect(result.current).toHaveProperty('current');
    expect(result.current.current).toBeNull();
  });
});
