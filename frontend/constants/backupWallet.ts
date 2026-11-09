import { FormItemProps } from 'antd';

export const BACKUP_WALLET_INVALID_ADDRESS_MESSAGE =
  'Please input a valid backup wallet address!';

export const BACKUP_WALLET_FIELD_RULES: FormItemProps['rules'] = [
  {
    required: true,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    type: 'string',
    message: BACKUP_WALLET_INVALID_ADDRESS_MESSAGE,
  },
];

/** Onboarding refused to create the Pearl Safe: a new backup wallet must be chosen. */
export const BACKUP_SIGNER_NOT_SET_MESSAGE =
  'The backup wallet is not set. Set a backup wallet, then try again.';

/** Onboarding refused to create the Pearl Safe: the backup wallet is still being checked. */
export const BACKUP_SIGNER_CHECKING_MESSAGE =
  'Still checking your backup wallet. Try again in a moment.';
