/*
{
  "password": "your_password",
  "to": "0x...",
  "withdraw_assets": {
    "gnosis": {
      "0x0000000000000000000000000000000000000000": 1000000000000000000,
      "0x...": 500000000000000000
    }
  }
}

{
  "message": "Funds withdrawn successfully.",
  "transfer_txs": {
    "gnosis": {
      "0x0000000000000000000000000000000000000000": ["0x...", "0x..."],  // List of successful txs from Master Safe and/or Master EOA
      "0x...": ["0x...", "0x..."]
    }
  }
}


*/

// export const useWithdrawFunds = (withdrawAddress: string, password: string) => {
//   // const

//   return {
//     isLoading: false,
//     hasError: true,
//   };
// };
