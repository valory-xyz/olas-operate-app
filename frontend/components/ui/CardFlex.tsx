import { Card } from 'antd';
import styled from 'styled-components';

type CardFlexProps = {
  $gap?: number;
  $noBodyPadding?: boolean;
  $noBorder?: boolean;
  $padding?: string;
  $onboarding?: boolean;
  $newStyles?: boolean;
};

export const CardFlex = styled(Card)<CardFlexProps>`
  ${(props) => !!props.$noBorder && 'border: none;'}

  ${(props) => !!props.$onboarding && 'width: 624px;'}
  
  border-radius: 16px;
  box-shadow:
    0 35px 10px 0 rgba(170, 193, 203, 0),
    0 23px 9px 0 rgba(170, 193, 203, 0.01),
    0 13px 8px 0 rgba(170, 193, 203, 0.05),
    0 6px 6px 0 rgba(170, 193, 203, 0.09),
    0 1px 3px 0 rgba(170, 193, 203, 0.1);

  .ant-card-body {
    ${(props) => {
      const { $gap, $noBodyPadding } = props;
      const gapStyle = $gap ? `gap: ${$gap}px;` : '';
      const paddingStyle = $noBodyPadding
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
