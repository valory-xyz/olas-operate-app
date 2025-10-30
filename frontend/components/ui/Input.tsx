import { Input as AntdInput } from 'antd';
import { css, styled } from 'styled-components';

import { COLOR } from '@/constants/colors';

const inputStyles = css`
  background-color: ${COLOR.BACKGROUND};
  border-color: ${COLOR.GRAY_4};

  &:active,
  &:hover,
  &.ant-input-outlined:focus-within,
  &.ant-input-status-error {
    background-color: ${COLOR.BACKGROUND} !important;
  }

  &:hover {
    background-color: ${COLOR.GRAY_4};
    border-color: ${COLOR.GRAY_3};
  }

  &:focus {
    border-color: ${COLOR.PRIMARY};
  }
`;

export const Input = styled(AntdInput)`
  ${inputStyles}
`;

export const TextArea = styled(AntdInput.TextArea)`
  ${inputStyles}
`;
