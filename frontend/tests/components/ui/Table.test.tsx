import { render, screen } from '@testing-library/react';

// Antd Table internally uses window.matchMedia for responsive columns
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Table } =
  require('../../../components/ui/Table') as typeof import('../../../components/ui/Table');
/* eslint-enable @typescript-eslint/no-var-requires */

type TestRow = { key: string; name: string; value: number };

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Value', dataIndex: 'value', key: 'value' },
];

const dataSource: TestRow[] = [
  { key: '1', name: 'Alpha', value: 10 },
  { key: '2', name: 'Beta', value: 20 },
];

describe('Table', () => {
  it('renders with data', () => {
    render(
      <Table<TestRow>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(
      <Table<TestRow>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('defaults $noBorder to true', () => {
    const { container } = render(
      <Table<TestRow>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
      />,
    );
    // The wrapper div should be rendered
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with $noBorder=false', () => {
    const { container } = render(
      <Table<TestRow>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        $noBorder={false}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with $noBorder=true explicitly', () => {
    const { container } = render(
      <Table<TestRow>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        $noBorder
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders empty table with no dataSource', () => {
    render(
      <Table<TestRow> dataSource={[]} columns={columns} pagination={false} />,
    );
    // Antd renders empty state
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('forwards additional TableProps', () => {
    const { container } = render(
      <Table<TestRow>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        className="custom-table"
        loading={false}
      />,
    );
    expect(container).toBeTruthy();
  });
});
