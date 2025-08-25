import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { ReactNode } from 'react';

import { UnderConstruction } from '@/components/MainPage/sections/AlertSections/UnderConstruction';
import { useServices } from '@/hooks/useServices';

const { Title, Text } = Typography;

export type OnboardingStep = {
  title: string;
  desc: string;
  imgSrc?: string;
  helper?: string;
};

type AnimatedImageProps = { imgSrc: string; alt: string };

const AnimatedImage = ({ imgSrc, alt }: AnimatedImageProps) => (
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
        style={{ width: '100%', height: 'auto', minHeight: 416 }}
      />
    </motion.div>
  </AnimatePresence>
);

const AnimatedContent = ({
  title,
  desc,
  helper,
}: Pick<OnboardingStep, 'title' | 'desc' | 'helper'>) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={title}
      initial={{ opacity: 0, x: 5 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -5 }}
      transition={{ duration: 0.1 }}
    >
      <Flex vertical gap={8}>
        <Title level={5} className="m-0">
          {title}
        </Title>
        <Text>{desc}</Text>
        {helper && (
          <Text type="secondary" className="text-sm">
            {helper}
          </Text>
        )}
      </Flex>
    </motion.div>
  </AnimatePresence>
);

type IntroductionProps = OnboardingStep & {
  onPrev: (() => void) | undefined;
  onNext: (() => void) | undefined;
  renderFundingRequirements?: () => ReactNode;
  renderDot?: () => ReactNode;
  onAgentSelect: () => void;
};

/**
 * Functional component to display the introduction step of the onboarding process.
 */
export const IntroductionStep = ({
  title,
  desc,
  imgSrc,
  helper,
  renderFundingRequirements,
  renderDot,
  onAgentSelect,
  onPrev,
  onNext,
}: IntroductionProps) => {
  const { selectedAgentConfig } = useServices();

  return (
    <div style={{ overflow: 'hidden' }}>
      {imgSrc ? (
        <AnimatedImage imgSrc={`/${imgSrc}.png`} alt={title} />
      ) : (
        renderFundingRequirements?.()
      )}

      <div style={{ padding: '12px 0px 20px 0px' }}>
        <Flex vertical gap={24}>
          <div style={{ padding: '0px 20px', overflow: 'hidden' }}>
            <AnimatedContent title={title} desc={desc} helper={helper} />
          </div>

          {selectedAgentConfig.isUnderConstruction && <UnderConstruction />}

          <Flex
            vertical
            gap={24}
            align="center"
            style={{ padding: '0px 24px' }}
          >
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

            <Button type="primary" block size="large" onClick={onAgentSelect}>
              Select Agent
            </Button>
          </Flex>
        </Flex>
      </div>
    </div>
  );
};
