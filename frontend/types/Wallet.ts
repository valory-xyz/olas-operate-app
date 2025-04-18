import { Address } from './Address';

export type SafeCreationResponse = {
  safe: Address;
  message: string;
  safe_creation_explorer_link?: string;
};
