import { Address } from './Address';

export type SafeCreationResponse = {
  safe: Address;
  message: string;
  create_tx?: string;
};
