import { CSSProperties } from 'react';
import styled from 'styled-components';

export const Container = styled.div`
  > div:not(:last-child) {
    margin-bottom: 16px;
  }
  .ant-card-body {
    padding: 16px;
  }
`;

export const infoBreakdownParentStyle: CSSProperties = { gap: 8 };
