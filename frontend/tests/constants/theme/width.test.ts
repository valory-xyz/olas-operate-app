/**
 * Tests for layout dimension constants.
 *
 * These values control the fixed pixel dimensions of the Electron window,
 * sidebar, modals, and Ant Design breakpoints. Changes here directly affect
 * the visual layout in the packaged app. Tests pin the values to catch
 * accidental edits.
 */

import {
  ANTD_BREAKPOINTS,
  APP_HEIGHT,
  APP_WIDTH,
  IFRAME_WIDTH,
  MAIN_CONTENT_MAX_WIDTH,
  MESSAGE_WIDTH,
  MODAL_WIDTH,
  POPOVER_WIDTH_LARGE,
  SIDER_WIDTH,
  TOP_BAR_HEIGHT,
} from '../../../constants/theme/width';

describe('app window dimensions', () => {
  it('APP_WIDTH is 1320', () => {
    expect(APP_WIDTH).toBe(1320);
  });

  it('APP_HEIGHT is 796', () => {
    expect(APP_HEIGHT).toBe(796);
  });

  it('IFRAME_WIDTH is 480', () => {
    expect(IFRAME_WIDTH).toBe(480);
  });

  it('all dimensions are positive integers', () => {
    for (const value of [APP_WIDTH, APP_HEIGHT, IFRAME_WIDTH]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe('layout component dimensions', () => {
  it('SIDER_WIDTH is 300', () => {
    expect(SIDER_WIDTH).toBe(300);
  });

  it('TOP_BAR_HEIGHT is 40', () => {
    expect(TOP_BAR_HEIGHT).toBe(40);
  });

  it('MODAL_WIDTH is 512', () => {
    expect(MODAL_WIDTH).toBe(512);
  });

  it('POPOVER_WIDTH_LARGE is 340', () => {
    expect(POPOVER_WIDTH_LARGE).toBe(340);
  });

  it('MESSAGE_WIDTH is 280', () => {
    expect(MESSAGE_WIDTH).toBe(280);
  });

  it('MAIN_CONTENT_MAX_WIDTH is 744', () => {
    expect(MAIN_CONTENT_MAX_WIDTH).toBe(744);
  });
});

describe('ANTD_BREAKPOINTS', () => {
  it('xs breakpoint is 480', () => {
    expect(ANTD_BREAKPOINTS.xs).toBe(480);
  });

  it('sm breakpoint is 576', () => {
    expect(ANTD_BREAKPOINTS.sm).toBe(576);
  });

  it('md breakpoint is 768', () => {
    expect(ANTD_BREAKPOINTS.md).toBe(768);
  });

  it('lg breakpoint is 992', () => {
    expect(ANTD_BREAKPOINTS.lg).toBe(992);
  });

  it('xl breakpoint is 1200', () => {
    expect(ANTD_BREAKPOINTS.xl).toBe(1200);
  });

  it('xxl breakpoint is 1600', () => {
    expect(ANTD_BREAKPOINTS.xxl).toBe(1600);
  });

  it('covers 6 breakpoints (xs, sm, md, lg, xl, xxl)', () => {
    expect(Object.keys(ANTD_BREAKPOINTS)).toHaveLength(6);
  });

  it('breakpoints are in strictly ascending order', () => {
    const ordered = [
      ANTD_BREAKPOINTS.xs,
      ANTD_BREAKPOINTS.sm,
      ANTD_BREAKPOINTS.md,
      ANTD_BREAKPOINTS.lg,
      ANTD_BREAKPOINTS.xl,
      ANTD_BREAKPOINTS.xxl,
    ];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });
});
