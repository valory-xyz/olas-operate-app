import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useTriggerAchievementBackgroundTasks } from '../../../../components/AchievementModal/hooks/useTriggerAchievementBackgroundTasks';
import { ACHIEVEMENT_TYPE } from '../../../../constants/achievement';
import {
  acknowledgeServiceAchievement,
  generateAchievementImage,
} from '../../../../service/Achievement';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makePolystratPayoutAchievement as makeFactoryAchievement,
  MOCK_ACHIEVEMENT_ID,
  MOCK_BET_ID,
} from '../../../helpers/factories';

jest.mock('../../../../service/Achievement', () => ({
  acknowledgeServiceAchievement: jest.fn(),
  generateAchievementImage: jest.fn(),
}));

const mockAcknowledge = acknowledgeServiceAchievement as jest.MockedFunction<
  typeof acknowledgeServiceAchievement
>;
const mockGenerateImage = generateAchievementImage as jest.MockedFunction<
  typeof generateAchievementImage
>;

// Track onError callbacks so we can invoke them in tests
const onErrorCallbacks: Array<(error: unknown) => void> = [];

jest.mock('@tanstack/react-query', () => ({
  useMutation: ({
    mutationFn,
    onError,
  }: {
    mutationFn: (...args: unknown[]) => unknown;
    onError?: (error: unknown) => void;
  }) => {
    if (onError) onErrorCallbacks.push(onError);
    return { mutateAsync: mutationFn };
  },
}));

const makePolystratAchievement = makeFactoryAchievement;

describe('useTriggerAchievementBackgroundTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onErrorCallbacks.length = 0;
    mockAcknowledge.mockResolvedValue({ acknowledged: true });
    mockGenerateImage.mockResolvedValue({ ok: true });
  });

  it('returns early when called with a falsy achievement', async () => {
    const { result } = renderHook(() => useTriggerAchievementBackgroundTasks());
    await act(async () => {
      await result.current.triggerAchievementBackgroundTasks(null as never);
    });
    expect(mockAcknowledge).not.toHaveBeenCalled();
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  it('starts with areBackgroundTasksFinalized=false', () => {
    const { result } = renderHook(() => useTriggerAchievementBackgroundTasks());
    expect(result.current.areBackgroundTasksFinalized).toBe(false);
  });

  it('calls acknowledge and generateImage in parallel for POLYSTRAT_PAYOUT', async () => {
    const achievement = makePolystratAchievement();
    const { result } = renderHook(() => useTriggerAchievementBackgroundTasks());

    await act(async () => {
      await result.current.triggerAchievementBackgroundTasks(achievement);
    });

    expect(mockAcknowledge).toHaveBeenCalledWith({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      achievementId: MOCK_ACHIEVEMENT_ID,
    });
    expect(mockGenerateImage).toHaveBeenCalledWith({
      agent: 'polystrat',
      type: 'payout',
      id: MOCK_BET_ID,
    });
  });

  it('sets areBackgroundTasksFinalized=true after completion', async () => {
    const achievement = makePolystratAchievement();
    const { result } = renderHook(() => useTriggerAchievementBackgroundTasks());

    await act(async () => {
      await result.current.triggerAchievementBackgroundTasks(achievement);
    });

    expect(result.current.areBackgroundTasksFinalized).toBe(true);
  });

  it('sets areBackgroundTasksFinalized=true on error', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockAcknowledge.mockRejectedValue(new Error('Ack failed'));

    const achievement = makePolystratAchievement();
    const { result } = renderHook(() => useTriggerAchievementBackgroundTasks());

    await act(async () => {
      await result.current.triggerAchievementBackgroundTasks(achievement);
    });

    expect(result.current.areBackgroundTasksFinalized).toBe(true);
    consoleSpy.mockRestore();
  });

  it('logs error and sets finalized=true when dataId is null (unknown achievement type)', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const unknownAchievement = makePolystratAchievement({
      achievement_type:
        'unknown/type' as typeof ACHIEVEMENT_TYPE.POLYSTRAT_PAYOUT,
    });

    const { result } = renderHook(() => useTriggerAchievementBackgroundTasks());

    await act(async () => {
      await result.current.triggerAchievementBackgroundTasks(
        unknownAchievement,
      );
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to get achievement data id',
    );
    expect(result.current.areBackgroundTasksFinalized).toBe(true);
    expect(mockAcknowledge).not.toHaveBeenCalled();
    expect(mockGenerateImage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('logs error via onError when acknowledge mutation fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderHook(() => useTriggerAchievementBackgroundTasks());
    // onErrorCallbacks[0] is the acknowledge onError, [1] is the image generation onError
    expect(onErrorCallbacks.length).toBeGreaterThanOrEqual(2);
    const error = new Error('Ack failed');
    onErrorCallbacks[0](error);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to acknowledge achievement',
      error,
    );
    consoleSpy.mockRestore();
  });

  it('logs error via onError when image generation mutation fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderHook(() => useTriggerAchievementBackgroundTasks());
    expect(onErrorCallbacks.length).toBeGreaterThanOrEqual(2);
    const error = new Error('Image gen failed');
    onErrorCallbacks[1](error);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to trigger image generation',
      error,
    );
    consoleSpy.mockRestore();
  });

  it('splits achievement_type into agent and type for image generation', async () => {
    const achievement = makePolystratAchievement({
      achievement_type: ACHIEVEMENT_TYPE.POLYSTRAT_PAYOUT,
    });

    const { result } = renderHook(() => useTriggerAchievementBackgroundTasks());

    await act(async () => {
      await result.current.triggerAchievementBackgroundTasks(achievement);
    });

    expect(mockGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'polystrat',
        type: 'payout',
      }),
    );
  });
});
