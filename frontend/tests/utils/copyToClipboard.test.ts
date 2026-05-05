import { AddressZero } from '../../constants';
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
    await copyToClipboard(AddressZero);
    expect(writeTextMock).toHaveBeenCalledWith(AddressZero);
  });

  it('handles empty string', async () => {
    await copyToClipboard('');
    expect(writeTextMock).toHaveBeenCalledWith('');
  });

  it('handles falsy values', async () => {
    await copyToClipboard(null as unknown as string);
    expect(writeTextMock).toHaveBeenCalledWith(null);

    await copyToClipboard(undefined as unknown as string);
    expect(writeTextMock).toHaveBeenCalledWith(undefined);
  });
});
