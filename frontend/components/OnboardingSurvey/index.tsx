import { useCallback, useState } from 'react';

import { Modal } from '@/components/ui';
import { useOnboardingSurvey } from '@/hooks';
import { FrictionAreaId, SurveyRating } from '@/service/OnboardingSurvey';

import { EVERYTHING_SMOOTH_OPTION } from './constants';
import { StepFrictionAreas } from './StepFrictionAreas';
import { StepRating } from './StepRating';
import { SurveySuccess } from './SurveySuccess';

type Step = 'friction' | 'rating' | 'success';

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

/**
 * The post-setup questionnaire (OPE-1899): a two-step modal plus a success view.
 *
 * Rendered once from `MainPage` alongside `AchievementModal`, so it is independent of `pageState`
 * and cannot be unmounted by navigation mid-answer. The steps are states of this one overlay,
 * never separate `PAGES` entries.
 *
 * Selections live here rather than in the step components, which is what makes "Back" preserve
 * them without any extra plumbing.
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

  const [step, setStep] = useState<Step>('friction');
  const [frictionAreas, setFrictionAreas] = useState<FrictionAreaId[]>([]);
  const [rating, setRating] = useState<SurveyRating | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = useCallback(async () => {
    // Fast exit — skip step 2 entirely and submit an automatic Good rating.
    if (frictionAreas.includes(EVERYTHING_SMOOTH_OPTION.id)) {
      setIsSubmitting(true);
      const result = await submitEverythingSmooth();
      setIsSubmitting(false);
      if (result.success) setStep('success');
      return;
    }

    setStep('rating');
  }, [frictionAreas, submitEverythingSmooth]);

  const handleSubmit = useCallback(async () => {
    if (rating === null) return;

    setIsSubmitting(true);
    const result = await submit({ frictionAreas, rating, comment });
    setIsSubmitting(false);
    if (result.success) setStep('success');
  }, [comment, frictionAreas, rating, submit]);

  // Closing the success view is not a dismissal — the submission already landed, so there is
  // nothing left to nudge about.
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
      title={title}
      description={description}
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
