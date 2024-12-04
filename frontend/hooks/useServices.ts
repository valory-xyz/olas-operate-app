import { useContext } from 'react';

import { ServicesContext } from '@/context/ServicesProvider';

export const useServices = () => useContext(ServicesContext);

// const checkServiceIsFundedOnChain = async ({
//   service,
//   chainId,
// }: {
//   service: MiddlewareServiceResponse;
//   chainId: ChainId;
// }) => {
//   if (!service.chain_configs[chainId].chain_data.instances) return false;
//   if (!service.chain_configs[chainId].chain_data.multisig) return false;

//   const instances: Address[] =
//     service.chain_configs[chainId].chain_data.instances;

//   const multisig: Address = service.chain_configs[chainId].chain_data.multisig;

//   const addresses = [...instances, multisig];

//   const balances = await MulticallService.getEthBalances(addresses, chainId);

//   if (!balances) return false;

//   const fundRequirements: AddressBooleanRecord = addresses.reduce(
//     (acc: AddressBooleanRecord, address: Address) =>
//       Object.assign(acc, {
//         [address]: instances.includes(address)
//           ? balances[address] > stakingProgram
//           : balances[address] >
//             serviceTemplate.configurations[chainId].fund_requirements.safe,
//       }),
//     {},
//   );

//   return Object.values(fundRequirements).every((f) => f);
// };

// const checkServiceIsFunded = async (
//   service: MiddlewareServiceResponse,
//   stakingProgramFundingRequirements:
// ): Promise<boolean> => {
//   // get all the chainIds from the service
//   const chainIds: ChainId[] = Object.keys(service.chain_configs).map(
//     (chainId) => +chainId,
//   );

//   // loop over the chainIds and check if the service is funded
//   const instanceAddresses = chainIds.map(
//     (chainId) => service.chain_configs[chainId].chain_data.instances,
//   );

//   if (!instances || !multisig) return false;

//   const addresses = [...instances, multisig];

//   const balances = await MulticallService.getEthBalances(addresses);

//   if (!balances) return false;

//   const fundRequirements: AddressBooleanRecord = addresses.reduce(
//     (acc: AddressBooleanRecord, address: Address) =>
//       Object.assign(acc, {
//         [address]: instances.includes(address)
//           ? balances[address] >
//             serviceTemplate.configurations[CHAIN_CONFIG.OPTIMISM.chainId]
//               .fund_requirements.agent
//           : balances[address] >
//             serviceTemplate.configurations[CHAIN_CONFIG.OPTIMISM.chainId]
//               .fund_requirements.safe,
//       }),
//     {},
//   );

//   return Object.values(fundRequirements).every((f) => f);
// };
