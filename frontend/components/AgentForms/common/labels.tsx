import { Flex, Typography } from 'antd';

import { FormLabel } from '@/components/ui/Typography';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { COINGECKO_DEMO_API_KEY, GEMINI_API_URL } from '@/constants/urls';

const { Text, Title } = Typography;

export const CoinGeckoApiKeySubHeader = ({
  isSetupPage = false,
}: {
  isSetupPage?: boolean;
}) => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      {isSetupPage ? 'Step 1. ' : ''}
      CoinGecko
    </Title>
    <Text type="secondary">
      The CoinGecko API key enables your agent to fetch real-time token price
      data, ensuring accurate investment calculations.
    </Text>
  </Flex>
);

type AgentsNameLabel = 'Modius' | 'Optimus' | 'Prediction';

export const GeminiApiKeySubHeader = ({
  isSetupPage = false,
  name,
}: {
  isSetupPage?: boolean;
  name: AgentsNameLabel;
}) => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      {isSetupPage ? 'Step 2. ' : ''}
      Gemini API key
    </Title>
    <Text type="secondary">
      The Gemini API key allows you to chat with your agent and update its goals
      through {name} profile.
    </Text>
  </Flex>
);

export const CoinGeckoApiKeyLabel = () => (
  <FormLabel>CoinGecko API key</FormLabel>
);

export const GeminiApiKeyLabel = () => (
  <Flex align="center" gap={6}>
    <FormLabel>Gemini API key</FormLabel>
    <Text className="text-neutral-tertiary text-sm pb-4">– optional</Text>
  </Flex>
);

export const CoinGeckoApiKeyDesc = () => (
  <Flex vertical gap={4} style={{ marginBottom: 252 }}>
    <Text>
      <a target="_blank" href={COINGECKO_DEMO_API_KEY}>
        Learn how to get a free CoinGecko API key&nbsp;
        {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
    </Text>
  </Flex>
);

export const GeminiApiKeyDesc = () => (
  <Flex vertical>
    <Text>
      You can generate Gemini API Key for free on{' '}
      <a target="_blank" rel="noopener noreferrer" href={GEMINI_API_URL}>
        Google AI Studio&nbsp;{UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
      .
    </Text>
  </Flex>
);
