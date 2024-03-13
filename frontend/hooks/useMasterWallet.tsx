import { useEffect, useState } from "react";
import { useAppInfo } from ".";
import { EthersService } from "@/service/Ethers";

type useMasterWalletProps = {
  rpc: string;
};

export const useMasterWallet = ({ rpc }: useMasterWalletProps) => {
  const { userPublicKey } = useAppInfo();
  const [nativeBalance, setNativeBalance] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    userPublicKey &&
      EthersService.getEthBalance(userPublicKey, rpc).then((res) => {
        setNativeBalance(res);
      });
  }, [rpc, userPublicKey]);

  return { balance: nativeBalance };
};
