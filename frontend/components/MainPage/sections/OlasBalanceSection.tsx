import { Button, Flex, Skeleton, Typography } from 'antd';
import { isNumber } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { AnimateNumber } from '@/components/ui/animations/AnimateNumber';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePageState } from '@/hooks/usePageState';
import { usePrevious } from '@/hooks/usePrevious';
import { useSharedContext } from '@/hooks/useSharedContext';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

const Balance = styled.span`
  letter-spacing: -2px;
  margin-right: 4px;
`;

const BalanceLoader = () => (
  <Skeleton.Button
    active
    size="large"
    style={{ margin: '8px 4px 0px 0px', width: 160 }}
  />
);

export const MainOlasBalance = () => {
  const isBalanceBreakdownEnabled = useFeatureFlag('manage-wallet');
  const { goto } = usePageState();
  const {
    isMainOlasBalanceLoading,
    mainOlasBalance,
    hasMainOlasBalanceAnimatedOnLoad,
    setMainOlasBalanceAnimated,
  } = useSharedContext();
  const [isAnimating, setIsAnimating] = useState(false);

  const previousMainOlasBalance = usePrevious(mainOlasBalance);

  useEffect(() => {
    if (
      !isMainOlasBalanceLoading &&
      isNumber(mainOlasBalance) &&
      !hasMainOlasBalanceAnimatedOnLoad
    ) {
      setMainOlasBalanceAnimated(true);
    }
  }, [
    isMainOlasBalanceLoading,
    mainOlasBalance,
    hasMainOlasBalanceAnimatedOnLoad,
    setMainOlasBalanceAnimated,
  ]);

  // boolean to trigger animation
  const triggerAnimation = useMemo(() => {
    if (isAnimating) return true;

    if (isMainOlasBalanceLoading) return false;

    if (!isNumber(mainOlasBalance)) return false;

    // if balance has not been animated on load
    if (!hasMainOlasBalanceAnimatedOnLoad) return true;

    // if previous balance is not a number but already animated
    // example: navigating to another page and coming back
    if (
      hasMainOlasBalanceAnimatedOnLoad &&
      !isNumber(previousMainOlasBalance)
    ) {
      return false;
    }

    // if balance has NOT changed
    if (mainOlasBalance === previousMainOlasBalance) return false;

    return true;
  }, [
    isAnimating,
    isMainOlasBalanceLoading,
    mainOlasBalance,
    previousMainOlasBalance,
    hasMainOlasBalanceAnimatedOnLoad,
  ]);

  const onAnimationChange = useCallback((inProgress: boolean) => {
    setIsAnimating(inProgress);
  }, []);

  return (
    <CardSection
      vertical
      gap={8}
      $borderTop={true}
      $borderBottom={true}
      $padding="16px 24px"
    >
      <Flex vertical gap={8}>
        <Flex align="center" justify="space-between">
          <Text type="secondary">Current balance</Text>
          {isBalanceBreakdownEnabled && (
            <Button
              size="small"
              disabled={isMainOlasBalanceLoading}
              onClick={() => goto(Pages.ManageWallet)}
              className="text-sm"
            >
              Manage wallet
            </Button>
          )}
        </Flex>

        <Flex align="end">
          <span className="balance-symbol">{UNICODE_SYMBOLS.OLAS}</span>
          {isMainOlasBalanceLoading ? (
            <BalanceLoader />
          ) : (
            <Balance className="balance">
              <AnimateNumber
                value={mainOlasBalance}
                triggerAnimation={isAnimating || !!triggerAnimation}
                onAnimationChange={onAnimationChange}
              />
            </Balance>
          )}
          <span className="balance-currency">OLAS</span>
        </Flex>
      </Flex>
    </CardSection>
  );
};
