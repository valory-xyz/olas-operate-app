import { Flex } from 'antd';
import styled from 'styled-components';

import { ANTD_BREAKPOINTS, MAIN_CONTENT_MAX_WIDTH } from '@/constants';

/**
 * Responsive full-width container capped at MAIN_CONTENT_MAX_WIDTH (744px),
 * centred horizontally. Adds horizontal padding on smaller screens so content
 * never touches the window edges.
 *
 * Pass `$width` to override the default max-width cap.
 */
export const MainContentContainer = styled(Flex)<{ $width?: number }>`
  max-width: ${({ $width }) =>
    $width ? `${$width}px` : `${MAIN_CONTENT_MAX_WIDTH}px`};
  width: 100%;
  margin: 0 auto;

  @media (max-width: ${ANTD_BREAKPOINTS.lg}px) {
    padding: 0 16px;
  }

  @media (max-width: ${ANTD_BREAKPOINTS.md}px) {
    padding: 0 8px;
  }
`;
