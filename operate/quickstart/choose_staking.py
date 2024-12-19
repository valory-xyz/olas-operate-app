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
import sys
from typing import Any, Dict, List, TypedDict

import requests
from web3 import Web3


AGENT_ID = 14
ACTIVITY_CHECKER_ABI_PATH = 'https://raw.githubusercontent.com/valory-xyz/trader/refs/heads/main/packages/valory/contracts/mech_activity/build/MechActivity.json'
STAKING_TOKEN_INSTANCE_ABI_PATH = 'https://raw.githubusercontent.com/valory-xyz/trader/refs/heads/main/packages/valory/contracts/staking_token/build/StakingToken.json'
IPFS_ADDRESS = "https://gateway.autonolas.tech/ipfs/f01701220{hash}"
NO_STAKING_PROGRAM_ID = "no_staking"
NO_STAKING_PROGRAM_METADATA = {
    "name": "No staking",
    "description": "Your Olas Predict agent will still actively participate in prediction\
        markets, but it will not be staked within any staking program.",
}
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
STAKING_PROGRAMS = {
    NO_STAKING_PROGRAM_ID: ZERO_ADDRESS,
    "quickstart_beta_hobbyist": "0x389B46c259631Acd6a69Bde8B6cEe218230bAE8C",
    "quickstart_beta_hobbyist_2": "0x238EB6993b90a978ec6AAD7530d6429c949C08DA",
    "quickstart_beta_expert": "0x5344B7DD311e5d3DdDd46A4f71481bD7b05AAA3e",
    "quickstart_beta_expert_2": "0xb964e44c126410df341ae04B13aB10A985fE3513",
    "quickstart_beta_expert_3": "0x80faD33Cadb5F53f9D29F02Db97D682E8b101618",
    "quickstart_beta_expert_4": "0xaD9d891134443B443D7F30013c7e14Fe27F2E029",
    "quickstart_beta_expert_5": "0xE56dF1E563De1B10715cB313D514af350D207212",
    "quickstart_beta_expert_6": "0x2546214aEE7eEa4bEE7689C81231017CA231Dc93",
    "quickstart_beta_expert_7": "0xD7A3C8b975f71030135f1a66e9e23164d54fF455",
}
NO_STAKING_PROGRAM_ENV_VARIABLES = {
    "USE_STAKING": False,
    "STAKING_PROGRAM": NO_STAKING_PROGRAM_ID,
    "AGENT_ID": AGENT_ID,
    "CUSTOM_SERVICE_REGISTRY_ADDRESS": "0x9338b5153AE39BB89f50468E608eD9d764B755fD",
    "CUSTOM_SERVICE_REGISTRY_TOKEN_UTILITY_ADDRESS": "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",
    "MECH_CONTRACT_ADDRESS": "0x77af31De935740567Cf4fF1986D04B2c964A786a",
    "CUSTOM_OLAS_ADDRESS": ZERO_ADDRESS,
    "CUSTOM_STAKING_ADDRESS": "0x43fB32f25dce34EB76c78C7A42C8F40F84BCD237",  # Non-staking agents need to specify an arbitrary staking contract so that they can call getStakingState()
    "MECH_ACTIVITY_CHECKER_CONTRACT": ZERO_ADDRESS,
    "MIN_STAKING_BOND_OLAS": 1,
    "MIN_STAKING_DEPOSIT_OLAS": 1,
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
    MECH_CONTRACT_ADDRESS: str
    MIN_STAKING_BOND_OLAS: str
    MIN_STAKING_DEPOSIT_OLAS: str


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


def _get_staking_token_contract(program_id: str, rpc: str, use_blockscout: bool = False) -> Any:
    w3 = Web3(Web3.HTTPProvider(rpc))
    staking_token_instance_address = STAKING_PROGRAMS.get(program_id)
    if use_blockscout:
        abi = _get_abi(staking_token_instance_address)
    else:
        abi = requests.get(STAKING_TOKEN_INSTANCE_ABI_PATH).json()['abi']
    contract = w3.eth.contract(address=staking_token_instance_address, abi=abi)

    if "getImplementation" in [func.fn_name for func in contract.all_functions()]:
        # It is a proxy contract
        implementation_address = contract.functions.getImplementation().call()
        if use_blockscout:
            abi = _get_abi(implementation_address)
        else:
            abi = requests.get(STAKING_TOKEN_INSTANCE_ABI_PATH).json()['abi']
        contract = w3.eth.contract(address=staking_token_instance_address, abi=abi)

    return contract


def get_staking_contract_metadata(
    program_id: str, rpc: str, use_blockscout: bool = False
) -> Dict[str, str]:
    try:
        if program_id == NO_STAKING_PROGRAM_ID:
            return NO_STAKING_PROGRAM_METADATA

        staking_token_contract = _get_staking_token_contract(
            program_id=program_id, rpc=rpc, use_blockscout=use_blockscout
        )
        metadata_hash = staking_token_contract.functions.metadataHash().call()
        ipfs_address = IPFS_ADDRESS.format(hash=metadata_hash.hex())
        response = requests.get(ipfs_address)

        if response.status_code == 200:
            return response.json()

        raise Exception(  # pylint: disable=broad-except
            f"Failed to fetch data from {ipfs_address}: {response.status_code}"
        )
    except Exception:  # pylint: disable=broad-except
        return {
            "name": program_id,
            "description": program_id,
        }


def get_staking_env_variables(  # pylint: disable=too-many-locals
    program_id: str, rpc: str, use_blockscout: bool = False
) -> StakingVariables:
    if program_id == NO_STAKING_PROGRAM_ID:
        return {
            "USE_STAKING": False,
            "STAKING_PROGRAM": NO_STAKING_PROGRAM_ID,
            "AGENT_ID": AGENT_ID,
            "CUSTOM_SERVICE_REGISTRY_ADDRESS": "0x9338b5153AE39BB89f50468E608eD9d764B755fD",
            "CUSTOM_SERVICE_REGISTRY_TOKEN_UTILITY_ADDRESS": "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",
            "MECH_CONTRACT_ADDRESS": "0x77af31De935740567Cf4fF1986D04B2c964A786a",
            "CUSTOM_OLAS_ADDRESS": ZERO_ADDRESS,
            "CUSTOM_STAKING_ADDRESS": "0x43fB32f25dce34EB76c78C7A42C8F40F84BCD237",  # Non-staking agents need to specify an arbitrary staking contract so that they can call getStakingState()
            "MECH_ACTIVITY_CHECKER_CONTRACT": ZERO_ADDRESS,
            "MIN_STAKING_BOND_OLAS": 1,
            "MIN_STAKING_DEPOSIT_OLAS": 1,
        }

    staking_token_instance_address = STAKING_PROGRAMS.get(program_id)
    staking_token_contract = _get_staking_token_contract(
        program_id=program_id, rpc=rpc, use_blockscout=use_blockscout
    )
    agent_id = staking_token_contract.functions.agentIds(0).call()
    service_registry = staking_token_contract.functions.serviceRegistry().call()
    staking_token = staking_token_contract.functions.stakingToken().call()
    service_registry_token_utility = (
        staking_token_contract.functions.serviceRegistryTokenUtility().call()
    )
    min_staking_deposit = staking_token_contract.functions.minStakingDeposit().call()
    min_staking_bond = min_staking_deposit

    if "activityChecker" in [
        func.fn_name for func in staking_token_contract.all_functions()
    ]:
        activity_checker = staking_token_contract.functions.activityChecker().call()

        if use_blockscout:
            abi = _get_abi(activity_checker)
        else:
            abi = requests.get(ACTIVITY_CHECKER_ABI_PATH).json()['abi']

        w3 = Web3(Web3.HTTPProvider(rpc))
        activity_checker_contract = w3.eth.contract(address=activity_checker, abi=abi)
        agent_mech = activity_checker_contract.functions.agentMech().call()
    else:
        activity_checker = ZERO_ADDRESS
        agent_mech = staking_token_contract.functions.agentMech().call()

    return StakingVariables({
        "USE_STAKING": program_id != NO_STAKING_PROGRAM_ID,
        "STAKING_PROGRAM": program_id,
        "AGENT_ID": agent_id,
        "CUSTOM_SERVICE_REGISTRY_ADDRESS": service_registry,
        "CUSTOM_SERVICE_REGISTRY_TOKEN_UTILITY_ADDRESS": service_registry_token_utility,
        "CUSTOM_OLAS_ADDRESS": staking_token,
        "CUSTOM_STAKING_ADDRESS": staking_token_instance_address,
        "MECH_ACTIVITY_CHECKER_CONTRACT": activity_checker,
        "MECH_CONTRACT_ADDRESS": agent_mech,
        "MIN_STAKING_BOND_OLAS": int(min_staking_bond),
        "MIN_STAKING_DEPOSIT_OLAS": int(min_staking_deposit),
    })
