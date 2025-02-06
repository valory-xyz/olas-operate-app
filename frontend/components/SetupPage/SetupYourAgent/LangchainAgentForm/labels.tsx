import { Flex, Typography } from 'antd';

import { InfoTooltip } from '@/components/InfoTooltip';
import { UNICODE_SYMBOLS } from '@/constants/symbols';

const { Paragraph, Text } = Typography;

const TOOLTIP_STYLE = { width: '400px' };

export const TavilyApiKeyLabel = () => (
  <Flex align="center" gap={8}>
    <Text>Tavily API key</Text>
    <InfoTooltip placement="bottom" overlayInnerStyle={TOOLTIP_STYLE}>
      <Paragraph className="text-sm mt-0">
        The Tavily API Key enables your agent to to use Tavily as one of its AI tools in this example.     
      </Paragraph>
      <Paragraph className="text-sm m-0">To locate your API key:</Paragraph>
      <ol className="pl-16 text-sm">
        <li>
          <Text className="text-sm">
            Log in to your{' '}
            <a target="_blank" href="https://tavily.com/">
              Tavily account&nbsp;
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
            .
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Go to <span className="font-weight-600">Overview.</span>
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Find your key under the{' '}
            <span className="font-weight-600">API Keys</span> section.
          </Text>
        </li>
      </ol>
    </InfoTooltip>
  </Flex>
);

export const OpenAIApiKeyLabel = () => (
  <Flex align="center" gap={8}>
    <Text>OpenAI API key</Text>
    <InfoTooltip placement="bottom" overlayInnerStyle={TOOLTIP_STYLE}>
      <Paragraph className="text-sm mt-0">
        The OpenAI API Key enables your agent to to use OpenAI as one of its tools.     
      </Paragraph>
      <Paragraph className="text-sm m-0">To locate your API key:</Paragraph>
      <ol className="pl-16 text-sm">
        <li>
          <Text className="text-sm">
            Log in to your{' '}
            <a target="_blank" href="https://platform.openai.com/">
              OpenAI account&nbsp;
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
            .
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Go to <span className="font-weight-600">Dashboard.</span>
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Click on <span className="font-weight-600">API Keys</span> on the left menu.
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Click on <span className="font-weight-600">Create new secret key</span> at the top right.
          </Text>
        </li>
        <li>
          <Text className="text-sm">
            Copy you key.
          </Text>
        </li>
      </ol>
    </InfoTooltip>
  </Flex>
);
