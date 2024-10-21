import { Card } from 'antd';
import styled from 'styled-components';

type CardFlexProps = {
  gap?: number;
  noBodyPadding?: 'true' | 'false';
};
export const CardFlex = styled(Card).withConfig({
  shouldForwardProp: (prop: string) => !['gap', 'noBodyPadding'].includes(prop),
})<CardFlexProps>`
  .ant-card-body {
    ${(props) => {
      const { gap, noBodyPadding } = props;

      const gapStyle = gap ? `gap: ${gap}px;` : '';
      const paddingStyle = noBodyPadding === 'true' ? 'padding: 0;' : '';

      return `${gapStyle} ${paddingStyle}`;
    }}
    display: flex;
    flex-direction: column;
  }
`;
