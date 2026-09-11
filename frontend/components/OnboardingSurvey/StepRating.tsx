import { Button, Flex, Input, Radio, Typography } from 'antd';
import Image from 'next/image';
import { MouseEvent, useCallback } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { useElectronApi } from '@/hooks';
import { SurveyRating } from '@/service/OnboardingSurvey';

import {
  ONBOARDING_SURVEY_COMMENT_MAX_LENGTH,
  RATING_OPTIONS,
  RatingTone,
} from './constants';

const { Text } = Typography;

/** Selected-segment colours per rating, from the design's Emotion Bar. */
const TONE_STYLES: Record<RatingTone, { background: string; color: string }> = {
  error: {
    background: COLOR.BG.ERROR.DEFAULT,
    color: COLOR.TEXT_COLOR.ERROR.DEFAULT,
  },
  warning: {
    background: COLOR.BG.WARNING.DEFAULT,
    color: COLOR.TEXT_COLOR.WARNING.DEFAULT,
  },
  success: {
    background: COLOR.BG.SUCCESS.DEFAULT,
    color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT,
  },
};

const toneClassName = (tone: RatingTone) => `rating-${tone}`;

/**
 * The design's rating control is a joined button group: one grey outline, dividers between the
 * segments, and the picked segment tinted by its meaning (red / yellow / green) rather than by
 * antd's primary colour. That is antd's radio-button group with the checked state restyled.
 */
const RatingGroup = styled(Radio.Group)`
  .ant-radio-button-wrapper {
    text-align: center;

    > span:last-child {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }

  /* Keep the outline grey when a segment is picked; the tint below is the only highlight. */
  .ant-radio-button-wrapper.ant-radio-button-wrapper-checked {
    border-color: ${COLOR.GRAY_3};

    /* The divider between segments is a pseudo-element, not a border. */
    &::before {
      background-color: ${COLOR.GRAY_3};
    }
  }

  ${(Object.keys(TONE_STYLES) as RatingTone[]).map(
    (tone) => `
      .ant-radio-button-wrapper.ant-radio-button-wrapper-checked.${toneClassName(tone)},
      .ant-radio-button-wrapper.ant-radio-button-wrapper-checked.${toneClassName(tone)}:hover {
        background: ${TONE_STYLES[tone].background};
        color: ${TONE_STYLES[tone].color};
      }
    `,
  )}
`;

/** antd's filled variant uses its own grey; the design wants the app's page background. */
const CommentTextArea = styled(Input.TextArea)`
  &.ant-input-filled {
    background: ${COLOR.BACKGROUND};
  }
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

  // Same in-app window as Help Center → Terms and the account-creation screen, not the web page.
  const onTermsClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      termsAndConditionsWindow?.show?.();
    },
    [termsAndConditionsWindow],
  );

  return (
    <Flex vertical gap={24} className="w-full mt-16">
      <RatingGroup
        block
        size="large"
        value={rating}
        onChange={(event) => onRatingChange(event.target.value)}
      >
        {RATING_OPTIONS.map((option) => (
          <Radio.Button
            key={option.value}
            value={option.value}
            className={toneClassName(option.tone)}
          >
            <Image
              src={option.icon}
              alt=""
              // The PNGs are 2x exports (32px files), so they display at 16px.
              width={16}
              height={16}
            />
            {option.label}
          </Radio.Button>
        ))}
      </RatingGroup>

      <Flex vertical gap={8} className="text-left">
        <Text className="text-sm text-neutral-secondary">
          What issues did you encounter?{' '}
          <Text className="text-sm text-neutral-tertiary">– optional</Text>
        </Text>
        <CommentTextArea
          variant="filled"
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          maxLength={ONBOARDING_SURVEY_COMMENT_MAX_LENGTH}
          rows={3}
        />
      </Flex>

      <Text className="text-xs text-neutral-tertiary text-left">
        By submitting, you assign ownership of your feedback to Valory per the{' '}
        <a onClick={onTermsClick}>Pearl Terms</a>.
      </Text>

      <Flex gap={12}>
        <Button size="large" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          className="flex-auto"
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
