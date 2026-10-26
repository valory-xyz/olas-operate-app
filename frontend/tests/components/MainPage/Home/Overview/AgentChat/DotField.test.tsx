import { render, screen } from '@testing-library/react';
import React from 'react';

import { DotField } from '../../../../../../components/MainPage/Home/Overview/AgentChat/DotField';

const dots = () =>
  Array.from(screen.getByTestId('dot-field').children) as HTMLElement[];

const delayOf = (dot: HTMLElement) => parseFloat(dot.style.animationDelay);

describe('DotField', () => {
  it('draws the 23 × 9 grid of the design', () => {
    render(<DotField />);

    expect(dots()).toHaveLength(23 * 9);
  });

  it('starts the ripple at the centre and delays it outward', () => {
    render(<DotField />);
    const grid = dots();
    const centre = grid[4 * 23 + 11];
    const corner = grid[0];
    const nextToCentre = grid[4 * 23 + 12];

    expect(delayOf(centre)).toBe(0);
    expect(delayOf(nextToCentre)).toBeGreaterThan(delayOf(centre));
    expect(delayOf(corner)).toBeGreaterThan(delayOf(nextToCentre));
  });

  it('fades the peak towards the edges', () => {
    render(<DotField />);
    const grid = dots();
    const peakOf = (dot: HTMLElement) =>
      parseFloat(dot.style.getPropertyValue('--peak'));

    expect(peakOf(grid[4 * 23 + 11])).toBeGreaterThan(peakOf(grid[0]));
  });
});
