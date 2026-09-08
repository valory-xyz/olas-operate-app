import { css } from 'styled-components';

import { COLOR } from '@/constants';

/**
 * Shared look of a selectable card in the questionnaire: the step-1 friction options and the
 * step-2 rating cards differ only in element and layout, so the selected/hover treatment lives
 * once here. Per the design: a flat light-grey tile with no border, tinted purple when selected.
 */
export const selectableCardStyles = css<{ $selected: boolean }>`
  box-sizing: border-box;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: ${({ $selected }) =>
    $selected ? COLOR.PURPLE_LIGHT_3 : COLOR.GRAY_1};
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${({ $selected }) =>
      $selected ? COLOR.PURPLE_LIGHT_4 : COLOR.GRAY_4};
  }
`;
