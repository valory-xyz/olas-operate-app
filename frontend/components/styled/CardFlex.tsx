import { Card } from 'antd';
import styled from 'styled-components';

type CardFlexProps = {
  /** @deprecated Use $gap instead */
  gap?: number;
  /** @deprecated Use $noBodyPadding instead */
  noBodyPadding?: 'true' | 'false';
  /** @deprecated Use $noBorder instead */
  noBorder?: boolean;
  $gap?: number;
  $noBodyPadding?: boolean;
  $noBorder?: boolean;
  $padding?: string;
};

export const CardFlex = styled(Card).withConfig({
  shouldForwardProp: (prop: string) =>
    !['gap', 'noBodyPadding', 'noBorder'].includes(prop),
})<CardFlexProps>`
  ${(props) => !!(props.noBorder || props.$noBorder) && 'border: none;'}

  .ant-card-body {
    ${(props) => {
      const {
        gap: legacyGap,
        $gap,
        noBodyPadding: legacyNoBodyPadding,
        $noBodyPadding,
      } = props;
      const gap = legacyGap || $gap;
      const noBodyPadding = legacyNoBodyPadding === 'true' || $noBodyPadding;

      const gapStyle = gap ? `gap: ${gap}px;` : '';
      const paddingStyle = noBodyPadding
        ? 'padding: 0;'
        : (props.$padding && `padding: ${props.$padding};`) || '';

      return `
        display: flex; 
        flex-direction: column; 
        ${gapStyle} 
        ${paddingStyle}
      `;
    }}
  }
`;
