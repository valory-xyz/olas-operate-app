// TODO: remove this file, uneccessary

// const useAddress = () => {
//   const { service } = useServices();

//   /** agent safe multisig address */
//   const multisigAddress =
//     service?.chain_configs?.[CHAIN_CONFIG.OPTIMISM.chainId]?.chain_data
//       ?.multisig;

//   /** agent instance EOA address */
//   const instanceAddress =
//     service?.chain_configs?.[CHAIN_CONFIG.OPTIMISM.chainId]?.chain_data
//       ?.instances?.[0];

//   return { instanceAddress, multisigAddress };
// };