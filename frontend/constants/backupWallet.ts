import { FormItemProps } from 'antd';

export const BACKUP_WALLET_INVALID_ADDRESS_MESSAGE =
  'Please input a valid backup wallet address!';

export const BACKUP_WALLET_FIELD_RULES: FormItemProps['rules'] = [
  {
    required: true,
    len: 42,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    type: 'string',
    message: BACKUP_WALLET_INVALID_ADDRESS_MESSAGE,
  },
];
