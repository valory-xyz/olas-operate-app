/**
 * Module-level event bus for pearl store write notifications.
 *
 * When ElectronApiProvider routes a store.set / store.delete to the
 * backend HTTP API it also emits here so StoreProvider can update
 * its React state immediately, without polling.
 */

type SetHandler = (key: string, value: unknown) => void;
type DeleteHandler = (key: string) => void;

let _onSet: SetHandler | undefined;
let _onDelete: DeleteHandler | undefined;

export const registerPearlStoreSetHandler = (fn: SetHandler): void => {
  _onSet = fn;
};

export const registerPearlStoreDeleteHandler = (fn: DeleteHandler): void => {
  _onDelete = fn;
};

export const emitPearlStoreSet = (key: string, value: unknown): void => {
  _onSet?.(key, value);
};

export const emitPearlStoreDelete = (key: string): void => {
  _onDelete?.(key);
};
