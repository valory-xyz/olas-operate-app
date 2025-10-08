import { InputNumber, InputNumberProps } from 'antd';

const allowOnlyNumbers =
  (maxValue?: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c';
    const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v';
    const isCut = (e.ctrlKey || e.metaKey) && e.key === 'x';
    const isSelectAll = (e.ctrlKey || e.metaKey) && e.key === 'a';

    if (
      !/[0-9]/.test(e.key) &&
      e.key !== 'Backspace' &&
      e.key !== 'Delete' &&
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight' &&
      e.key !== 'Tab' &&
      e.key !== '.' &&
      !isCopy &&
      !isPaste &&
      !isCut &&
      !isSelectAll
    ) {
      e.preventDefault();
      return;
    }

    // Prevent more than one decimal point
    const value = e.currentTarget.value;
    if (e.key === '.' && value.includes('.')) {
      e.preventDefault();
      return;
    }

    // 🚫 Prevent typing a number > maxValue
    if (maxValue !== undefined && maxValue && /[0-9]/.test(e.key)) {
      const selectionStart = e.currentTarget.selectionStart ?? value.length;
      const selectionEnd = e.currentTarget.selectionEnd ?? value.length;

      // build next value
      const nextValue =
        value.slice(0, selectionStart) + e.key + value.slice(selectionEnd);

      // remove commas, then parse
      const numericValue = Number(nextValue.replace(/,/g, ''));

      if (numericValue > maxValue) {
        e.preventDefault();
      }
    }
  };

export const NumberInput = ({
  value,
  max,
  ...rest
}: InputNumberProps<number>) => (
  <InputNumber<number>
    {...rest}
    value={typeof value === 'string' ? parseFloat(value) : value}
    // example: 1234567.8924 => "1,234,567.8924"
    formatter={(value) => {
      const [intPart, decPart] = `${value}`.split('.');
      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return decPart !== undefined
        ? `${formattedInt}.${decPart}`
        : formattedInt;
    }}
    onKeyDown={allowOnlyNumbers(max)}
  />
);
