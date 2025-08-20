import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

const LINE_HEIGHT = 46;
const CARD_MARGIN = 24;

const TopCorner = styled.div<{ $position: 'left' | 'right' }>`
  position: absolute;
  bottom: ${LINE_HEIGHT}px;
  height: ${CARD_MARGIN}px;
  width: ${CARD_MARGIN}px;
  background: ${COLOR.GRAY_4};
  ${({ $position }) =>
    $position === 'left'
      ? `left: -${CARD_MARGIN - 1}px;`
      : `right: -${CARD_MARGIN - 1}px;`}

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    height: ${CARD_MARGIN}px;
    width: ${CARD_MARGIN}px;
    background: ${COLOR.WHITE};
    ${({ $position }) =>
      $position === 'left'
        ? `left: 0; border-radius: 0 0 0 20px;`
        : `right: 0; border-radius: 0 0 20px 0;`}
  }
`;

const Container = styled.div`
  background: ${COLOR.GRAY_4};
  margin: ${CARD_MARGIN}px -${CARD_MARGIN - 1}px -${CARD_MARGIN - 1}px;
  text-align: center;
  padding: 12px;
  height: ${LINE_HEIGHT}px;
  overflow: hidden;
  border-bottom-right-radius: 10px;
  border-bottom-left-radius: 10px;
`;

const Text = styled.span`
  color: ${COLOR.TEXT_LIGHT};
  position: relative;
  z-index: 1;
`;

export const AgentActivity = () => {
  return (
    <Container>
      <TopCorner $position="left" />
      <TopCorner $position="right" />
      <Text>Agent is not running</Text>
    </Container>
  );
};
