import { Card, Flex, Typography } from 'antd';

import { CardTitle } from '@/components/Card/CardTitle';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useWallet } from '@/hooks/useWallet';

import { GoToMainPageButton } from '../GoToMainPageButton';

const { Text } = Typography;

const DISCORD_TICKET_URL =
  'https://discord.com/channels/899649805582737479/1245674435160178712/1263815577240076308';

export const AddBackupWalletViaSafePage = () => {
  const { masterSafeAddress } = useWallet();

  return (
    <Card
      title={<CardTitle title="Add backup wallet via Safe" />}
      bordered={false}
      extra={<GoToMainPageButton />}
    >
      <Flex vertical gap={16}>
        <Flex vertical gap={4}>
          <Text>Manually add backup wallet via Safe interface:</Text>
          <a
            target="_blank"
            href={`https://app.safe.global/settings/setup?safe=gno:${masterSafeAddress}`}
          >
            Add backup wallet {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </a>
        </Flex>

        <Flex vertical gap={4}>
          <Text>Not sure how?</Text>
          <a target="_blank" href={DISCORD_TICKET_URL}>
            Get community assistance via Discord ticket{' '}
            {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </a>
        </Flex>
      </Flex>
    </Card>
  );
};
