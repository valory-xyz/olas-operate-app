import { render, screen } from '@testing-library/react';

import { Alert } from '../../../components/ui/Alert';

describe('Alert', () => {
  const alertTypes = [
    'primary',
    'info',
    'warning',
    'error',
    'success',
  ] as const;

  describe.each(alertTypes)('type="%s"', (type) => {
    it('renders the message', () => {
      render(<Alert type={type} message={`${type} message`} />);
      expect(screen.getByText(`${type} message`)).toBeInTheDocument();
    });

    it(`applies custom-alert--${type} class`, () => {
      render(<Alert type={type} message="test" data-testid="alert" />);
      const el = screen.getByRole('alert');
      expect(el.className).toContain(`custom-alert--${type}`);
    });
  });

  it('maps type="primary" to undefined for AntdAlert (no type prop)', () => {
    render(<Alert type="primary" message="Primary" />);
    const el = screen.getByRole('alert');
    // Should not have info/warning/error/success antd class
    expect(el).toBeInTheDocument();
  });

  it('includes icon when showIcon is true', () => {
    render(<Alert type="warning" message="With icon" showIcon />);
    // Icon rendered — the alert should contain the icon element
    const alert = screen.getByRole('alert');
    expect(alert.querySelector('.anticon')).toBeTruthy();
  });

  it('does not include icon when showIcon is false', () => {
    render(<Alert type="warning" message="No icon" showIcon={false} />);
    const alert = screen.getByRole('alert');
    expect(alert.querySelector('.ant-alert-icon')).toBeFalsy();
  });

  it('applies full-width class when fullWidth is true', () => {
    render(<Alert type="info" message="Full" fullWidth />);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('custom-alert--full-width');
  });

  it('does not apply full-width class when fullWidth is false', () => {
    render(<Alert type="info" message="Not full" />);
    const el = screen.getByRole('alert');
    expect(el.className).not.toContain('custom-alert--full-width');
  });

  it('applies centered class when centered is true', () => {
    render(<Alert type="info" message="Centered" centered />);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('custom-alert--centered');
  });

  it('does not apply centered class when centered is false', () => {
    render(<Alert type="info" message="Not centered" />);
    const el = screen.getByRole('alert');
    expect(el.className).not.toContain('custom-alert--centered');
  });

  it('appends additional className', () => {
    render(<Alert type="info" message="Extra" className="extra-class" />);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('extra-class');
  });

  it('combines fullWidth, centered, and className together', () => {
    render(
      <Alert
        type="error"
        message="All"
        fullWidth
        centered
        className="custom"
      />,
    );
    const el = screen.getByRole('alert');
    expect(el.className).toContain('custom-alert--full-width');
    expect(el.className).toContain('custom-alert--centered');
    expect(el.className).toContain('custom');
  });

  it('renders correct icon for each type when showIcon is true', () => {
    // primary and info both use InfoCircleOutlined
    const { unmount: u1 } = render(
      <Alert type="primary" message="p" showIcon />,
    );
    expect(
      screen.getByRole('alert').querySelector('.anticon-info-circle'),
    ).toBeTruthy();
    u1();

    const { unmount: u2 } = render(
      <Alert type="success" message="s" showIcon />,
    );
    expect(
      screen.getByRole('alert').querySelector('.anticon-check-circle'),
    ).toBeTruthy();
    u2();

    const { unmount: u3 } = render(
      <Alert type="warning" message="w" showIcon />,
    );
    expect(
      screen.getByRole('alert').querySelector('.anticon-warning'),
    ).toBeTruthy();
    u3();

    render(<Alert type="error" message="e" showIcon />);
    expect(
      screen.getByRole('alert').querySelector('.anticon-warning'),
    ).toBeTruthy();
  });

  it('forwards extra AntdAlertProps like description', () => {
    render(<Alert type="info" message="Title" description="Details here" />);
    expect(screen.getByText('Details here')).toBeInTheDocument();
  });
});
