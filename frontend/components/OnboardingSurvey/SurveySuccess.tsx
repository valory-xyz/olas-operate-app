import { Button, Flex } from 'antd';

import { SUPPORT_URL } from '@/constants';

export const SurveySuccess = () => (
  <Flex vertical className="w-full mt-24">
    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
      <Button type="primary" size="large" className="w-full">
        Join the Olas community
      </Button>
    </a>
  </Flex>
);
