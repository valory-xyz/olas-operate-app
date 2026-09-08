import { Button, Flex, Input, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { useElectronApi } from '@/hooks';
import { SurveyRating } from '@/service/OnboardingSurvey';

import {
  ONBOARDING_SURVEY_COMMENT_MAX_LENGTH,
  RATING_OPTIONS,
} from './constants';
import { selectableCardStyles } from './SelectableCard';

const { Text } = Typography;

const RatingCard = styled.button<{ $selected: boolean }>`
  ${selectableCardStyles}
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

type StepRatingProps = {
  rating: SurveyRating | null;
  onRatingChange: (rating: SurveyRating) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isOnline: boolean;
};

/** Step 2 — the required rating, the optional free text, and the terms disclaimer. */
export const StepRating = ({
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  onBack,
  onSubmit,
  isSubmitting,
  isOnline,
}: StepRatingProps) => {
  const { termsAndConditionsWindow } = useElectronApi();

  return (
    <Flex vertical gap={24} className="w-full mt-24">
      <Flex gap={8}>
        {RATING_OPTIONS.map((option) => (
          <RatingCard
            key={option.value}
            type="button"
            $selected={rating === option.value}
            onClick={() => onRatingChange(option.value)}
          >
            <Image
              src={option.icon}
              alt={option.label}
              width={32}
              height={32}
            />
            <Text>{option.label}</Text>
          </RatingCard>
        ))}
      </Flex>

      <Flex vertical gap={8} className="text-left">
        <Text type="secondary" className="text-sm">
          What issues did you encounter? – optional
        </Text>
        <Input.TextArea
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          maxLength={ONBOARDING_SURVEY_COMMENT_MAX_LENGTH}
          rows={3}
          placeholder="What issues did you encounter?"
        />
      </Flex>

      <Text type="secondary" className="text-xs text-left">
        By submitting, you assign ownership of your feedback to Valory per the{' '}
        {/* The same in-app window as Help Center → Terms, not the public web page. */}
        <Button
          type="link"
          size="small"
          className="p-0"
          onClick={() => termsAndConditionsWindow?.show?.()}
        >
          Pearl Terms
        </Button>
        .
      </Text>

      <Flex gap={12}>
        <Button
          size="large"
          className="w-full"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          className="w-full"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={rating === null || !isOnline}
        >
          Send Feedback
        </Button>
      </Flex>

      {!isOnline && (
        <Text type="secondary" className="text-xs">
          You&apos;re offline. Reconnect to send your feedback.
        </Text>
      )}
    </Flex>
  );
};
