import { Flex, Typography } from 'antd';

import { InfoTooltip } from '@/components/InfoTooltip';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import {
  COINGECKO_DEMO_API_KEY,
  COINGECKO_URL,
  GEMINI_API_URL,
  TENDERLY_URL,
} from '@/constants/urls';

const { Paragraph, Text, Title } = Typography;

const TOOLTIP_STYLE = { width: '340px' };

/**
 * @deprecated Use `TenderlyAccessTokenLabelV2` instead.
 */
export const TenderlyAccessTokenLabel = () => (
  <Flex align="center" gap={6}>
    <Text>Tenderly access token</Text>
    <InfoTooltip placement="bottom" overlayInnerStyle={TOOLTIP_STYLE}>
      <Paragraph className="text-sm mt-0">
        The Tenderly access token allows your agent to interact with Tenderly’s
        simulation tools, helping it analyze and optimize bridge and swap
        routes.
      </Paragraph>
      <Paragraph className="text-sm m-0">
        To locate your personal access token:
      </Paragraph>
      <ol className="pl-16 text-sm mb-4">
        <li>
          <Text className="text-sm">
            Connect to{' '}
            <a target="_blank" href={TENDERLY_URL}>
              Tenderly&nbsp;
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>{' '}
            and click on your profile photo.
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Go to{' '}
            <span className="font-weight-600">
              Account Settings → Access Tokens.
            </span>
          </Text>
        </li>
      </ol>
    </InfoTooltip>
  </Flex>
);

/**
 * @deprecated Use `TenderlyAccessTokenLabelV2` instead.
 */
export const TenderlyAccountSlugLabel = () => (
  <Flex align="center" gap={6}>
    <Text>Tenderly account slug</Text>
    <InfoTooltip placement="bottom" overlayInnerStyle={TOOLTIP_STYLE}>
      <Paragraph className="text-sm m-0">
        The account slug is a unique identifier for your Tenderly account that
        represents your username. You can find your account slug in your
        Tenderly project settings.
      </Paragraph>
    </InfoTooltip>
  </Flex>
);

/**
 * @deprecated Use `TenderlyAccessTokenLabelV2` instead.
 */
export const TenderlyProjectSlugLabel = () => (
  <Flex align="center" gap={6}>
    <Text>Tenderly project slug</Text>
    <InfoTooltip placement="bottom" overlayInnerStyle={TOOLTIP_STYLE}>
      <Paragraph className="text-sm m-0">
        The project slug is a unique identifier for each project in Tenderly.
        It’s automatically generated from your project’s name. You can find the
        project slug in your Tenderly project settings.
      </Paragraph>
    </InfoTooltip>
  </Flex>
);

/**
 * @deprecated Use `CoinGeckoApiKeyLabelV2` instead.
 */
export const CoinGeckoApiKeyLabel = () => (
  <Flex align="center" gap={6}>
    <Text>CoinGecko API key</Text>
    <InfoTooltip placement="bottom" overlayInnerStyle={TOOLTIP_STYLE}>
      <Paragraph className="text-sm mt-0">
        The CoinGecko API key enables your agent to fetch real-time price data,
        ensuring accurate investment calculations.
      </Paragraph>
      <Paragraph className="text-sm m-0">To locate your API key:</Paragraph>
      <ol className="pl-16 text-sm">
        <li>
          <Text className="text-sm">
            Log in to your{' '}
            <a target="_blank" href={COINGECKO_URL}>
              CoinGecko account&nbsp;
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
            .
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Go to <span className="font-weight-600">Developer Dashboard.</span>
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Find your key under the{' '}
            <span className="font-weight-600">My API Keys</span> section.
          </Text>
        </li>
      </ol>

      <Text className="text-sm">
        <a target="_blank" href={COINGECKO_DEMO_API_KEY}>
          Learn how to create a demo API key&nbsp;
          {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      </Text>
    </InfoTooltip>
  </Flex>
);

/**
 * @deprecated Use `GeminiApiKeyLabelV2` instead.
 */
export const GeminiApiKeyLabel = ({ name }: { name: 'Modius' | 'Optimus' }) => (
  <Flex align="center" gap={6}>
    <Text>Gemini API key</Text>
    <InfoTooltip placement="bottom" overlayInnerStyle={TOOLTIP_STYLE}>
      <Paragraph className="text-sm m-0">
        The Gemini API key allows you to chat with your agent and update its
        goals through {name}’ profile. You can generate one for free on{' '}
        <a target="_blank" rel="noopener noreferrer" href={GEMINI_API_URL}>
          Google AI Studio
        </a>
        .
      </Paragraph>
    </InfoTooltip>
    <Text type="secondary" className="text-sm">
      (Optional)
    </Text>
  </Flex>
);

export const TenderlyApiKeyDesc = ({
  isSetupPage = false,
}: {
  isSetupPage?: boolean;
}) => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      {isSetupPage ? 'Step 1. ' : ''}
      Tenderly
    </Title>
    <Text type="secondary">
      Your agent needs access to a Tenderly project for simulating bridge and
      swap routes for on-chain transactions.
    </Text>
  </Flex>
);

