import { Button, Flex, Typography } from 'antd';
import { RiAppleFill, RiGoogleFill } from 'react-icons/ri';

import { SETUP_SCREEN } from '@/constants';
import { COLOR } from '@/constants/colors';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useSetup } from '@/hooks/useSetup';

import { useWeb3AuthBackupWallet } from './useWeb3AuthBackupWallet';

const { Text } = Typography;

type BackupWalletWeb3AuthProps = {
  onSetUpManuallyClick: () => void;
};

const Web3AuthCaption = () => {
  const { termsAndConditionsWindow } = useElectronApi();

  return (
    <Text type="secondary" className="text-sm mt-16">
      Set Up with&nbsp;
      <RiGoogleFill fill={COLOR.GRAY_2} />
      &nbsp;/&nbsp;
      <RiAppleFill fill={COLOR.GRAY_2} />
      &nbsp; authentication service is provided by Web3Auth. For details on how
      your data is handled during authentication, please refer to the&nbsp;
      <a onClick={() => termsAndConditionsWindow?.show?.('web3auth-terms')}>
        Terms and Conditions
      </a>
      .
    </Text>
  );
};

export const BackupWalletWeb3Auth = ({
  onSetUpManuallyClick,
}: BackupWalletWeb3AuthProps) => {
  const { goto } = useSetup();

  const handleWeb3AuthSetupFinish = () => {
    goto(SETUP_SCREEN.AgentOnboarding);
  };

  const { openWeb3AuthModel } = useWeb3AuthBackupWallet({
    onFinish: handleWeb3AuthSetupFinish,
  });

  return (
    <>
      <Button type="primary" size="large" onClick={openWeb3AuthModel}>
        <Flex justify="center" align="center">
          Set Up with&nbsp;
          <RiGoogleFill fill={COLOR.WHITE} />
          &nbsp;/&nbsp;
          <RiAppleFill fill={COLOR.WHITE} />
        </Flex>
      </Button>
      <Button size="large" onClick={onSetUpManuallyClick}>
        Provide Existing Backup Wallet
      </Button>

      <Web3AuthCaption />
    </>
  );
};
