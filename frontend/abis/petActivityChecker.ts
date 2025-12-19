export const PET_ACTIVITY_CHECKER_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'repository',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_livenessRatio',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'NotOwner',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroAddress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroValue',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'oldRatio',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'newRatio',
        type: 'uint256',
      },
    ],
    name: 'LivenessRatioUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [],
    name: 'actionRepository',
    outputs: [
      {
        internalType: 'contract IActionRepository',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'newLivenessRatio',
        type: 'uint256',
      },
    ],
    name: 'changeLivenessRatio',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'periodSeconds',
        type: 'uint256',
      },
    ],
    name: 'computeRequiredActions',
    outputs: [
      {
        internalType: 'uint256',
        name: 'requiredActions',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'agent',
        type: 'address',
      },
    ],
    name: 'getMultisigNonces',
    outputs: [
      {
        internalType: 'uint256[]',
        name: 'nonces',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256[]',
        name: 'curNonces',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'lastNonces',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256',
        name: 'ts',
        type: 'uint256',
      },
    ],
    name: 'isRatioPass',
    outputs: [
      {
        internalType: 'bool',
        name: 'ratioPass',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'livenessRatio',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
