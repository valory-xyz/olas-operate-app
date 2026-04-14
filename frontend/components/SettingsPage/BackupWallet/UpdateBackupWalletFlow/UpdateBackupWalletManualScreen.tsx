import { Button, Card, Flex, Form, Input, Typography } from "antd";
import { getAddress } from "ethers/lib/utils";

import { Alert, BackButton, cardStyles } from "@/components/ui";
import { BACKUP_WALLET_FIELD_RULES } from "@/constants";
import { SettingsScreenMap } from "@/constants/screen";
import { useBackupOwnerStatus, useSettings } from "@/hooks";
import { Address } from "@/types/Address";

import { useUpdateBackupWallet } from "./UpdateBackupWalletContext";

const { Title, Text } = Typography;

export const UpdateBackupWalletManualScreen = () => {
  const { goto } = useSettings();
  const { backupOwnerStatus } = useBackupOwnerStatus();
  const { setNewAddress, sameAddressError, setSameAddressError } =
    useUpdateBackupWallet();
  const [form] = Form.useForm();

  const currentAddress = backupOwnerStatus?.canonical_backup_owner ?? null;

  const handleManualSubmit = (values: { "backup-signer": string }) => {
    const checksummedAddress = getAddress(
      values["backup-signer"].toLowerCase(),
    ) as Address;

    if (
      currentAddress &&
      checksummedAddress.toLowerCase() === currentAddress.toLowerCase()
    ) {
      setSameAddressError(true);
      return;
    }

    setSameAddressError(false);
    setNewAddress(checksummedAddress);
    goto(SettingsScreenMap.UpdateBackupWalletConfirm);
  };

  return (
    <Flex style={cardStyles} vertical gap={32}>
      <Card styles={{ body: { padding: 24 } }}>
        <Flex vertical gap={16}>
          <BackButton
            onPrev={() => goto(SettingsScreenMap.UpdateBackupWalletMethod)}
          />
          <Title level={4} className="m-0">
            Provide Existing Backup Wallet
          </Title>
          {sameAddressError && (
            <Alert
              type="error"
              showIcon
              message={
                <Flex vertical gap={4}>
                  <Text className="text-sm font-weight-600">
                    Wallet Already Linked
                  </Text>
                  <Text className="text-sm">
                    This wallet address matches your current backup wallet.
                    Please enter a different address.
                  </Text>
                </Flex>
              }
            />
          )}
          <Form layout="vertical" form={form} onFinish={handleManualSubmit}>
            <Form.Item
              name="backup-signer"
              label="Enter Backup Wallet Address"
              rules={BACKUP_WALLET_FIELD_RULES}
            >
              <Input size="large" placeholder="0x..." />
            </Form.Item>
            <Button type="primary" size="large" block htmlType="submit">
              Continue
            </Button>
          </Form>
        </Flex>
      </Card>
      <Text type="secondary" className="text-sm text-center">
        Keep your backup wallet secure. If you lose both your password and
        backup wallet, you&apos;ll lose access to Pearl — permanently.
      </Text>
    </Flex>
  );
};
