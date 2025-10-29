import { isEmpty, isNil } from 'lodash';

export const isNilOrEmpty = <T>(
  values: T | null | undefined,
): values is null | undefined | Extract<T, never> => {
  return isNil(values) || isEmpty(values);
};

export const isNonEmpty = <T>(
  values: T | null | undefined,
): values is Extract<T, object | string | Array<unknown>> => {
  return !isNil(values) && !isEmpty(values);
};
