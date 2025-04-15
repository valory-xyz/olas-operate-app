import { InputNumber, InputNumberProps } from 'antd';

export const allowOnlyNumbers = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  }

  // Prevent more than one decimal point
  const value = e.currentTarget.value;
  if (e.key === '.' && value.includes('.')) {
    e.preventDefault();
  }
};

export const NumberInput = ({ value, ...rest }: InputNumberProps<number>) => (
  <InputNumber<number>
    {...rest}
    value={typeof value === 'string' ? parseFloat(value) : value}
    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
    onKeyDown={allowOnlyNumbers}
  />
);
