import { Flex, Typography } from 'antd';

import { InfoTooltip } from '@/components/InfoTooltip';

const { Paragraph, Text, Title } = Typography;

export const SignerTitle = () => (
  <>
    Signer&nbsp;
    <InfoTooltip>
      <Paragraph className="text-sm">
        Your wallet and agent’s wallet use Safe, a multi-signature wallet. The
        app is designed to trigger transactions on these Safe wallets via
        Signers.
      </Paragraph>
      <Paragraph className="text-sm">
        This setup enables features like the backup wallet.
      </Paragraph>
      <Paragraph className="text-sm m-0">
        Note: Signer’s XDAI balance is included in wallet XDAI balances.
      </Paragraph>
    </InfoTooltip>
  </>
);

export const OlasTitle = () => (
  <Flex align="center">
    <Title level={5} className="m-0 text-sm">
      OLAS
    </Title>
    &nbsp;
    <InfoTooltip>
      <Paragraph className="text-sm m-0">
        Agent rewards accumulate in the staking contract. The agent is designed
        to claim rewards periodically. Withdrawal of claimed rewards isn’t
        available yet.
      </Paragraph>
    </InfoTooltip>
  </Flex>
);

export const XdaiTitle = () => (
  <Flex align="center">
    <Title level={5} className="m-0 text-sm">
      XDAI
    </Title>
    &nbsp;
    <InfoTooltip>
      <Paragraph className="text-sm m-0">
        XDAI is used by the agent to engage in prediction markets. This amount
        will fluctuate based on your agent’s performance.
      </Paragraph>
    </InfoTooltip>
  </Flex>
);

export const OwnershipNftTitle = () => (
  <Text className="text-sm text-light">
    Ownership NFT&nbsp;
    <InfoTooltip>
      <Flex gap={4} vertical>
        <Text strong className="text-sm">
          You own your agent
        </Text>
        <Paragraph className="text-sm m-0">
          Agents are minted through the Olas Registry. Each agent has an NFT
          that gives its owner control over the agent’s settings.
        </Paragraph>
      </Flex>
    </InfoTooltip>
  </Text>
);

export const ServiceIdTitle = () => (
  <Text className="text-sm text-light">
    ID&nbsp;
    <InfoTooltip placement="topRight">
      <Paragraph className="text-sm m-0">
        Each minted agent gets a unique ID. Technically, agents are referred to
        as ‘services’.
      </Paragraph>
    </InfoTooltip>
  </Text>
);
