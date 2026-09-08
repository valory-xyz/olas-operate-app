import { css } from 'styled-components';

import { COLOR } from '@/constants';

/**
 * Shared look of a selectable card in the questionnaire: the step-1 friction options and the
 * step-2 rating cards differ only in element and layout, so the selected/hover treatment lives
 * once here.
 */
export const selectableCardStyles = css<{ $selected: boolean }>`
  padding: 12px;
  border: 1px solid
    ${({ $selected }) => ($selected ? COLOR.PURPLE : COLOR.GRAY_3)};
  border-radius: 8px;
  background: ${({ $selected }) =>
    $selected ? COLOR.PURPLE_LIGHT_3 : COLOR.WHITE};
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;

  &:hover {
    border-color: ${COLOR.BORDER_COLOR.HOVER.DEFAULT};
  }
`;
