export const REQUESTER_ACTIVITY_CHECKER_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_mechMarketplace', type: 'address' },
      { internalType: 'uint256', name: '_livenessRatio', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'ZeroAddress', type: 'error' },
  { inputs: [], name: 'ZeroValue', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'multisig', type: 'address' }],
    name: 'getMultisigNonces',
    outputs: [{ internalType: 'uint256[]', name: 'nonces', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256[]', name: 'curNonces', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'lastNonces', type: 'uint256[]' },
      { internalType: 'uint256', name: 'ts', type: 'uint256' },
    ],
    name: 'isRatioPass',
    outputs: [{ internalType: 'bool', name: 'ratioPass', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'livenessRatio',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mechMarketplace',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];
