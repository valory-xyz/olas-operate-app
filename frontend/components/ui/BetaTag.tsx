import { Tag } from 'antd';
import styled from 'styled-components';

const NoShrinkTag = styled(Tag)`
  flex-shrink: 0;
`;

/** Gray "Beta" pill rendered next to an agent name (selection list, sidebar). */
export const BetaTag = () => (
  <NoShrinkTag bordered={false} className="m-0">
    Beta
  </NoShrinkTag>
);
