import { copyToClipboard } from '../../utils/copyToClipboard';

describe('copyToClipboard', () => {
  const writeTextMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
    jest.clearAllMocks();
  });

  it('calls navigator.clipboard.writeText with the provided text', async () => {
    await copyToClipboard('hello world');
    expect(writeTextMock).toHaveBeenCalledWith('hello world');
  });

  it('handles empty string', async () => {
    await copyToClipboard('');
    expect(writeTextMock).toHaveBeenCalledWith('');
  });
});
