import { Flex, Typography } from 'antd';
import { LuInfo } from 'react-icons/lu';

import { FormLabel } from '@/components/ui/Typography';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import {
  COINGECKO_DEMO_API_URL,
  GEMINI_API_URL,
  OPEN_AI_API_URL,
  X_ACCOUNT_API_TOKENS_GUIDE_URL,
} from '@/constants/urls';

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

export const OpenAiApiKeySubHeader = () => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      OpenAI API key
    </Title>
    <Text type="secondary">
      The OpenAI API key allows your agent to choose the best next action to
      care for your pet.
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

export const OpenAiApiKeyLabel = () => (
  <Flex align="center" gap={6}>
    <FormLabel>OpenAI API key</FormLabel>
  </Flex>
);

export const CoinGeckoApiKeyDesc = () => (
  <Flex vertical gap={4} style={{ marginBottom: 252 }}>
    <Text>
      <a target="_blank" href={COINGECKO_DEMO_API_URL}>
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

export const PersonaDescriptionLabel = () => (
  <FormLabel>Persona Description</FormLabel>
);

export const XAccountUsernameLabel = () => <FormLabel>X username</FormLabel>;

export const XAccountConsumerApiKeyLabel = () => (
  <FormLabel>Consumer API key</FormLabel>
);

export const XAccountConsumerApiKeySecretLabel = () => (
  <FormLabel>Consumer API key secret</FormLabel>
);

export const XAccountBearerTokenLabel = () => (
  <FormLabel>Bearer Token</FormLabel>
);

export const XAccountAccessTokenLabel = () => (
  <FormLabel>Access Token</FormLabel>
);

export const XAccountAccessTokenSecretLabel = () => (
  <FormLabel>Access token secret</FormLabel>
);

export const PersonaDescriptionSubHeader = ({
  isSetupPage = false,
}: {
  isSetupPage?: boolean;
}) => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      {isSetupPage ? 'Step 1. ' : ''}
      Persona description
    </Title>
    <Text type="secondary">
      Describe how your agent should write and behave when posting on X
      (Twitter).
    </Text>
  </Flex>
);

export const PersonaDescriptionExtra = () => (
  <Flex gap={6} align="center" className="mt-4 mb-8">
    <LuInfo size={16} style={{ flexShrink: 0 }} />
    <Text className="text-sm">
      You can update the persona description later if you want.
    </Text>
  </Flex>
);

export const XAccountApiTokensSubHeader = ({
  isSetupPage = false,
}: {
  isSetupPage?: boolean;
}) => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      {isSetupPage ? 'Step 2. ' : ''}X account API tokens
    </Title>
    <Text type="secondary">
      X account API tokens enable your agent to view X and interact with other
      agents.
    </Text>
  </Flex>
);

export const PersonaDescriptionDesc = () => (
  <Flex vertical gap={24} style={{ marginBottom: 56 }}>
    <Text strong>How to describe your agent persona</Text>

    <Text>
      Persona tells your agent how to post on X. The clearer it is, the more
      consistent the posts will feel.
    </Text>

    <Text>
      Start with a short role and audience <br />
      <Text className="text-neutral-tertiary">
        “Crypto philosopher commenting on current crypto narratives.”
      </Text>
    </Text>

    <Text>
      Add a few words for tone. <br />
      <Text className="text-neutral-tertiary">
        “Curious, analytical, optimistic, no hype.”
      </Text>
    </Text>

    <Text>
      List topics to focus on and to avoid <br />
      <Text className="text-neutral-tertiary">
        “Focus on Crypto x AI industry. Avoid trading calls or financial
        advice.”
      </Text>
    </Text>
  </Flex>
);
export const XAccountApiTokensDesc = () => (
  <Flex vertical gap={4} style={{ marginBottom: 252 }}>
    <Text>
      To learn more on how to get the API tokens, please refer to the{' '}
      <a target="_blank" href={X_ACCOUNT_API_TOKENS_GUIDE_URL}>
        Step-by-step guide&nbsp;{UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
    </Text>
  </Flex>
);

export const OpenAiApiKeyDesc = () => (
  <Text>
    Please provide with your Open AI Api Key. If you do not own one, follow
    instructions to get it for free{' '}
    <a target="_blank" rel="noopener noreferrer" href={OPEN_AI_API_URL}>
      here&nbsp;{UNICODE_SYMBOLS.EXTERNAL_LINK}
    </a>
    .
  </Text>
);
