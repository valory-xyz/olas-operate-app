import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { Modal } from '@/components/ui';
import { COLOR } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useOnboardingSurvey } from '@/hooks';
import {
  FrictionAreaId,
  SubmitSurveyResponse,
  SurveyRating,
} from '@/service/OnboardingSurvey';

import { EVERYTHING_SMOOTH_OPTION } from './constants';
import { StepFrictionAreas } from './StepFrictionAreas';
import { StepRating } from './StepRating';
import { SurveySuccess } from './SurveySuccess';

const { Title, Text } = Typography;

type Step = 'friction' | 'rating' | 'success';

/** The Pearl robot on a soft gradient tile, as the design puts above the title. */
const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px solid ${COLOR.GRAY_3};
  border-radius: 12px;
  background: linear-gradient(180deg, ${COLOR.WHITE} 0%, ${COLOR.GRAY_1} 100%);
`;

/** 14/20 regular, per the design; antd's default Text line-height is 22px. */
const Description = styled(Text)`
  line-height: 20px;
  color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
`;

// Rendered through the Modal's `header` slot: the design's 24px/8px rhythm differs from the
// title/description spacing every other modal shares.
const SurveyHeader = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <Flex vertical align="flex-start" className="w-full">
    <HeaderIcon>
      <Image src="/splash-robot-head.png" alt="Pearl" width={45} height={45} />
    </HeaderIcon>
    {/* Level 4 is the theme's 20px / 28px heading; the design wants it at medium weight. */}
    <Title level={4} className="mt-24 mb-8 font-weight-500">
      {title}
    </Title>
    {description && <Description>{description}</Description>}
  </Flex>
);

const STEP_COPY: Record<Step, { title: string; description?: string }> = {
  friction: {
    title: 'How did setup go?',
    description: "Pick anything that didn't go smoothly.",
  },
  rating: { title: 'How was your experience overall?' },
  success: {
    title: 'Thanks for your feedback!',
    description:
      'Pearl users share setups, results, and fixes in the Olas community on Telegram.',
  },
};

const SUBMIT_FAILED_MESSAGE = 'Could not send your feedback. Please try again.';

/**
 * The post-setup questionnaire (OPE-1899): a two-step modal plus a success view, rendered once
 * from `MainPage` so navigation cannot unmount it mid-answer. Selections live here so "Back"
 * preserves them.
 */
export const OnboardingSurvey = () => {
  const {
    isModalOpen,
    isOnline,
    close,
    dismiss,
    submit,
    submitEverythingSmooth,
  } = useOnboardingSurvey();
  const message = useMessageApi();

  const [step, setStep] = useState<Step>('friction');
  const [frictionAreas, setFrictionAreas] = useState<FrictionAreaId[]>([]);
  const [rating, setRating] = useState<SurveyRating | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The component stays mounted while closed (it renders null), so reset on the closed → open
  // edge or a reopen from the sidebar alert lands on the previous step with the old answers.
  const wasOpenRef = useRef(isModalOpen);
  useEffect(() => {
    if (isModalOpen && !wasOpenRef.current) {
      setStep('friction');
      setFrictionAreas([]);
      setRating(null);
      setComment('');
      setIsSubmitting(false);
    }
    wasOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // A failed send must say so; a silent no-op reads as a dead button and invites a second click,
  // which is a second row.
  const submitAndAdvance = useCallback(
    async (run: () => Promise<SubmitSurveyResponse>) => {
      setIsSubmitting(true);
      const result = await run();
      setIsSubmitting(false);
      if (result.success) {
        setStep('success');
        return;
      }
      message.error(SUBMIT_FAILED_MESSAGE);
    },
    [message],
  );

  const handleContinue = useCallback(() => {
    // Fast exit: skip step 2 and submit an automatic Good rating.
    if (frictionAreas.includes(EVERYTHING_SMOOTH_OPTION.id)) {
      return submitAndAdvance(submitEverythingSmooth);
    }
    setStep('rating');
  }, [frictionAreas, submitAndAdvance, submitEverythingSmooth]);

  const handleSubmit = useCallback(() => {
    if (rating === null) return;
    return submitAndAdvance(() => submit({ frictionAreas, rating, comment }));
  }, [comment, frictionAreas, rating, submit, submitAndAdvance]);

  // Closing the success view is not a dismissal: the submission already landed.
  const handleCancel = useCallback(() => {
    if (step === 'success') {
      close();
      return;
    }
    dismiss();
  }, [close, dismiss, step]);

  if (!isModalOpen) return null;

  const { title, description } = STEP_COPY[step];

  return (
    <Modal
      open
      onCancel={handleCancel}
      closable
      size="medium"
      align="flex-start"
      header={<SurveyHeader title={title} description={description} />}
      action={
        <>
          {step === 'friction' && (
            <StepFrictionAreas
              selected={frictionAreas}
              onChange={setFrictionAreas}
              onContinue={handleContinue}
              isSubmitting={isSubmitting}
              isOnline={isOnline}
            />
          )}
          {step === 'rating' && (
            <StepRating
              rating={rating}
              onRatingChange={setRating}
              comment={comment}
              onCommentChange={setComment}
              onBack={() => setStep('friction')}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isOnline={isOnline}
            />
          )}
          {step === 'success' && <SurveySuccess />}
        </>
      }
    />
  );
};
