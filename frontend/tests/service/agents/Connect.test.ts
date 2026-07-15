import { AGENT_SERVER_URL } from '../../../constants';
import { ConnectService } from '../../../service/agents/Connect';

const mockFetch = (body: unknown, ok = true, status = 200) =>
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);

describe('ConnectService.startSession', () => {
  // Ensure `fetch` is an own, spy-able property (other suites in the worker may
  // have replaced/removed the injected global).
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => jest.restoreAllMocks());

  it('POSTs to the local /session endpoint and returns a launched result', async () => {
    const spy = mockFetch({ launched: true, harness: 'claude_code_desktop' });

    const res = await ConnectService.startSession();

    expect(spy).toHaveBeenCalledWith(
      `${AGENT_SERVER_URL}/session`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res).toEqual({
      reachable: true,
      launched: true,
      harness: 'claude_code_desktop',
      error: undefined,
    });
  });

  it('returns the parsed body for a non-2xx response (server still reachable)', async () => {
    mockFetch(
      { launched: false, harness: null, error: 'no claude' },
      false,
      503,
    );

    const res = await ConnectService.startSession();

    expect(res).toEqual({
      reachable: true,
      launched: false,
      harness: null,
      error: 'no claude',
    });
  });

  it('normalizes a missing harness to null', async () => {
    mockFetch({ launched: false }, false, 500);

    const res = await ConnectService.startSession();

    expect(res).toEqual({
      reachable: true,
      launched: false,
      harness: null,
      error: undefined,
    });
  });

  it('marks the server unreachable on a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('conn refused'));

    const res = await ConnectService.startSession();

    expect(res).toEqual({ reachable: false });
  });
});
