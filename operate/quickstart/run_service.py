# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2024 Valory AG
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
"""Optimus Quickstart script."""

import json
import textwrap
import warnings

from operate.utils.common import check_rpc, get_erc20_balance, print_box, print_section, print_title, wei_to_token
warnings.filterwarnings("ignore", category=UserWarning)

import sys
import getpass
import os
import sys
import time
import typing as t
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from halo import Halo

from operate.account.user import UserAccount
from operate.constants import OPERATE_HOME
from operate.resource import LocalResource, deserialize
from operate.services.manage import ServiceManager
from operate.services.service import Service, DUMMY_MULTISIG
from operate.operate_types import (
    LedgerType,
    ServiceTemplate,
    OnChainState,
)
from operate.quickstart.choose_staking import (
    STAKING_PROGRAMS,
    StakingVariables,
    get_staking_contract_metadata,
    get_staking_env_variables,
)

if t.TYPE_CHECKING:
    from operate.cli import OperateApp


load_dotenv()

OPERATIONAL_FUND_REQUIREMENT = 500_000_000_000_000_000
SAFETY_MARGIN = 100_000_000_000_000
STAKED_BONDING_TOKEN = "OLAS"
DEFAULT_STAKING_CHAIN = "gnosis"
CHAIN_ID_TO_METADATA = {
    "gnosis": {
        "name": "Gnosis",
        "token": "xDAI",
        "operationalFundReq": OPERATIONAL_FUND_REQUIREMENT,  # fund for master wallet
        "gasParams": {
            # this means default values will be used
            "MAX_PRIORITY_FEE_PER_GAS": "",
            "MAX_FEE_PER_GAS": "",
        }
    },
}


@dataclass
class TraderConfig(LocalResource):
    """Local configuration."""

    path: Path
    gnosis_rpc: t.Optional[str] = None
    password_migrated: t.Optional[bool] = None
    staking_vars: t.Optional[StakingVariables] = None
    principal_chain: t.Optional[str] = None

    @classmethod
    def from_json(cls, obj: t.Dict) -> "LocalResource":
        """Load LocalResource from json."""
        kwargs = {}
        for pname, ptype in cls.__annotations__.items():
            if pname.startswith("_"):
                continue

            # allow for optional types
            is_optional_type = t.get_origin(ptype) is t.Union and type(None) in t.get_args(ptype)
            value = obj.get(pname, None)
            if is_optional_type and value is None:
                continue

            kwargs[pname] = deserialize(obj=obj[pname], otype=ptype)
        return cls(**kwargs)

def ask_confirm_password() -> str:
    password = getpass.getpass("Please input your password (or press enter): ")
    confirm_password = getpass.getpass("Please confirm your password: ")

    if password == confirm_password:
        return password
    else:
        print("Passwords do not match. Terminating.")
        sys.exit(1)

def load_local_config() -> TraderConfig:
    """Load the local optimus configuration."""
    path = OPERATE_HOME / "local_config.json"
    if path.exists():
        trader_config = TraderConfig.load(path)
    else:
        trader_config = TraderConfig(path)

    return trader_config

def configure_local_config(template: ServiceTemplate) -> TraderConfig:
    """Configure local trader configuration."""
    trader_config = load_local_config()

    while not check_rpc(trader_config.gnosis_rpc):
        trader_config.gnosis_rpc = getpass.getpass("Enter a Gnosis RPC that supports eth_newFilter [hidden input]: ")

    trader_config.gnosis_rpc = trader_config.gnosis_rpc

    if trader_config.password_migrated is None:
        trader_config.password_migrated = False

    if trader_config.staking_vars is None:
        print_section("Please, select your staking program preference")
        ids = list(STAKING_PROGRAMS.keys())
        for index, key in enumerate(ids):
            metadata = get_staking_contract_metadata(program_id=key, rpc=trader_config.gnosis_rpc)
            name = metadata["name"]
            description = metadata["description"]
            wrapped_description = textwrap.fill(
                description, width=80, initial_indent="   ", subsequent_indent="   "
            )
            print(f"{index + 1}) {name}\n{wrapped_description}\n")

        while True:
            try:
                choice = int(input(f"Enter your choice (1 - {len(ids)}): ")) - 1
                if not (0 <= choice < len(ids)):
                    raise ValueError
                program_id = ids[choice]
                break
            except ValueError:
                print(f"Please enter a valid option (1 - {len(ids)}).")

        print(f"Selected staking program: {program_id}")
        print()
        trader_config.staking_vars = get_staking_env_variables(program_id, trader_config.gnosis_rpc)

    if trader_config.principal_chain is None:
        trader_config.principal_chain = DEFAULT_STAKING_CHAIN

    trader_config.store()

    # set chain configs in the service template
    template["configurations"][trader_config.principal_chain] |= {
        "staking_program_id": trader_config.staking_vars["STAKING_PROGRAM"],
        "rpc": trader_config.gnosis_rpc,
        "agent_id": int(trader_config.staking_vars["AGENT_ID"]),
        "use_staking": trader_config.staking_vars["USE_STAKING"],
        "cost_of_bond": int(trader_config.staking_vars["MIN_STAKING_BOND_OLAS"]),
    }

    return trader_config

