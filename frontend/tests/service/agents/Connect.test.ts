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
      ok: true,
      launched: true,
      error: undefined,
    });
  });

  it('returns ok:false with the `error` message for a non-2xx 200-shaped body', async () => {
    mockFetch(
      { launched: false, harness: null, error: 'no claude' },
      false,
      503,
    );

    const res = await ConnectService.startSession();

    expect(res).toEqual({
      reachable: true,
      ok: false,
      launched: false,
      error: 'no claude',
    });
  });

  it('reads `detail` for a 4xx/5xx HTTPException body', async () => {
    mockFetch({ detail: 'unknown harness' }, false, 400);

    const res = await ConnectService.startSession();

    expect(res).toEqual({
      reachable: true,
      ok: false,
      launched: false,
      error: 'unknown harness',
    });
  });

  it('marks the server unreachable on a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('conn refused'));

    const res = await ConnectService.startSession();

    expect(res).toEqual({ reachable: false });
  });
});
