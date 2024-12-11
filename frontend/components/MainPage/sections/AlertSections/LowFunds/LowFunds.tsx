import { LowOperatingBalanceAlert } from './LowOperatingBalanceAlert';
import { LowSafeSignerBalanceAlert } from './LowSafeSignerBalanceAlert';
import { MainNeedsFunds } from './MainNeedsFunds';

export const LowFunds = () => (
  <>
    <MainNeedsFunds />
    <LowOperatingBalanceAlert />
    <LowSafeSignerBalanceAlert />
  </>
);
