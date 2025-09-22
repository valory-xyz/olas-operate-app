import { Flex, Typography } from 'antd';
import styled from 'styled-components';

import { APP_HEIGHT, APP_WIDTH } from '@/constants/width';

const { Title, Paragraph, Text } = Typography;

const TermsContainer = styled(Flex)`
  align-items: center;
  flex-direction: column;
  overflow-y: auto;
  height: calc(${APP_HEIGHT}px - 45px);
  width: calc(${APP_WIDTH}px - 45px);
  margin: auto;
`;

export default function TermsAndConditionsPage() {
  return (
    <TermsContainer>
      <Title level={4}>Third-Party Onramp Disclaimer and Terms</Title>
      <div>
        <Paragraph>
          By using the onramp services accessible via this interface, you
          acknowledge and agree to the following:
        </Paragraph>

        <Paragraph>
          <ol>
            <li className="mb-12">
              <Text strong>Third-Party Service Provider</Text> <br />
              The fiat-to-crypto onramp service is provided by{' '}
              <Text strong>Transak</Text>, a regulated Virtual Asset Service
              Provider (VASP), and not by Valory AG or any affiliated entity.
              Although this service is technically accessed via a proxy operated
              by Valory AG for integration purposes, your transaction remains
              exclusively with Transak.
            </li>
            <li className="mb-12">
              <Text strong>Proxy Architecture</Text> <br />
              For technical reasons (e.g., API key security), the Transak
              service is proxied through Valory AG infrastructure. This proxy
              <Text strong>does not collect, process, or store</Text> any
              personal data, financial data, or transaction details. It serves
              solely as a <Text strong>transparent pass-through</Text> to
              Transak&apos;s regulated infrastructure.
            </li>
            <li className="mb-12">
              <Text strong>Compliance Responsibility</Text> <br />
              All compliance obligations (e.g., KYC, AML) are handled{' '}
              <Text strong>solely by Transak</Text>. You may be required to
              complete identity verification and provide documentation directly
              to them.
            </li>
            <li className="mb-12">
              <Text strong>No Financial Intermediation </Text> <br />
              Valory AG does not custody user funds, set prices, or act as an
              intermediary, counterparty, or payment processor. All fiat and
              crypto transactions are conducted directly between the user and
              Transak.
            </li>
            <li className="mb-12">
              <Text strong>Limitation of Liability</Text> <br />
              Valory AG assumes no liability for delays, loss, or damages
              arising from the use of Transak or any associated services. You
              use these services at your own risk and subject to
              Transak&apos;s&nbsp;
              <a target="_blank" href="https://transak.com/terms-of-service">
                Terms of Service
              </a>
              .
            </li>
            <li className="mb-12">
              <Text strong>Service Attribution</Text> <br />
              This integration is offered for your convenience, and all onramp
              services are clearly branded and operated by Transak.
            </li>
          </ol>
        </Paragraph>

        <Paragraph>
          By proceeding, you acknowledge and accept these terms and understand
          that Valory AG is not providing any regulated financial or asset
          services.
        </Paragraph>
      </div>
    </TermsContainer>
  );
}
