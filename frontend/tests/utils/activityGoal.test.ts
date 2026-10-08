import {
  deriveIsActivityGoalMet,
  deriveIsDoneForEpoch,
  isActivityGoalCurrent,
  parseActivityGoal,
} from '../../utils/activityGoal';
import { DEFAULT_TS_CHECKPOINT, makeActivityGoal } from '../helpers/factories';

const PREVIOUS_EPOCH_START = DEFAULT_TS_CHECKPOINT - 86_400;

describe('parseActivityGoal', () => {
  it('returns the block when every field is valid', () => {
    const goal = makeActivityGoal({ last_met_at: DEFAULT_TS_CHECKPOINT + 10 });
    expect(parseActivityGoal(goal)).toEqual(goal);
  });

  it.each([
    ['missing (older agent build)', undefined],
    ['null', null],
    ['a string', 'activity_goal'],
    ['an array', [makeActivityGoal()]],
    ['missing is_met', { ...makeActivityGoal(), is_met: undefined }],
    ['a string target', { ...makeActivityGoal(), target: '8' }],
    ['a negative progress', { ...makeActivityGoal(), progress: -1 }],
    ['a fractional target', { ...makeActivityGoal(), target: 1.5 }],
    ['an unknown unit', { ...makeActivityGoal(), unit: 'bets' }],
    ['a string last_met_at', { ...makeActivityGoal(), last_met_at: 'now' }],
  ])('returns null without throwing when the block is %s', (_, raw) => {
    expect(parseActivityGoal(raw)).toBeNull();
  });

  it('reports the validation issues of a malformed block', () => {
    const onInvalid = jest.fn();
    parseActivityGoal({ ...makeActivityGoal(), target: '8' }, onInvalid);
    expect(onInvalid).toHaveBeenCalledWith(expect.stringMatching(/^target: /));
  });

  it.each([
    ['missing', undefined],
    ['null', null],
  ])('reports nothing when the block is %s', (_, raw) => {
    const onInvalid = jest.fn();
    parseActivityGoal(raw, onInvalid);
    expect(onInvalid).not.toHaveBeenCalled();
  });
});

describe('isActivityGoalCurrent', () => {
  it('is current when period_start equals the epoch checkpoint', () => {
    expect(
      isActivityGoalCurrent(makeActivityGoal(), DEFAULT_TS_CHECKPOINT),
    ).toBe(true);
  });

  it('is stale when period_start predates the epoch checkpoint', () => {
    const goal = makeActivityGoal({ period_start: PREVIOUS_EPOCH_START });
    expect(isActivityGoalCurrent(goal, DEFAULT_TS_CHECKPOINT)).toBe(false);
  });
});

describe('deriveIsActivityGoalMet', () => {
  it('is undefined when the agent publishes no block', () => {
    expect(
      deriveIsActivityGoalMet(null, DEFAULT_TS_CHECKPOINT),
    ).toBeUndefined();
  });

  it('is false for a met block from an earlier epoch', () => {
    const goal = makeActivityGoal({
      is_met: true,
      period_start: PREVIOUS_EPOCH_START,
    });
    expect(deriveIsActivityGoalMet(goal, DEFAULT_TS_CHECKPOINT)).toBe(false);
  });

  it('is true for a current met block', () => {
    const goal = makeActivityGoal({ is_met: true });
    expect(deriveIsActivityGoalMet(goal, DEFAULT_TS_CHECKPOINT)).toBe(true);
  });
});

describe('deriveIsDoneForEpoch', () => {
  it.each([
    ['staking unmet, no block', false, null, false],
    [
      'staking unmet, current met block',
      false,
      makeActivityGoal({ is_met: true }),
      false,
    ],
    ['staking met, no block (fallback)', true, null, true],
    [
      'staking met, current unmet block',
      true,
      makeActivityGoal({ is_met: false }),
      false,
    ],
    [
      'staking met, current met block',
      true,
      makeActivityGoal({ is_met: true }),
      true,
    ],
    [
      'staking met, met block from an earlier epoch',
      true,
      makeActivityGoal({ is_met: true, period_start: PREVIOUS_EPOCH_START }),
      false,
    ],
  ])('%s → %s', (_, epochTargetMet, goal, expected) => {
    expect(
      deriveIsDoneForEpoch(epochTargetMet, goal, DEFAULT_TS_CHECKPOINT),
    ).toBe(expected);
  });
});
