import { SpawnRPC } from '@/components/Spawn';
import { SpawnScreen } from '@/enums';
import { useSpawn } from '@/hooks';
import Flex from 'antd/es/flex';
import theme from 'antd/es/theme';
import { GetServerSidePropsContext } from 'next';
import dynamic from 'next/dynamic';
import { ReactElement, useEffect, useMemo, useState } from 'react';

const SpawnAgentFunding = dynamic(
  () =>
    import('@/components/Spawn/SpawnAgentFunding').then(
      (mod) => mod.SpawnAgentFunding,
    ),
  { ssr: false },
);

const SpawnDone = dynamic(
  () => import('@/components/Spawn/SpawnDone').then((mod) => mod.SpawnDone),
  { ssr: false },
);

const SpawnHeader = dynamic(
  () => import('@/components/Spawn/SpawnHeader').then((mod) => mod.SpawnHeader),
  { ssr: false },
);

const SpawnStakingCheck = dynamic(
  () =>
    import('@/components/Spawn/SpawnStakingCheck').then(
      (mod) => mod.SpawnStakingCheck,
    ),
  { ssr: false },
);

const SpawnError = dynamic(
  () => import('@/components/Spawn/SpawnError').then((mod) => mod.SpawnError),
  { ssr: false },
);

const SpawnMasterWalletFunding = dynamic(
  () =>
    import('@/components/Spawn/SpawnMasterWalletFunding').then(
      (mod) => mod.SpawnMasterWalletFunding,
    ),
  { ssr: false },
);

export const getServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { serviceTemplateHash, screen } = context.query;
  return { props: { serviceTemplateHash, screen: screen ? screen : null } };
};

type SpawnPageProps = {
  serviceTemplateHash: string;
  screen: SpawnScreen | null;
};

export const SpawnPage = (props: SpawnPageProps) => {
  const { loadSpawn, spawnData } = useSpawn();
  const [isLoaded, setIsLoaded] = useState(false);
  const { token } = theme.useToken();

  useEffect(() => {
    if (isLoaded) return;
    loadSpawn({
      serviceTemplateHash: props.serviceTemplateHash,
      screen: props.screen,
    });
    setIsLoaded(true);
  }, [isLoaded, loadSpawn, props.screen, props.serviceTemplateHash, spawnData]);

  const spawnScreen: ReactElement = useMemo(() => {
    switch (spawnData.screen) {
      case SpawnScreen.RPC:
        return <SpawnRPC nextPage={SpawnScreen.MASTER_WALLET_FUNDING} />;

      case SpawnScreen.MASTER_WALLET_FUNDING:
        return (
          <SpawnMasterWalletFunding nextPage={SpawnScreen.STAKING_CHECK} />
        );

      case SpawnScreen.STAKING_CHECK:
        return <SpawnStakingCheck nextPage={SpawnScreen.AGENT_FUNDING} />;

      case SpawnScreen.AGENT_FUNDING:
        return <SpawnAgentFunding nextPage={SpawnScreen.DONE} />;

      case SpawnScreen.DONE:
        return <SpawnDone />;

      default:
        return <SpawnError message="Invalid spawn page" />;
    }
  }, [spawnData.screen]);

  return (
    <>
      <SpawnHeader />
      <Flex vertical style={{ padding: token.padding }}>
        {spawnScreen}
      </Flex>
    </>
  );
};

export default SpawnPage;
