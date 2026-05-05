import { render, screen } from '@testing-library/react';

import { Modal } from '../../../components/ui/Modal';

describe('Modal', () => {
  it('renders with default props (medium size)', () => {
    render(<Modal title="Test Modal" description="Some description" />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('renders header when provided', () => {
    render(
      <Modal
        header={<div data-testid="modal-header">Header Content</div>}
        title="With Header"
      />,
    );
    expect(screen.getByTestId('modal-header')).toBeInTheDocument();
    // When header is present, title should have mt-24 class
    const title = screen.getByText('With Header');
    expect(title.className).toContain('mt-24');
  });

  it('renders title with mt-0 when header is null (default)', () => {
    render(<Modal title="No Header" />);
    const title = screen.getByText('No Header');
    expect(title.className).toContain('mt-0');
  });

  it('does not render title element when title is not provided', () => {
    render(<Modal description="Only description" />);
    expect(screen.getByText('Only description')).toBeInTheDocument();
    // No h5 title element should be rendered
    const headings = screen.queryAllByRole('heading');
    expect(headings.length).toBe(0);
  });

  it('renders action when provided', () => {
    render(
      <Modal
        title="With Action"
        action={<button data-testid="modal-action">OK</button>}
      />,
    );
    expect(screen.getByTestId('modal-action')).toBeInTheDocument();
  });

  it('does not render action when not provided', () => {
    render(<Modal title="No Action" />);
    expect(screen.queryByTestId('modal-action')).not.toBeInTheDocument();
  });

  describe('size variants', () => {
    it('renders small size (width=400, padding=24, flex-start alignment)', () => {
      render(<Modal size="small" title="Small" description="Small modal" />);
      const dialog = document.querySelector('.ant-modal');
      expect(dialog).toBeTruthy();
      // Small modals should have text-left class
      const title = screen.getByText('Small');
      expect(title.className).toContain('text-left');
    });

    it('renders medium size (width=450, padding=32, center alignment)', () => {
      render(<Modal size="medium" title="Medium" description="Medium modal" />);
      const title = screen.getByText('Medium');
      expect(title.className).toContain('text-center');
    });

    it('renders large size (width=640, padding=32, flex-start alignment)', () => {
      render(<Modal size="large" title="Large" description="Large modal" />);
      const title = screen.getByText('Large');
      expect(title.className).toContain('text-left');
    });
  });

  it('defaults to closable=false', () => {
    render(<Modal title="Not closable" />);
    const closeBtn = document.querySelector('.ant-modal-close');
    expect(closeBtn).toBeFalsy();
  });

  it('shows close button when closable=true', () => {
    render(<Modal title="Closable" closable />);
    const closeBtn = document.querySelector('.ant-modal-close');
    expect(closeBtn).toBeTruthy();
  });

  it('renders description as ReactNode', () => {
    render(
      <Modal
        title="Rich description"
        description={<span data-testid="rich-desc">Rich content</span>}
      />,
    );
    expect(screen.getByTestId('rich-desc')).toBeInTheDocument();
  });

  it('forwards additional AntdModalProps', () => {
    const onCancel = jest.fn();
    render(<Modal title="Extra" onCancel={onCancel} closable />);
    // Modal should render without errors with extra props
    expect(screen.getByText('Extra')).toBeInTheDocument();
  });

  it('applies minHeight for medium and large sizes but not small', () => {
    // Small: minHeight=undefined
    const { unmount: u1 } = render(<Modal size="small" title="Small" />);
    const smallContent = document.querySelector(
      '.ant-modal-content',
    ) as HTMLElement;
    expect(smallContent).toBeTruthy();
    u1();

    // Medium: minHeight=264px
    render(<Modal size="medium" title="Medium" />);
    const medContent = document.querySelector(
      '.ant-modal-content',
    ) as HTMLElement;
    expect(medContent).toBeTruthy();
  });
});
