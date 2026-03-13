/**
 * Shared styled-components mock for tests.
 *
 * Usage in test files:
 *   jest.mock('styled-components', () =>
 *     require('../mocks/styledComponents').styledComponentsMock,
 *   );
 *
 * Or from deeper paths:
 *   jest.mock('styled-components', () =>
 *     require('../../../mocks/styledComponents').styledComponentsMock,
 *   );
 */

import React from 'react';

type StyledTag = string | React.ComponentType<Record<string, unknown>>;

/** Strip transient $-prefixed props so they don't leak to the DOM. */
const stripTransient = (props: Record<string, unknown>) => {
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!k.startsWith('$')) filtered[k] = v;
  }
  return filtered;
};

const makePassthrough = (Component: StyledTag) => {
  const tagFn = () => {
    if (typeof Component === 'string') {
      // styled.div / styled.span / etc.
      const ForwardedStyled = React.forwardRef<
        HTMLElement,
        Record<string, unknown>
      >(function ForwardedStyled(props, ref) {
        return React.createElement(Component, {
          ...stripTransient(props),
          ref,
        });
      });
      return ForwardedStyled;
    }

    // styled(SomeComponent) — wrap to strip transient props before forwarding,
    // and copy over static properties (e.g., Form.useForm, Form.Item)
    const WrappedComponent = React.forwardRef<unknown, Record<string, unknown>>(
      function WrappedComponent(props, ref) {
        return React.createElement(Component, {
          ...stripTransient(props),
          ref,
        });
      },
    );
    // Preserve static properties from the original component
    // (e.g., Form.useForm, Form.Item)
    Object.keys(Component).forEach((key) => {
      (WrappedComponent as unknown as Record<string, unknown>)[key] = (
        Component as unknown as Record<string, unknown>
      )[key];
    });
    return WrappedComponent;
  };
  tagFn.withConfig = () => tagFn;
  tagFn.attrs = () => tagFn;
  return tagFn;
};

const styledFn = (Component: StyledTag) => makePassthrough(Component);

const handler: ProxyHandler<typeof styledFn> = {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    return makePassthrough(prop as string);
  },
};

const actual = jest.requireActual('styled-components');

export const styledComponentsMock = {
  ...actual,
  __esModule: true,
  default: new Proxy(styledFn, handler),
};
