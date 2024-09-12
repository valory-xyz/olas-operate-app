import { Button } from 'antd';
import { useState } from 'react';

import { OpenAddFundsSection } from '@/components/MainPage/sections/AddFundsSection';

export const StakingContractFundingButton = () => {
  const [isFundingSectionOpen, setIsFundingSectionOpen] = useState(false);

  return (
    <>
      <Button
        type="default"
        size="large"
        onClick={() => setIsFundingSectionOpen((prev) => !prev)}
      >
        {isFundingSectionOpen ? 'Hide' : 'Show'} address to fund
      </Button>
      {isFundingSectionOpen && <OpenAddFundsSection />}
    </>
  );
};
