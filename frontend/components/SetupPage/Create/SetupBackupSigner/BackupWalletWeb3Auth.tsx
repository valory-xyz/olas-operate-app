import { Button, Flex, Typography } from 'antd';

import { AppleIcon } from '@/components/custom-icons/AppleIcon';
import { GoogleIcon } from '@/components/custom-icons/GoogleIcon';
import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums/SetupScreen';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useSetup } from '@/hooks/useSetup';

import { useWeb3AuthBackupWallet } from '../hooks/useWeb3AuthBackupWallet';

const { Text } = Typography;

type BackupWalletWeb3AuthProps = {
  onSetUpManuallyClick: () => void;
};

const Web3AuthCaption = () => {
  const { termsAndConditionsWindow } = useElectronApi();

  return (
    <Text type="secondary" className="text-sm mt-16">
      Set Up with&nbsp;
      <GoogleIcon
        fill={COLOR.GRAY_2}
        height={14}
        width={14}
        viewBox="0 0 14 15"
      />
      &nbsp;/&nbsp;
      <AppleIcon
        fill={COLOR.GRAY_2}
        height={15}
        width={15}
        viewBox="0 0 15 16"
      />
      &nbsp; authentication service is provided by Web3Auth. For details on how
      your data is handled during authentication, please refer to the&nbsp;
      <a onClick={() => termsAndConditionsWindow?.show?.('web3auth')}>
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
    goto(SetupScreen.AgentSelection);
  };

  const { openWeb3AuthModel } = useWeb3AuthBackupWallet({
    onFinish: handleWeb3AuthSetupFinish,
  });

  return (
    <>
      <Button type="primary" size="large" onClick={openWeb3AuthModel}>
        <Flex justify="center" align="center">
          Set Up with&nbsp;
          <GoogleIcon fill={COLOR.WHITE} />
          &nbsp;/&nbsp;
          <AppleIcon fill={COLOR.WHITE} />
        </Flex>
      </Button>
      <Button size="large" onClick={onSetUpManuallyClick}>
        Provide Existing Backup Wallet
      </Button>

      <Web3AuthCaption />
    </>
  );
};
