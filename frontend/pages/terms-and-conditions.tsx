import { Divider, Flex, Typography } from 'antd';
import { useRouter } from 'next/router';
import styled from 'styled-components';

import {
  PEARL_LICENSE,
  PEARL_URL,
  SAFE_URL,
  TERMS_AND_CONDITIONS_URL,
  WEB3AUTH_TERMS_AND_CONDITIONS_URL,
  WEB3AUTH_URL,
} from '@/constants/urls';
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

const TransakTermsAndConditions = () => (
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
            For technical reasons (e.g., API key security), the Transak service
            is proxied through Valory AG infrastructure. This proxy
            <Text strong>does not collect, process, or store</Text> any personal
            data, financial data, or transaction details. It serves solely as a{' '}
            <Text strong>transparent pass-through</Text> to Transak&apos;s
            regulated infrastructure.
          </li>
          <li className="mb-12">
            <Text strong>Compliance Responsibility</Text> <br />
            All compliance obligations (e.g., KYC, AML) are handled{' '}
            <Text strong>solely by Transak</Text>. You may be required to
            complete identity verification and provide documentation directly to
            them.
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
            Valory AG assumes no liability for delays, loss, or damages arising
            from the use of Transak or any associated services. You use these
            services at your own risk and subject to Transak&apos;s&nbsp;
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

const DividedOl = styled.ol`
  > li {
    padding: 12px 0 !important;
    border-bottom: 1px solid rgba(5, 5, 5, 0.06);

    &:last-child {
      border-bottom: none;
    }
  }

  ul > li {
    padding: 8px 0;
  }
`;

const Web3AuthTermsAndConditions = () => (
  <TermsContainer>
    <Title level={4}>
      Terms & Conditions for Web3Auth Wallet Creation in Pearl
    </Title>
    <div>
      <Paragraph>
        These “Web3Auth Terms” govern the creation and use of a Web3Auth wallet
        within Pearl. By using this feature, you agree to these{' '}
        <a target="_blank" href={WEB3AUTH_TERMS_AND_CONDITIONS_URL}>
          Web3Auth Terms
        </a>
        , in addition to the{' '}
        <a target="_blank" href={TERMS_AND_CONDITIONS_URL}>
          Pearl Terms
        </a>
        . Where there is discrepancy between the two, the Pearl Terms shall
        control.
      </Paragraph>
      <Divider />

      <Paragraph>
        <DividedOl>
          <li className="mb-12">
            <Title level={5} className="font-weight-600 mt-0 mb-8">
              Definitions
            </Title>
            For purposes of these Web3Auth Terms:
            <ul>
              <li>
                <b>“Pearl Wallet”</b> means your account within the Pearl
                application, including an externally-owned cryptographic wallet,
                encrypted using a user-defined password, and used to control
                underlying wallets, including the MasterSafe (see below).
              </li>
              <li>
                <b>“Web3Auth Wallet”</b> or <b>“Wallet”</b> means the
                cryptographic wallet created through{' '}
                <a target="_blank" href={WEB3AUTH_URL}>
                  Web3Auth&apos;s
                </a>{' '}
                key management system for use as a backup to your Pearl Wallet.
              </li>
              <li>
                <b>“MasterSafe”</b> means your{' '}
                <a target="_blank" href={SAFE_URL}>
                  Safe
                </a>{' '}
                smart contract wallet linked to your Pearl Wallet.
              </li>
              <li>
                <b>“Authentication Provider”</b> means any third-party social
                login provider whitelisted on Web3Auth (e.g., Google, Apple).
              </li>
              <li>
                <b>“Key Component”</b> means a portion of the private key
                generated through Web3Aut&apos;s threshold signature /
                multi-party computation (MPC) system.
              </li>
              <li>
                <b>“Valory”</b> means Valory AG, the company developing the
                open-source application Pearl, available at
                <a target="_blank" href={PEARL_URL}>
                  {PEARL_URL}
                </a>
                .
              </li>
            </ul>
          </li>
          <li className="mb-12">
            <Title level={5} className="font-weight-600 mt-0 mb-8">
              Purpose
            </Title>
            Within the Pearl application, users have the option to create a
            Web3Auth Wallet. The intended <b>purpose</b> of this wallet is to
            serve as a <b>backup wallet</b> for your Pearl Wallet, allowing you
            to re-gain access in case you lose access to your primary Pearl
            Wallet.
          </li>
          <li className="mb-12">
            <Title level={5} className="font-weight-600 mt-0 mb-8">
              How It Works
            </Title>
            <ul>
              <li>
                Wallets created with Web3Auth use a{' '}
                <b>threshold signature / multi-party computation (MPC)</b>{' '}
                scheme. The private key is split into multiple Key Components,
                and no single party holds the full key.
              </li>
              <li>
                When you authenticate with an Authentication Provider, one Key
                Component is derived from your login method. Another is held by
                Web3Auth&apos;s secure infrastructure. Both are required for
                signing transactions.
              </li>
              <li>
                Once created, your Wallet&apos;s <b>public address</b> is added
                as a backup signer to your MasterSafe via Web3Auth.
              </li>
            </ul>
          </li>
          <li className="mb-12">
            <Title level={5} className="font-weight-600 mt-0 mb-8">
              Custody & User Responsibility
            </Title>
            <ul>
              <li>
                The Wallet is <b>semi-custodial</b>: you hold one Key Component;
                Web3Auth holds another.
              </li>
              <li>
                <b>Valory does not have access</b> to your keys or assets.
                Valory does not store Key Components or funds.
              </li>
              <li>
                Therefore, security of the Wallet depends on various factors
                which are all outside of the control of Valory and to some
                extent are controlled by you, your Authentication provider and
                Web3Auth, including (a) your login credentials with your
                Authentication Provider, and (b) Web3Auth&apos;s infrastructure.
              </li>
              <li>
                You are solely responsible for safeguarding your login
                credentials and for all actions authorized through your Wallet.
                Access requires direct authentication with Web3Auth using the
                same method originally used to create the Wallet.
              </li>
            </ul>
          </li>
          <li className="mb-12">
            <Title level={5} className="font-weight-600 mt-0 mb-8">
              Disclaimer of Liability
            </Title>
            By using this feature, you acknowledge and agree that:
            <ul>
              <li>
                Valory is <b>not liable</b> for any loss of funds, assets, or
                access resulting from:
                <ul>
                  <li>Loss or compromise of your login method,</li>
                  <li>Web3Auth service issues or downtime,</li>
                  <li>Security breaches of Web3Auth infrastructure,</li>
                  <li>Any other issues relating to the Web3Auth Wallet.</li>
                </ul>
              </li>
              <li>
                Pearl is an open-source application provided without warranty
                and as is under the following license:{' '}
                <a target="_blank" href={PEARL_LICENSE}>
                  {PEARL_LICENSE}
                </a>
              </li>
              <li>
                You bear full responsibility for risks inherent in the use of
                Web3Auth and blockchain-based services.
              </li>
              <li>
                Valory guarantees no continuity of Web3Auth&apos;s services and
                the backup wallet integration into Pearl.
              </li>
            </ul>
          </li>
          <li className="mb-12">
            <Title level={5} className="font-weight-600 mt-0 mb-8">
              Changes to These Web3Auth Terms
            </Title>
            Valory may amend or update these Web3AuthTerms from time to time.
            Any changes will take effect upon posting within the Pearl app.
            Continued use of the Web3Auth Wallet feature after changes are
            posted constitutes acceptance of the revised Web3Auth Terms.
          </li>
          <li className="mb-12">
            <Title level={5} className="font-weight-600 mt-0 mb-8">
              Governing Law & Jurisdiction
            </Title>
            These Web3Auth Terms are governed by and construed in accordance
            with the laws of <b>Switzerland</b>, without regard to
            conflict-of-law principles. You agree that any dispute arising under
            these Web3Auth Terms shall be subject to the exclusive jurisdiction
            of the competent courts in Zug, Switzerland.
          </li>
        </DividedOl>
      </Paragraph>
    </div>
  </TermsContainer>
);

export default function TermsAndConditionsPage() {
  const router = useRouter();
  const { type } = router.query;

  if (type === 'transak') return <TransakTermsAndConditions />;
  if (type === 'web3auth') return <Web3AuthTermsAndConditions />;
  return null;
}
