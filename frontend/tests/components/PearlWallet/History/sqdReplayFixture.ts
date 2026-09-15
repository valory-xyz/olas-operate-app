// Real responses from the live Polygon squid
// (https://subgraph.autonolas.tech/squid/transactions-polygon/graphql),
// captured 2026-09-14 with the shipped 'sqd' query documents for Master Safe
// 0x19e6314cc81563a22e0f183f5939f0d50df22fcf (Polystrat, service 272). Kept
// verbatim so the replay test exercises the wire shape Pearl actually gets,
// not a hand-assembled approximation. Only indexerStatus.blockTimestamp is
// overridden at test time (it is wall-clock relative).
export const POLYSTRAT_MASTER_SAFE =
  '0x19e6314cc81563a22e0f183f5939f0d50df22fcf';
export const POLYSTRAT_AGENT_SAFE =
  '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149';

export const SQD_MASTER_RESPONSE = {
  masterSafe: {
    id: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
    masterEoa: '0x634b550847838dd47d25a8fe91b3d6649ddf96f0',
    owners: [
      '0x634b550847838dd47d25a8fe91b3d6649ddf96f0',
      '0x9cf37604077a7cee90516c0060ddde0fa890326b',
    ],
    threshold: '1',
    historyFloorBlock: '86150361',
    historyFloorTimestamp: '1777420766',
  },
  fundsMovements: [
    {
      id: '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461-2523',
      category: 'MASTER_TO_AGENT',
      source: 'RAW_TRANSFER',
      token: '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb',
      amount: '65000000',
      from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
      to: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
      blockTimestamp: '1777420912',
      transactionHash:
        '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461',
      agentSafe: {
        id: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
        service: {
          id: '272',
          serviceId: '272',
          agentIds: [86],
        },
      },
      service: {
        id: '272',
        serviceId: '272',
        agentIds: [86],
      },
    },
    {
      id: '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690-1851',
      category: 'MASTER_TO_AGENT',
      source: 'RAW_TRANSFER',
      token: null,
      amount: '40000000000000000000',
      from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
      to: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
      blockTimestamp: '1777420900',
      transactionHash:
        '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690',
      agentSafe: {
        id: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
        service: {
          id: '272',
          serviceId: '272',
          agentIds: [86],
        },
      },
      service: {
        id: '272',
        serviceId: '272',
        agentIds: [86],
      },
    },
  ],
  bondMovements: [
    {
      id: '0x4c51e3c1d08035efb5c9adfbf9f23331f46f9e0780c672ac7bf2c05c7e52b376-1643',
      category: 'SERVICE_BOND_DEPOSIT',
      source: 'SEMANTIC',
      bondType: 'AGENT_BOND',
      token: '0xfef5d947472e72efbb2e388c730b7428406f2f95',
      amount: '50000000000000000000',
      from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
      to: '0xa45e64d13a30a51b91ae0eb182e88a40e9b18ed8',
      blockTimestamp: '1777420856',
      transactionHash:
        '0x4c51e3c1d08035efb5c9adfbf9f23331f46f9e0780c672ac7bf2c05c7e52b376',
      agentSafe: null,
      service: {
        id: '272',
        serviceId: '272',
        agentIds: [86],
      },
    },
    {
      id: '0xdb365a1da8602d7d0c9eaaa03a73ab89d15e5e0ab71c33643ec239f4c1e839dd-2371',
      category: 'SERVICE_BOND_DEPOSIT',
      source: 'SEMANTIC',
      bondType: 'SECURITY_DEPOSIT',
      token: '0xfef5d947472e72efbb2e388c730b7428406f2f95',
      amount: '50000000000000000000',
      from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
      to: '0xa45e64d13a30a51b91ae0eb182e88a40e9b18ed8',
      blockTimestamp: '1777420812',
      transactionHash:
        '0xdb365a1da8602d7d0c9eaaa03a73ab89d15e5e0ab71c33643ec239f4c1e839dd',
      agentSafe: null,
      service: {
        id: '272',
        serviceId: '272',
        agentIds: [86],
      },
    },
  ],
  agentFundingEvents: [
    {
      id: '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461-0x19e6314cc81563a22e0f183f5939f0d50df22fcf-272',
      txHash:
        '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461',
      blockTimestamp: '1777420912',
      totalNativeAmount: '0',
      totalOlasAmount: '0',
      transfers: [
        {
          id: '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461-2523',
          category: 'MASTER_TO_AGENT',
          source: 'RAW_TRANSFER',
          token: '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb',
          amount: '65000000',
          from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
          to: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
          blockTimestamp: '1777420912',
          transactionHash:
            '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461',
          agentSafe: {
            id: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
            service: {
              id: '272',
              serviceId: '272',
              agentIds: [86],
            },
          },
          service: {
            id: '272',
            serviceId: '272',
            agentIds: [86],
          },
        },
      ],
    },
    {
      id: '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690-0x19e6314cc81563a22e0f183f5939f0d50df22fcf-272',
      txHash:
        '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690',
      blockTimestamp: '1777420900',
      totalNativeAmount: '40000000000000000000',
      totalOlasAmount: '0',
      transfers: [
        {
          id: '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690-1851',
          category: 'MASTER_TO_AGENT',
          source: 'RAW_TRANSFER',
          token: null,
          amount: '40000000000000000000',
          from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
          to: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
          blockTimestamp: '1777420900',
          transactionHash:
            '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690',
          agentSafe: {
            id: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
            service: {
              id: '272',
              serviceId: '272',
              agentIds: [86],
            },
          },
          service: {
            id: '272',
            serviceId: '272',
            agentIds: [86],
          },
        },
      ],
    },
  ],
  indexerStatus: {
    blockNumber: '93780681',
    blockTimestamp: '1789376055',
  },
};

export const SQD_AGENT_RESPONSE = {
  fundsMovements: [
    {
      id: '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461-2523',
      category: 'MASTER_TO_AGENT',
      source: 'RAW_TRANSFER',
      token: '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb',
      amount: '65000000',
      from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
      to: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
      blockTimestamp: '1777420912',
      transactionHash:
        '0x1c02ed6dff1675f408c7321fa8faa8a192fd515853c5fdcbdefd8707d4a67461',
      agentSafe: {
        id: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
        service: {
          id: '272',
          serviceId: '272',
          agentIds: [86],
        },
      },
      service: {
        id: '272',
        serviceId: '272',
        agentIds: [86],
      },
    },
    {
      id: '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690-1851',
      category: 'MASTER_TO_AGENT',
      source: 'RAW_TRANSFER',
      token: null,
      amount: '40000000000000000000',
      from: '0x19e6314cc81563a22e0f183f5939f0d50df22fcf',
      to: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
      blockTimestamp: '1777420900',
      transactionHash:
        '0x1efc0e063d2542aa320a72ba1a6bc9c8cd1fd60edb3090c00dc27d4fcc280690',
      agentSafe: {
        id: '0x1ac3195a1c4349db8a1cfcd662eafe39cc597149',
        service: {
          id: '272',
          serviceId: '272',
          agentIds: [86],
        },
      },
      service: {
        id: '272',
        serviceId: '272',
        agentIds: [86],
      },
    },
  ],
  indexerStatus: {
    blockNumber: '93780681',
    blockTimestamp: '1789376055',
  },
};
