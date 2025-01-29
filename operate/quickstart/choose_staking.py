# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2023-2024 Valory AG
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
#
# ------------------------------------------------------------------------------

"""Choose staking program."""

import json
import requests
import sys
from typing import Any, Dict, List, TypedDict
from web3 import Web3

from aea_ledger_ethereum import ContractLogicError
from operate.constants import (
    IPFS_ADDRESS,
    STAKING_TOKEN_INSTANCE_ABI_PATH,
    ZERO_ADDRESS,
)


NO_STAKING_PROGRAM_ID = "no_staking"
NO_STAKING_PROGRAM_METADATA = {
    "name": "No staking",
    "description": "Your Olas Predict agent will still actively participate in prediction\
        markets, but it will not be staked within any staking program.",
    "available_staking_slots":"∞"
}


class StakingVariables(TypedDict):
    USE_STAKING: str
    STAKING_PROGRAM: str
    AGENT_ID: str
    CUSTOM_SERVICE_REGISTRY_ADDRESS: str
    CUSTOM_SERVICE_REGISTRY_TOKEN_UTILITY_ADDRESS: str
    CUSTOM_OLAS_ADDRESS: str
    CUSTOM_STAKING_ADDRESS: str
    MECH_ACTIVITY_CHECKER_CONTRACT: str
    MIN_STAKING_BOND_OLAS: str
    MIN_STAKING_DEPOSIT_OLAS: str


class StakingHandler:
    """Handles the staking process for the agent."""

    def __init__(
            self: "StakingHandler",
            staking_programs: Dict[str, str],
            rpc: str,
            default_agent_id: int,
            use_blockscout: bool = False
    ):
        self.staking_programs = staking_programs
        self.rpc = rpc
        self.default_agent_id = default_agent_id
        self.use_blockscout = use_blockscout

    def _get_abi(contract_address: str) -> List:
        contract_abi_url = (
            "https://gnosis.blockscout.com/api/v2/smart-contracts/{contract_address}"
        )
        response = requests.get(
            contract_abi_url.format(contract_address=contract_address)
        ).json()

        if "result" in response:
            result = response["result"]
            try:
                abi = json.loads(result)
            except json.JSONDecodeError:
                print("Error: Failed to parse 'result' field as JSON")
                sys.exit(1)
        else:
            abi = response.get("abi")

        return abi if abi else []

    def _get_staking_token_contract(self: "StakingHandler", program_id: str) -> Any:
        w3 = Web3(Web3.HTTPProvider(self.rpc))
        staking_token_instance_address = self.staking_programs.get(program_id)
        if self.use_blockscout:
            abi = self._get_abi(staking_token_instance_address)
        else:
            abi = requests.get(STAKING_TOKEN_INSTANCE_ABI_PATH).json()['abi']
        contract = w3.eth.contract(address=staking_token_instance_address, abi=abi)

        if "getImplementation" in [func.fn_name for func in contract.all_functions()]:
            # It is a proxy contract
            implementation_address = contract.functions.getImplementation().call()
            if self.use_blockscout:
                abi = self._get_abi(implementation_address)
            else:
                abi = requests.get(STAKING_TOKEN_INSTANCE_ABI_PATH).json()['abi']
            contract = w3.eth.contract(address=staking_token_instance_address, abi=abi)

        return contract

    def get_staking_contract_metadata(self: "StakingHandler", program_id: str) -> Dict[str, Any]:
        try:
            if program_id == NO_STAKING_PROGRAM_ID:
                return NO_STAKING_PROGRAM_METADATA

            staking_token_contract = self._get_staking_token_contract(program_id)
            metadata_hash = staking_token_contract.functions.metadataHash().call()
            ipfs_address = IPFS_ADDRESS.format(hash=metadata_hash.hex())
            response = requests.get(ipfs_address)

            if response.status_code == 200:
                metadata = response.json()
                # Add staking slots count to successful response
                try:
                    max_services = staking_token_contract.functions.maxNumServices().call()
                    current_services = staking_token_contract.functions.getServiceIds().call()
                    metadata["available_staking_slots"] = max_services - len(current_services)
                except ContractLogicError as e:
                    metadata["available_staking_slots"] = "?"
                return metadata

            raise Exception(  # pylint: disable=broad-except
                f"Failed to fetch data from {ipfs_address}: {response.status_code}"
            )
        except Exception:  # pylint: disable=broad-except
            return {
                "name": program_id,
                "description": program_id,
                "available_staking_slots": "?"
            }

    def get_staking_env_variables(self: "StakingHandler", program_id: str) -> StakingVariables:
        if program_id == NO_STAKING_PROGRAM_ID:
            return StakingVariables({
                "USE_STAKING": False,
                "STAKING_PROGRAM": NO_STAKING_PROGRAM_ID,
                "AGENT_ID": self.default_agent_id,
                "CUSTOM_SERVICE_REGISTRY_ADDRESS": "0x9338b5153AE39BB89f50468E608eD9d764B755fD",
                "CUSTOM_SERVICE_REGISTRY_TOKEN_UTILITY_ADDRESS": "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",
                "CUSTOM_OLAS_ADDRESS": ZERO_ADDRESS,
                "CUSTOM_STAKING_ADDRESS": "0x43fB32f25dce34EB76c78C7A42C8F40F84BCD237",  # Non-staking agents need to specify an arbitrary staking contract so that they can call getStakingState()
                "MECH_ACTIVITY_CHECKER_CONTRACT": ZERO_ADDRESS,
                "MIN_STAKING_BOND_OLAS": 1,
                "MIN_STAKING_DEPOSIT_OLAS": 1,
            })

        staking_token_instance_address = self.staking_programs.get(program_id)
        staking_token_contract = self._get_staking_token_contract(program_id)
        service_registry = staking_token_contract.functions.serviceRegistry().call()
        staking_token = staking_token_contract.functions.stakingToken().call()
        service_registry_token_utility = (
            staking_token_contract.functions.serviceRegistryTokenUtility().call()
        )
        min_staking_deposit = staking_token_contract.functions.minStakingDeposit().call()
        min_staking_bond = min_staking_deposit
        try:
            agent_id = staking_token_contract.functions.agentIds(0).call()
        except ContractLogicError:
            agent_id = self.default_agent_id

        if "activityChecker" in [
            func.fn_name for func in staking_token_contract.all_functions()
        ]:
            activity_checker = staking_token_contract.functions.activityChecker().call()
        else:
            activity_checker = ZERO_ADDRESS

        return StakingVariables({
            "USE_STAKING": program_id != NO_STAKING_PROGRAM_ID,
            "STAKING_PROGRAM": program_id,
            "AGENT_ID": agent_id,
            "CUSTOM_SERVICE_REGISTRY_ADDRESS": service_registry,
            "CUSTOM_SERVICE_REGISTRY_TOKEN_UTILITY_ADDRESS": service_registry_token_utility,
            "CUSTOM_OLAS_ADDRESS": staking_token,
            "CUSTOM_STAKING_ADDRESS": staking_token_instance_address,
            "MECH_ACTIVITY_CHECKER_CONTRACT": activity_checker,
            "MIN_STAKING_BOND_OLAS": int(min_staking_bond),
            "MIN_STAKING_DEPOSIT_OLAS": int(min_staking_deposit),
        })
