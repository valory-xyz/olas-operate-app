import { Button, Flex } from 'antd';
import { FaShieldAlt } from 'react-icons/fa';

import { Pages } from '@/enums';
import { usePageState } from '@/hooks';

import { CustomAlert } from '../Alert';

export const BackupSeedPhraseAlert = () => {
  const { goto: gotoPage } = usePageState();

  return (
    <CustomAlert
      type="warning"
      className="mt-auto mb-16 text-sm"
      message={
        <Flex vertical gap={10}>
          <FaShieldAlt />
          <span>Back up your Secret Recovery Phrase to never lose access.</span>
          <Button
            type="default"
            size="small"
            className="w-fit"
            onClick={() => gotoPage(Pages.Settings)}
          >
            Back Up Recovery Phrase
          </Button>
        </Flex>
      }
    />
  );
};
