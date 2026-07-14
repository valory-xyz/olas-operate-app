import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { ReactNode } from 'react';

import { IntroductionAnimatedContainer } from './IntroductionAnimatedContainer';

const { Title, Text } = Typography;

export type IntroductionStepStyles = {
  imageHeight?: number;
  descPadding?: string;
};

export type OnboardingStep = {
  title?: string;
  desc: string;
  imgSrc?: string;
  helper?: string;
  styles?: IntroductionStepStyles;
};

type AnimatedImageProps = { imgSrc: string; alt: string } & Pick<
  IntroductionStepStyles,
  'imageHeight'
>;
const AnimatedImage = ({ imgSrc, alt, imageHeight }: AnimatedImageProps) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={imgSrc}
      initial={{ opacity: 0, x: 10, scale: 0.99 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.99 }}
      transition={{
        opacity: { duration: 0.1 },
        scale: { duration: 0.1 },
        duration: 0.1,
      }}
    >
      <Image
        src={imgSrc}
        alt={alt}
        priority
        width={0}
        height={0}
        sizes="100vw"
        style={{ width: '100%', height: 'auto', minHeight: imageHeight ?? 416 }}
      />
    </motion.div>
  </AnimatePresence>
);

const Content = ({ title, desc, helper }: OnboardingStep) => (
  <IntroductionAnimatedContainer>
    <Flex vertical gap={8}>
      {title && (
        <Title level={5} className="m-0">
          {title}
        </Title>
      )}
      <Text>{desc}</Text>
      {helper && (
        <Text type="secondary" className="text-sm">
          {helper}
        </Text>
      )}
    </Flex>
  </IntroductionAnimatedContainer>
);

type IntroductionProps = OnboardingStep & {
  onPrev: (() => void) | undefined;
  onNext: (() => void) | undefined;
  renderFundingRequirements?: (desc: string) => ReactNode;
  renderDot?: () => ReactNode;
  renderAgentSelection?: () => ReactNode;
  styles?: IntroductionStepStyles;
  /**
   * When true, the step fills its parent's height and pins the slide-nav +
   * agent-selection block to the bottom, leaving the flexible space between it
   * and the (top-aligned) content blank. Used in the onboarding right panel.
   */
  fillHeight?: boolean;
};

/**
 * To display the introduction step of the onboarding process.
 */
export const IntroductionStep = ({
  title,
  desc,
  imgSrc,
  helper,
  onPrev,
  onNext,
  renderDot,
  renderFundingRequirements,
  renderAgentSelection,
  styles: { imageHeight, descPadding } = {},
  fillHeight = false,
}: IntroductionProps) => {
  const isFundingDetailsStep = !title && !imgSrc;

  const media = isFundingDetailsStep ? (
    renderFundingRequirements?.(desc)
  ) : (
    <AnimatedImage
      imgSrc={`/${imgSrc}.png`}
      alt={title ?? ''}
      imageHeight={imageHeight}
    />
  );

  const contentText = isFundingDetailsStep ? null : (
    <div style={{ padding: descPadding ?? '0px 20px', overflow: 'hidden' }}>
      <Content title={title} desc={desc} helper={helper} />
    </div>
  );

  const navAndSelection = (
    <Flex vertical gap={24} align="center" style={{ padding: '0px 24px' }}>
      <Flex gap={12} align="center">
        <Button
          onClick={onPrev}
          disabled={!onPrev}
          size="large"
          style={{ minWidth: 40 }}
          icon={<LeftOutlined />}
        />
        {renderDot && renderDot()}
        <Button
          onClick={onNext}
          disabled={!onNext}
          size="large"
          style={{ minWidth: 40 }}
          icon={<RightOutlined />}
        />
      </Flex>

      {renderAgentSelection ? renderAgentSelection() : null}
    </Flex>
  );

  // Onboarding right panel: content on top, nav + selection pinned to bottom,
  // flexible blank space in between.
  if (fillHeight) {
    return (
      <div
        style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            // Clip the horizontal slide-transition so it doesn't briefly show a
            // horizontal scrollbar while switching between slides.
            overflowX: 'hidden',
          }}
        >
          {media}
          {contentText && <div style={{ paddingTop: 12 }}>{contentText}</div>}
        </div>
        <div style={{ padding: '12px 0px 20px 0px', flexShrink: 0 }}>
          {navAndSelection}
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      {media}

      <div style={{ padding: '12px 0px 20px 0px' }}>
        <Flex vertical gap={24}>
          {contentText}
          {navAndSelection}
        </Flex>
      </div>
    </div>
  );
};