export const CoingeckoApiKeyDesc = ({
  isSetupPage = false,
}: {
  isSetupPage?: boolean;
}) => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      {isSetupPage ? 'Step 2. ' : ''}
      CoinGecko
    </Title>
    <Text type="secondary">
      The CoinGecko API key enables your agent to fetch real-time token price
      data, ensuring accurate investment calculations.
    </Text>
  </Flex>
);

export const GeminiApiKeyDesc = ({
  isSetupPage = false,
  name,
}: {
  isSetupPage?: boolean;
  name: 'Modius' | 'Optimus';
}) => (
  <Flex gap={8} vertical className="mb-32">
    <Title level={5} className="m-0">
      {isSetupPage ? 'Step 3. ' : ''}
      Gemini API key
    </Title>
    <Text type="secondary">
      The Gemini API key allows you to chat with your agent and update its goals
      through {name} profile.
    </Text>
  </Flex>
);

export const TenderlyAccessTokenLabelV2 = () => (
  <Flex vertical gap={24} style={{ marginBottom: 42 }}>
    <Flex vertical gap={6}>
      <Text>
        <Text strong>The Tenderly access</Text> token allows your agent to
        interact with Tenderly’s simulation tools, helping it analyze and
        optimize bridge and swap routes.
      </Text>
      <Text>To locate your personal access token:</Text>
      <Text>
        <ol className="m-0">
          <li>
            Connect to{' '}
            <a href={TENDERLY_URL} target="_blank" rel="noreferrer">
              Tenderly {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>{' '}
            and click on your profile photo.
          </li>
          <li>Go to Account Settings → Access Tokens.</li>
        </ol>
      </Text>
    </Flex>
    <Text>
      <Text strong>The account slug</Text> is a unique identifier for your
      Tenderly account that represents your username. You can find your account
      slug in your Tenderly project settings.
    </Text>
    <Text>
      <Text strong>The project slug</Text> is a unique identifier for each
      project in Tenderly. It’s automatically generated from your project’s
      name. You can find the project slug in your Tenderly project settings.
    </Text>
  </Flex>
);

export const CoinGeckoApiKeyLabelV2 = () => (
  <Flex vertical gap={4} style={{ marginBottom: 90 }}>
    <Text>
      To create your <Text strong>CoinGecko API key</Text>:
    </Text>

    <Text>
      <ol className="m-0">
        <li>
          <Text>
            Log in to your{' '}
            <a target="_blank" href={COINGECKO_URL}>
              CoinGecko account&nbsp;
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
            .
          </Text>
        </li>
        <li>
          <Text>Go to Developer Dashboard.</Text>
        </li>
        <li>
          <Text>Find your key under the My API Keys section.</Text>
        </li>
      </ol>
    </Text>

    <Text>
      <a target="_blank" href={COINGECKO_DEMO_API_KEY}>
        Learn how to create a demo API key&nbsp;
        {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
    </Text>
  </Flex>
);

export const GeminiApiKeyLabelV2 = () => (
  <Flex vertical>
    <Text>
      You can generate <Text strong>Gemini API key</Text> for free on{' '}
      <a target="_blank" rel="noopener noreferrer" href={GEMINI_API_URL}>
        Google AI Studio
      </a>
      .
    </Text>
  </Flex>
);
