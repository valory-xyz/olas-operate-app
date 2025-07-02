import { CopyOutlined } from '@ant-design/icons';
import { Button, Flex, message, Tooltip, Typography } from 'antd';
import { useCallback } from 'react';

import { useMasterWalletContext } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';

import { LIGHT_ICON_STYLE } from '../../ui/iconStyles';

const { Text } = Typography;

// TODO: make a shared component similar to AccountCreationAddress
export const DepositAddress = () => {
  const { masterEoa } = useMasterWalletContext();
  const address = masterEoa?.address;

  const handleCopyAddress = useCallback(() => {
    if (address) {
      copyToClipboard(address).then(() => message.success('Address copied!'));
    }
  }, [address]);

  return (
    <Flex gap={8} vertical className="p-16 w-full border-box">
      <Flex justify="space-between" align="center">
        <Text className="text-sm" type="secondary">
          Deposit address
        </Text>
        <Flex gap={10}>
          <Tooltip title="Copy to clipboard" placement="left">
            <Button
              onClick={handleCopyAddress}
              size="small"
              icon={<CopyOutlined style={LIGHT_ICON_STYLE} />}
            />
          </Tooltip>
        </Flex>
      </Flex>
      <span className="can-select-text break-word">{`${address}`}</span>
    </Flex>
  );
};