def handle_password_migration(operate: "OperateApp", config: TraderConfig) -> t.Optional[str]:
    """Handle password migration."""
    if not config.password_migrated:
        print("Add password...")
        old_password, new_password = "12345", ask_confirm_password()
        operate.user_account.update(old_password, new_password)
        if operate.wallet_manager.exists(LedgerType.ETHEREUM):
            operate.password = old_password
            wallet = operate.wallet_manager.load(LedgerType.ETHEREUM)
            wallet.crypto.dump(str(wallet.key_path), password=new_password)
            wallet.password = new_password
            wallet.store()

        config.password_migrated = True
        config.store()
        return new_password
    return None

def ask_password_if_needed(operate: "OperateApp", config: TraderConfig):
    if operate.user_account is None:
        print_section("Set up local user account")
        print("Creating a new local user account...")
        password = ask_confirm_password()
        UserAccount.new(
            password=password,
            path=operate._path / "user.json",
        )
        config.password_migrated = True
        config.store()
    else:
        password = handle_password_migration(operate, config)
        while password is None:
            password = getpass.getpass("\nEnter local user account password [hidden input]: ")
            if operate.user_account.is_valid(password=password):
                break
            password = None
            print("Invalid password!")

    operate.password = password

def get_service(manager: ServiceManager, template: ServiceTemplate) -> t.Tuple[Service, bool]:
    is_update = False
    if len(manager.json) > 0:
        old_hash = manager.json[0]["hash"]
        if old_hash == template["hash"]:
            print(f'Loading service {template["hash"]}')
            service = manager.load(
                service_config_id=manager.json[0]["service_config_id"],
            )
        else:
            print(f"Updating service from {old_hash} to " + template["hash"])
            service = manager.update(
                service_config_id=manager.json[0]["service_config_id"],
                service_template=template,
            )
            is_update = True
    else:
        print(f'Creating service {template["hash"]}')
        service = manager.load_or_create(
            hash=template["hash"],
            service_template=template,
        )

    return service, is_update

