import {
  deriveIsActivityGoalMet,
  deriveIsDoneForEpoch,
  deriveIsNoMarketsLeft,
  deriveIsNoMarketsStandby,
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
  it('reads a stalled, unmet goal as done once the staking KPI is met', () => {
    expect(
      deriveIsDoneForEpoch(
        true,
        makeActivityGoal({ is_met: false }),
        DEFAULT_TS_CHECKPOINT,
        true,
      ),
    ).toBe(true);
  });

  it('never reads a stalled goal as done while the staking KPI is unmet', () => {
    expect(
      deriveIsDoneForEpoch(
        false,
        makeActivityGoal({ is_met: false }),
        DEFAULT_TS_CHECKPOINT,
        true,
      ),
    ).toBe(false);
  });
});

describe('no_markets_left', () => {
  it('parses the field and accepts a block without it', () => {
    const goal = makeActivityGoal({ no_markets_left: true });
    expect(parseActivityGoal(goal)).toEqual(goal);
    expect(parseActivityGoal(makeActivityGoal())?.no_markets_left).toBe(
      undefined,
    );
  });

  it('rejects a non-boolean value', () => {
    expect(
      parseActivityGoal({ ...makeActivityGoal(), no_markets_left: 'yes' }),
    ).toBeNull();
  });

  it.each([
    ['no block', null, false],
    ['absent (older build)', makeActivityGoal(), false],
    ['false', makeActivityGoal({ no_markets_left: false }), false],
    ['current true', makeActivityGoal({ no_markets_left: true }), true],
    [
      'true from an earlier epoch',
      makeActivityGoal({
        no_markets_left: true,
        period_start: PREVIOUS_EPOCH_START,
      }),
      false,
    ],
  ])('deriveIsNoMarketsLeft: %s → %s', (_, goal, expected) => {
    expect(deriveIsNoMarketsLeft(goal, DEFAULT_TS_CHECKPOINT)).toBe(expected);
  });

  it.each([true, false])(
    'a current no_markets_left is done with staking KPI met=%s, without is_met',
    (epochTargetMet) => {
      const goal = makeActivityGoal({ no_markets_left: true, is_met: false });
      expect(
        deriveIsDoneForEpoch(epochTargetMet, goal, DEFAULT_TS_CHECKPOINT),
      ).toBe(true);
      expect(deriveIsActivityGoalMet(goal, DEFAULT_TS_CHECKPOINT)).toBe(false);
    },
  );
});

describe('deriveIsNoMarketsStandby', () => {
  it.each([
    ['no market left before the goal', { no_markets_left: true }, true],
    [
      'no market left after the goal',
      { no_markets_left: true, is_met: true, progress: 8 },
      false,
    ],
    ['markets left', { no_markets_left: false }, false],
  ])('%s → %s', (_, overrides, expected) => {
    expect(
      deriveIsNoMarketsStandby(
        makeActivityGoal(overrides),
        DEFAULT_TS_CHECKPOINT,
      ),
    ).toBe(expected);
  });
});
