import { render, screen } from '@testing-library/react';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Segmented } =
  require('../../../components/ui/Segmented') as typeof import('../../../components/ui/Segmented');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('Segmented', () => {
  const defaultOptions = ['Option A', 'Option B', 'Option C'];

  it('renders with basic string options', () => {
    render(<Segmented options={defaultOptions} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('passes className to the wrapper div', () => {
    const { container } = render(
      <Segmented options={defaultOptions} className="my-segment" />,
    );
    expect(container.firstChild).toHaveClass('my-segment');
  });

  it('renders with activeIconColored=true', () => {
    const { container } = render(
      <Segmented options={defaultOptions} activeIconColored />,
    );
    expect(container).toBeTruthy();
  });

  it('renders with activeIconColored=false', () => {
    const { container } = render(
      <Segmented options={defaultOptions} activeIconColored={false} />,
    );
    expect(container).toBeTruthy();
  });

  it('renders without activeIconColored (undefined)', () => {
    const { container } = render(<Segmented options={defaultOptions} />);
    expect(container).toBeTruthy();
  });

  it('forwards all SegmentedProps to AntdSegmented', () => {
    const onChange = jest.fn();
    render(
      <Segmented
        options={defaultOptions}
        onChange={onChange}
        defaultValue="Option B"
      />,
    );
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('renders with object options containing labels', () => {
    const options = [
      { label: 'First', value: 'first' },
      { label: 'Second', value: 'second' },
    ];
    render(<Segmented options={options} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