def ensure_enough_funds(operate: "OperateApp", service: Service) -> None:
    if not operate.wallet_manager.exists(ledger_type=LedgerType.ETHEREUM):
        print("Creating the master EOA...")
        wallet, mnemonic = operate.wallet_manager.create(ledger_type=LedgerType.ETHEREUM)
        wallet.password = operate.password
        print()
        print_box(f"Please save the mnemonic phrase for the master EOA:\n{', '.join(mnemonic)}", 0, '-')
        input("Press enter to continue...")
    else:
        wallet = operate.wallet_manager.load(ledger_type=LedgerType.ETHEREUM)

    manager = operate.service_manager()
    config = load_local_config()

    for chain_name, chain_config in service.chain_configs.items():
        chain_metadata = CHAIN_ID_TO_METADATA[chain_name]
        token: str = chain_metadata["token"]

        if chain_config.ledger_config.rpc is not None:
            os.environ["CUSTOM_CHAIN_RPC"] = chain_config.ledger_config.rpc
            os.environ["OPEN_AUTONOMY_SUBGRAPH_URL"] = "https://subgraph.autonolas.tech/subgraphs/name/autonolas-staging"

        service_state: OnChainState = manager._get_on_chain_state(service, chain_name)

        chain = chain_config.ledger_config.chain
        ledger_api = wallet.ledger_api(
            chain=chain,
            rpc=chain_config.ledger_config.rpc,
        )
        
        balance_str = wei_to_token(ledger_api.get_balance(wallet.crypto.address), token)

        print(f"[{chain_name}] Master EOA balance: {balance_str}",)
        safe_exists = wallet.safes.get(chain) is not None
        if safe_exists:
            print(f"[{chain_name}] Master safe balance: {wei_to_token(ledger_api.get_balance(wallet.safes[chain]), token)}")

        operational_fund_req = chain_metadata.get("operationalFundReq")
        agent_fund_requirement = chain_config.chain_data.user_params.fund_requirements.agent
        safe_fund_requirement = chain_config.chain_data.user_params.fund_requirements.safe

        safety_margin = SAFETY_MARGIN if service_state == OnChainState.NON_EXISTENT else 0
        if chain_config.chain_data.multisig != DUMMY_MULTISIG:
            service_save_balance = ledger_api.get_balance(chain_config.chain_data.multisig)
            print(f"[{chain_name}] Service safe balance: {wei_to_token(service_save_balance, token)}")
            if service_save_balance >= safe_fund_requirement:
                safe_fund_requirement = 0

        if len(service.keys) > 0:
            agent_eoa_balance = ledger_api.get_balance(service.keys[0].address)
            print(f"[{chain_name}] Agent EOA balance: {wei_to_token(agent_eoa_balance, token)}")
            if agent_eoa_balance >= agent_fund_requirement:
                agent_fund_requirement = 0

        required_balance = operational_fund_req + agent_fund_requirement + safe_fund_requirement
        if required_balance > ledger_api.get_balance(wallet.crypto.address):
            required_balance += safety_margin

            print(
                f"[{chain_name}] Please make sure master EOA {wallet.crypto.address} has at least {wei_to_token(required_balance, token)}",
            )
            spinner = Halo(
                text=f"[{chain_name}] Waiting for at least {wei_to_token(required_balance - ledger_api.get_balance(wallet.crypto.address), token)}...",
                spinner="dots"
            )
            spinner.start()

            required_balance -= safety_margin
            while ledger_api.get_balance(wallet.crypto.address) < required_balance:
                time.sleep(1)

            spinner.succeed(f"[{chain_name}] master EOA updated balance: {wei_to_token(ledger_api.get_balance(wallet.crypto.address), token)}.")

        if not safe_exists:
            print(f"[{chain_name}] Creating Master Safe")
            ledger_type = LedgerType.ETHEREUM
            wallet_manager = operate.wallet_manager
            wallet = wallet_manager.load(ledger_type=ledger_type)
            backup_owner=input("Please input your backup owner (leave empty to skip): ")

            wallet.create_safe(
                chain=chain,
                rpc=chain_config.ledger_config.rpc,
                backup_owner=None if backup_owner == "" else backup_owner,
            )

        print_section(f"[{chain_name}] Set up the service in the Olas Protocol")

        safe_address = wallet.safes[chain]
        top_up = agent_fund_requirement + safe_fund_requirement

        if top_up > ledger_api.get_balance(safe_address):
            top_up += safety_margin
            spinner = Halo(
                text=f"[{chain_name}] Transfering {wei_to_token(top_up, token)} to master safe...",
                spinner="dots",
            )
            spinner.start()

            wallet.transfer(
                to=t.cast(str, safe_address),
                amount=top_up,
                chain=chain,
                from_safe=False,
                rpc=chain_config.ledger_config.rpc,
            )

            spinner.succeed(f"[{chain_name}] Master Safe updated balance: {wei_to_token(ledger_api.get_balance(safe_address), token)}.")

        if chain_config.chain_data.user_params.use_staking:
            olas_address = config.staking_vars["CUSTOM_OLAS_ADDRESS"]
            if service_state in (
                OnChainState.NON_EXISTENT,
                OnChainState.PRE_REGISTRATION,
            ):
                required_olas = (
                    config.staking_vars["MIN_STAKING_BOND_OLAS"]
                    + config.staking_vars["MIN_STAKING_BOND_OLAS"]
                )
            elif service_state == OnChainState.ACTIVE_REGISTRATION:
                required_olas = config.staking_vars["MIN_STAKING_BOND_OLAS"]
            else:
                required_olas = 0

            if required_olas > 0:
                print(f"[{chain_name}] Please make sure address {safe_address} has at least {wei_to_token(required_olas, STAKED_BONDING_TOKEN)}")

                spinner = Halo(
                    text=f"[{chain_name}] Waiting for {wei_to_token(required_olas - get_erc20_balance(ledger_api, olas_address, safe_address), STAKED_BONDING_TOKEN)}...",
                    spinner="dots",
                )
                spinner.start()
                while get_erc20_balance(ledger_api, olas_address, safe_address) < required_olas:
                    time.sleep(1)

                balance = get_erc20_balance(ledger_api, olas_address, safe_address) / 10 ** 18
                spinner.succeed(f"[{chain_name}] Master Safe updated balance: {balance} {STAKED_BONDING_TOKEN}")


def run_service(operate: "OperateApp", config_path: str) -> None:
    """Run service."""

    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_title(f"{template['name']} quickstart")
    config = configure_local_config(template)
    manager = operate.service_manager()
    service, is_service_update = get_service(manager, template)
    ask_password_if_needed(operate, config)

    # reload manger and config after setting operate.password
    manager = operate.service_manager()
    config = load_local_config()
    ensure_enough_funds(operate, service)

    # return  # TODO: Remove this line
    print_section(f"Deploying on-chain service on {config.principal_chain}...")
    print_box("PLEASE, DO NOT INTERRUPT THIS PROCESS.")
    print("Cancelling the on-chain service update prematurely could lead to an inconsistent state of the Safe or the on-chain service state, which may require manual intervention to resolve.\n")
    manager.deploy_service_onchain_from_safe(service_config_id=service.service_config_id)

    print_section("Funding the service")
    manager.fund_service(service_config_id=service.service_config_id)
    print()

    print_section("Deploying the service")
    manager.deploy_service_locally(service_config_id=service.service_config_id, use_docker=True)

    print()
    print_section(f"Starting the {template['name']}")
