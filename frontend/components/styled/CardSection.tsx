import { Flex, FlexProps } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

type CardSectionProps = FlexProps & {
  bordertop?: 'true' | 'false';
  borderbottom?: 'true' | 'false';
  padding?: string;
  vertical?: boolean;
};

/**
 * A styled `Flex` component that represents a section of a card.
 * @note Only use this inside Antd Card components
 * @param {CardSectionProps} props
 */
export const CardSection = styled(Flex)<CardSectionProps>`
  ${(props) => {
    const { padding, borderbottom, bordertop } = props;

    const paddingStyle = `padding: ${padding ?? '0px'};`;
    const borderTopStyle =
      bordertop === 'true'
        ? `border-top: 1px solid ${COLOR.BORDER_GRAY};`
        : 'border-top: none;';
    const borderBottomStyle =
      borderbottom === 'true'
        ? `border-bottom: 1px solid ${COLOR.BORDER_GRAY};`
        : 'border-top: none;';

    const verticalStyle = props.vertical ? 'flex-direction: column;' : '';

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
