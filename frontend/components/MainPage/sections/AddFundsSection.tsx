import {
  CopyOutlined,
  // QrcodeOutlined,
} from '@ant-design/icons';
import {
  Button,
  Flex,
  message,
  Popover,
  // QRCode,
  Tooltip,
  Typography,
} from 'antd';
import { BigNumber, Contract, ethers } from 'ethers';
import Link from 'next/link';
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useInterval } from 'usehooks-ts';

import { ERC20_BALANCE_OF_STRING_FRAGMENT } from '@/abis/erc20';
import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG } from '@/config/tokens';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { COW_SWAP_GNOSIS_XDAI_OLAS_URL } from '@/constants/urls';
import { useWallet } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { delayInSeconds } from '@/utils/delay';
import { truncateAddress } from '@/utils/truncate';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

const CustomizedCardSection = styled(CardSection)<{ border?: boolean }>`
  > .ant-btn {
    width: 50%;
  }
`;

export const AddFundsSection = () => {
  const fundSectionRef = useRef<HTMLDivElement>(null);
  const [isAddFundsVisible, setIsAddFundsVisible] = useState(false);

  const addFunds = useCallback(async () => {
    setIsAddFundsVisible(true);

    await delayInSeconds(0.1);
    fundSectionRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  const closeAddFunds = useCallback(() => setIsAddFundsVisible(false), []);

  return (
    <>
      <CustomizedCardSection gap={12} padding="24px">
        <Button
          type="default"
          size="large"
          onClick={isAddFundsVisible ? closeAddFunds : addFunds}
        >
          {isAddFundsVisible ? 'Close instructions' : 'Add funds'}
        </Button>

        <Popover
          placement="topRight"
          trigger={['hover', 'click']}
          content={<Text>Ability to withdraw is coming soon</Text>}
        >
          <Button type="default" size="large" disabled>
            Withdraw
          </Button>
        </Popover>
      </CustomizedCardSection>

      {isAddFundsVisible && <OpenAddFundsSection ref={fundSectionRef} />}
    </>
  );
};

export const OpenAddFundsSection = forwardRef<HTMLDivElement>((_, ref) => {
  const { masterSafeAddress } = useWallet();

  const truncatedFundingAddress: string | undefined = useMemo(
    () => masterSafeAddress && truncateAddress(masterSafeAddress, 4),
    [masterSafeAddress],
  );

  const [ethEth, setethEth] = useState(0);
  const [ethUsdc, setethUsdc] = useState(0);

  const [opEth, setopEth] = useState(0);
  const [opOlas, setopOlas] = useState(0);

  const [baseEth, setbaseEth] = useState(0);

  const handleCopyAddress = useCallback(
    () =>
      masterSafeAddress &&
      copyToClipboard(masterSafeAddress).then(() =>
        message.success('Copied successfully!'),
      ),
    [masterSafeAddress],
  );

  useInterval(async () => {
    if (!masterSafeAddress) return;
    await Promise.allSettled([
      ETHEREUM_PROVIDER.getBalance(masterSafeAddress)
        .then(ethers.utils.formatEther)
        .then(Number)
        .then(setethEth),
      //USDC balance
      new Contract(
        TOKEN_CONFIG[CHAIN_CONFIG.ETHEREUM.chainId]['USDC'].address,
        ERC20_BALANCE_OF_STRING_FRAGMENT,
        ETHEREUM_PROVIDER,
      )
        .balanceOf(masterSafeAddress)
        .then((wei: BigNumber) => ethers.utils.formatUnits(wei, 6))
        .then(Number)
        .then(setethUsdc),
      OPTIMISM_PROVIDER.getBalance(masterSafeAddress)
        .then(ethers.utils.formatEther)
        .then(Number)
        .then(setopEth),
      new Contract(
        TOKEN_CONFIG[CHAIN_CONFIG.OPTIMISM.chainId]['OLAS'].address,
        ERC20_BALANCE_OF_STRING_FRAGMENT,
        OPTIMISM_PROVIDER,
      )
        .balanceOf(masterSafeAddress)
        .then(ethers.utils.formatEther)
        .then(Number)
        .then(setopOlas),
      BASE_PROVIDER.getBalance(masterSafeAddress)
        .then(ethers.utils.formatEther)
        .then(Number)
        .then(setbaseEth),
    ]);
  }, 2000);

  return (
    <Flex vertical ref={ref}>
      {/* <AddFundsWarningAlertSection /> */}

      <AddFundsAddressSection
        truncatedFundingAddress={truncatedFundingAddress}
        fundingAddress={masterSafeAddress}
        handleCopy={handleCopyAddress}
      />
      <pre style={{ fontSize: 12 }}>
        {`
-- Master Safe Balances --
Ethereum
ETH ${ethEth}
USDC ${ethUsdc}

Optimism 
ETH ${opEth} 
OLAS ${opOlas}

Base
ETH ${baseEth}
`}
      </pre>
      <AddFundsGetTokensSection />
    </Flex>
  );
});
OpenAddFundsSection.displayName = 'OpenAddFundsSection';

// const AddFundsWarningAlertSection = () => (
//   <CardSection>
//     <CustomAlert
//       type="warning"
//       fullWidth
//       showIcon
//       message={
//         <Flex vertical gap={2.5}>
//           <Text className="text-base" strong>
//             Only send funds on {CHAINS.OPTIMISM.name}!
//           </Text>
//           <Text className="text-base">
//             You will lose any assets you send on other chains.
//           </Text>
//         </Flex>
//       }
//     />
//   </CardSection>
// );

const AddFundsAddressSection = ({
  fundingAddress,
  truncatedFundingAddress,
  handleCopy,
}: {
  fundingAddress?: string;
  truncatedFundingAddress?: string;
  handleCopy: () => void;
}) => (
  <CardSection gap={10} justify="center" align="center" padding="16px 24px">
    <Tooltip
      title={
        <span className="can-select-text flex">
          {fundingAddress ?? 'Error loading address'}
        </span>
      }
    >
      <Text title={fundingAddress}>{truncatedFundingAddress ?? '--'}</Text>
    </Tooltip>

    <Button onClick={handleCopy} icon={<CopyOutlined />} size="large" />

    {/* <Popover
      title="Scan QR code"
      content={
        <QRCode
          size={250}
          value={`https://metamask.app.link/send/${fundingAddress}@${100}`}
        />
      }
    >
      <Button icon={<QrcodeOutlined />} size="large" />
    </Popover> */}
  </CardSection>
);

const AddFundsGetTokensSection = () => (
  <CardSection justify="center" bordertop="true" padding="16px 24px">
    <Link target="_blank" href={COW_SWAP_GNOSIS_XDAI_OLAS_URL}>
      Get OLAS + {CHAIN_CONFIG.OPTIMISM.currency} on{' '}
      {CHAIN_CONFIG.OPTIMISM.name} {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </Link>
  </CardSection>
);
