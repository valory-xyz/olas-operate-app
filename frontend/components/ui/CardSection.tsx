import { Flex, FlexProps } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

type CardSectionProps = FlexProps & {
  /** @deprecated Use $borderTop instead */
  bordertop?: 'true' | 'false';
  /** @deprecated Use $borderBottom instead */
  borderbottom?: 'true' | 'false';
  /** @deprecated Use $padding instead */
  padding?: string;
  $borderTop?: boolean;
  $borderBottom?: boolean;
  $padding?: string;
};

/**
 * A styled `Flex` component that represents a section of a card.
 * @note Only use this inside Antd Card components
 * @param {CardSectionProps} props
 */
export const CardSection = styled(Flex)<CardSectionProps>`
  ${(props) => {
    const {
      padding,
      borderbottom,
      bordertop,
      vertical,
      $borderBottom,
      $borderTop,
      $padding,
    } = props;

    const paddingStyle = `padding: ${(padding || $padding) ?? '0px'};`;
    const borderTopStyle =
      bordertop === 'true' || $borderTop
        ? `border-top: 1px solid ${COLOR.BORDER_GRAY};`
        : 'border-top: none;';
    const borderBottomStyle =
      borderbottom === 'true' || $borderBottom
        ? `border-bottom: 1px solid ${COLOR.BORDER_GRAY};`
        : 'border-bottom: none;';
    const verticalStyle = vertical ? 'flex-direction: column;' : '';

    return `
      ${paddingStyle}
      ${borderTopStyle}
      ${borderBottomStyle}
      ${verticalStyle}
    `;
  }}

  border-collapse: collapse;
  margin-left: -24px;
  margin-right: -24px;
`;
