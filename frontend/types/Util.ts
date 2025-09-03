export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Maybe<T> = Nullable<Optional<T>>;

export type ValueOf<T> = T[keyof T];

/**
 * DeepPartial allows you to make all properties of an object optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * function to strip off the null or undefined types from a type by making an assertion.
 * @note This function should be used if you are confident that the value will never ever be null or undefined.
 *
 * @param value Value that should be assumed to be present
 * @param reason Reason for the assumption
 * @returns void
 */
export function assertRequired<T>(
  value: T | null | undefined,
  reason: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(
      `Failed, value is either null or undefined. Incorrect assumption: ${reason}`,
    );
  }
}

/**
 * function to strip off the null or undefined types from a type by making an assertion at runtime.
 * @note This function should be used if you are confident that the value will never ever be null or undefined.
 *
 * @param value Value that should be assumed to be present
 * @param reason Reason for the assumption
 * @returns `value` that is not null or undefined.
 */
export const ensureRequired = <T>(
  value: T | null | undefined,
  why: string,
): T => {
  assertRequired(value, why);
  return value;
};

/**
 * Get the typed keys of an object.
 *
 * example: { '0xabcd': 1, '0x1234': 2 } will return ['0xabcd', '0x1234']
 */
export const typedKeys = <T extends object>(obj: T): (keyof T)[] => {
  if (typeof obj !== 'object' || obj === null) {
    throw new TypeError('Expected an object');
  }

  return Object.keys(obj) as (keyof T)[];
};
