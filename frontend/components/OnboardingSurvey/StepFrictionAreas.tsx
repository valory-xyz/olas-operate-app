import { Button, Checkbox, Flex } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { FrictionAreaId } from '@/service/OnboardingSurvey';

import { EVERYTHING_SMOOTH_OPTION, FRICTION_AREA_OPTIONS } from './constants';
import { selectableCardStyles } from './SelectableCard';

const OptionCard = styled.label<{ $selected: boolean }>`
  ${selectableCardStyles}
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
`;

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background: ${COLOR.GRAY_4};
`;

type StepFrictionAreasProps = {
  selected: FrictionAreaId[];
  onChange: (selected: FrictionAreaId[]) => void;
  onContinue: () => void;
  isSubmitting: boolean;
  isOnline: boolean;
};

/**
 * Step 1 — the multi-select.
 *
 * "Everything was smooth" is the fast exit and is mutually exclusive with the friction options:
 * picking it clears them and vice versa. pearl-api enforces the same rule, so a UI bug fails
 * loudly rather than writing a nonsense row.
 */
export const StepFrictionAreas = ({
  selected,
  onChange,
  onContinue,
  isSubmitting,
  isOnline,
}: StepFrictionAreasProps) => {
  const isEverythingSmooth = selected.includes(EVERYTHING_SMOOTH_OPTION.id);

  const toggleFrictionArea = (id: FrictionAreaId) => {
    const withoutFastExit = selected.filter(
      (item) => item !== EVERYTHING_SMOOTH_OPTION.id,
    );
    onChange(
      withoutFastExit.includes(id)
        ? withoutFastExit.filter((item) => item !== id)
        : [...withoutFastExit, id],
    );
  };

  const toggleEverythingSmooth = () =>
    onChange(isEverythingSmooth ? [] : [EVERYTHING_SMOOTH_OPTION.id]);

  return (
    <Flex vertical gap={8} className="w-full mt-24">
      {FRICTION_AREA_OPTIONS.map((option) => {
        const isChecked = selected.includes(option.id);
        return (
          <OptionCard key={option.id} $selected={isChecked}>
            <Checkbox
              checked={isChecked}
              onChange={() => toggleFrictionArea(option.id)}
            />
            {option.label}
          </OptionCard>
        );
      })}

      <Separator className="my-6" />

      <OptionCard $selected={isEverythingSmooth}>
        <Checkbox
          checked={isEverythingSmooth}
          onChange={toggleEverythingSmooth}
        />
        {EVERYTHING_SMOOTH_OPTION.label}
      </OptionCard>

      <Button
        type="primary"
        size="large"
        className="w-full mt-24"
        onClick={onContinue}
        loading={isSubmitting}
        // The fast exit submits from this step, so it needs a connection; every other path only
        // moves to step 2 and can proceed offline.
        disabled={isEverythingSmooth && !isOnline}
      >
        Continue
      </Button>
    </Flex>
  );
};
