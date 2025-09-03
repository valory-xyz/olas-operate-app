import { Flex, Typography } from 'antd';

import { InfoTooltip } from '@/components/InfoTooltip';
import { SupportedMiddlewareChain } from '@/constants/chains';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { AddressLink } from '../AddressLink';

const { Paragraph, Text, Title } = Typography;

type SignerTitleProps = {
  signerAddress: Address;
  middlewareChain: SupportedMiddlewareChain;
};

export const SignerTitle = ({
  signerAddress,
  middlewareChain,
}: SignerTitleProps) => (
  <>
    Signer&nbsp;
    <InfoTooltip>
      <Paragraph className="text-sm">
        Your wallet and agent&apos;s wallet use Safe, a multi-signature wallet.
        The app is designed to trigger transactions on these Safe wallets via
        Signers.
      </Paragraph>
      <Paragraph className="text-sm">
        This setup enables features like the backup wallet.
      </Paragraph>
      <Paragraph className="text-sm m-0">
        <Flex gap={4} vertical>
          <Text className="text-sm">Your wallet signer address:</Text>
          <AddressLink
            address={signerAddress}
            middlewareChain={middlewareChain}
          />
        </Flex>
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
        to claim rewards periodically. Withdrawal of claimed rewards isn&apos;t
        available yet.
      </Paragraph>
    </InfoTooltip>
  </Flex>
);

export const NativeTokenTitle = ({ symbol }: { symbol: TokenSymbol }) => (
  <Flex align="center">
    <Title level={5} className="m-0 text-sm">
      {symbol}
    </Title>
    &nbsp;
    <InfoTooltip>
      {/* TODO: address multi-agent tooltip, specific to agent config */}
      <Paragraph className="text-sm m-0">
        {symbol} is used by the agent to engage in prediction markets. This
        amount will fluctuate based on your agent&apos;s performance.
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
          that gives its owner control over the agent&apos;s settings.
        </Paragraph>
      </Flex>
    </InfoTooltip>
  </Text>
);

export const ServiceNftIdTitle = () => (
  <Text className="text-sm text-light">
    ID&nbsp;
    <InfoTooltip placement="topRight">
      <Paragraph className="text-sm m-0">
        Each minted agent gets a unique ID. Technically, agents are referred to
        as &apos;services&apos;.
      </Paragraph>
    </InfoTooltip>
  </Text>
);
