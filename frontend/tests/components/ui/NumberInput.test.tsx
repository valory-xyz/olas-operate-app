import { fireEvent, render, screen } from '@testing-library/react';

import { NumberInput } from '../../../components/ui/NumberInput';

describe('NumberInput', () => {
  it('renders an input element', () => {
    render(<NumberInput />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('converts string value to number', () => {
    // When value is passed as a string (type assertion), it should be parsed
    render(<NumberInput value={'42.5' as unknown as number} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue('42.5');
  });

  it('passes numeric value through directly', () => {
    render(<NumberInput value={1234} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue('1,234');
  });

  it('formats number with comma separators', () => {
    render(<NumberInput value={1234567} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue('1,234,567');
  });

  it('formats number with decimal part', () => {
    render(<NumberInput value={1234567.89} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue('1,234,567.89');
  });

  describe('allowOnlyNumbers - key filtering', () => {
    const renderInput = (max?: number) => {
      render(<NumberInput max={max} />);
      return screen.getByRole('spinbutton');
    };

    it('allows number keys', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: '5',
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows Backspace', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'Backspace',
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows Delete', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'Delete',
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows ArrowLeft and ArrowRight', () => {
      const input = renderInput();
      ['ArrowLeft', 'ArrowRight'].forEach((key) => {
        const event = new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
        });
        const spy = jest.spyOn(event, 'preventDefault');
        input.dispatchEvent(event);
        expect(spy).not.toHaveBeenCalled();
      });
    });

    it('allows Tab', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows decimal point', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: '.',
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows Ctrl+C (copy)', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows Ctrl+V (paste)', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows Ctrl+X (cut)', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'x',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows Ctrl+A (select all)', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows Meta+C (copy on Mac)', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('prevents non-allowed keys like letters', () => {
      const input = renderInput();
      const event = new KeyboardEvent('keydown', {
        key: 'e',
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
    });

    it('prevents second decimal point', () => {
      render(<NumberInput value={1.5} />);
      const input = screen.getByRole('spinbutton');
      // Simulate typing a '.' when value already has a '.'
      fireEvent.keyDown(input, { key: '.' });
      // The value shouldn't change
      expect(input).toHaveValue('1.5');
    });

    it('prevents value exceeding max', () => {
      render(<NumberInput value={99} max={100} />);
      const input = screen.getByRole('spinbutton');
      const event = new KeyboardEvent('keydown', {
        key: '9',
        bubbles: true,
        cancelable: true,
      });
      const spy = jest.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
    });
  });

  it('passes rest props to InputNumber', () => {
    render(<NumberInput placeholder="Enter amount" />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('placeholder', 'Enter amount');
  });

  it('renders with undefined value', () => {
    render(<NumberInput value={undefined} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
  });
});
