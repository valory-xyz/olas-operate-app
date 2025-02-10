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
"""Agent Quickstart script."""

import getpass
import json
import os
import textwrap
import time
import typing as t
import warnings
from dataclasses import dataclass
from halo import Halo
from pathlib import Path

warnings.filterwarnings("ignore", category=UserWarning)

from aea_ledger_cosmos import LedgerApi
from operate.utils.common import CHAIN_TO_METADATA
from operate.account.user import UserAccount
from operate.constants import OPERATE_HOME, ZERO_ADDRESS
from operate.resource import LocalResource, deserialize
from operate.services.manage import ServiceManager
from operate.services.service import Service, NON_EXISTENT_MULTISIG
from operate.operate_types import (
    LedgerType,
    ServiceEnvProvisionType,
    ServiceTemplate,
    OnChainState,
)
from operate.quickstart.choose_staking import (
    NO_STAKING_PROGRAM_ID,
    StakingHandler,
    StakingVariables,
)
from operate.utils.common import (
    check_rpc,
    print_box,
    print_section,
    print_title,
    wei_to_token,
)
from operate.utils.gnosis import get_asset_balance

if t.TYPE_CHECKING:
    from operate.cli import OperateApp


@dataclass
class QuickstartConfig(LocalResource):
    """Local configuration."""

    path: Path
    rpc: t.Optional[t.Dict[str, str]] = None
    password_migrated: t.Optional[bool] = None
    staking_vars: t.Optional[StakingVariables] = None
    principal_chain: t.Optional[str] = None
    user_provided_args: t.Optional[t.Dict[str, str]] = None

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
    """Get password from user input or environment."""
    if os.getenv("ATTENDED", "true").lower() == "true":
        while True:
            password = getpass.getpass("Please input your password (or press enter): ")
            confirm_password = getpass.getpass("Please confirm your password: ")

            if password == confirm_password:
                return password
            else:
                print("Passwords do not match!")
    else:
        # In unattended mode, get password from environment
        password = os.getenv("OPERATE_PASSWORD")
        if not password:
            raise ValueError("OPERATE_PASSWORD environment variable must be set in unattended mode")
        return password

def load_local_config() -> QuickstartConfig:
    """Load the local quickstart configuration."""
    path = OPERATE_HOME / "local_config.json"
    if path.exists():
        config = QuickstartConfig.load(path)
    else:
        config = QuickstartConfig(path)

    return config

def configure_local_config(template: ServiceTemplate) -> QuickstartConfig:
    """Configure local quickstart configuration."""
    config = load_local_config()
    attended = os.getenv("ATTENDED", "true").lower() == "true"
    if config.rpc is None:
        config.rpc = {}

    for chain in template["configurations"]:
        while not check_rpc(config.rpc.get(chain)):
            if attended:
                config.rpc[chain] = getpass.getpass(
                    f"Enter a {CHAIN_TO_METADATA[chain]['name']} RPC that supports eth_newFilter [hidden input]: "
                )
            else:
                rpc_env = f"{chain.upper()}_LEDGER_RPC"
                if not os.getenv(rpc_env):
                    raise ValueError(f"{rpc_env} environment variable must be set in unattended mode")
                config.rpc[chain] = os.getenv(rpc_env)
        
        os.environ[f"{chain.upper()}_LEDGER_RPC"] = config.rpc[chain]

    if config.password_migrated is None:
        config.password_migrated = False

    staking_handler = StakingHandler(
        staking_programs=template["staking_programs"],
        rpc=config.rpc[template["home_chain"]],
        default_agent_id=template["agent_id"],
    )
    if config.staking_vars is None:
        if attended:
            print_section("Please, select your staking program preference")
            ids = list(template["staking_programs"].keys())
            available_choices = {}
            for index, program_id in enumerate(ids):
                metadata = staking_handler.get_staking_contract_metadata(program_id=program_id)
                name = metadata["name"]
                description = metadata["description"]
                available_slots = metadata["available_staking_slots"] 
                wrapped_description = textwrap.fill(
                    description, width=80, initial_indent="   ", subsequent_indent="   "
                )
                print(f"{index + 1}) {name}\t(available slots : {available_slots})\n{wrapped_description}\n")
                if available_slots != 0:
                    available_choices[index + 1] = {
                        "program_id": program_id,
                        "slots": available_slots,
                        "name": name
                    }
            while True:
                try:
                    choice = int(input(f"Enter your choice (1 - {len(ids)}): "))
                    if choice not in available_choices:
                        print("\nPlease select a program with available slots:") 
                        for idx, prog in available_choices.items():
                            print(f"{idx}) {prog['name']} : available slots {prog['slots']}")
                        continue
                    selected_program = available_choices[choice]
                    program_id = selected_program["program_id"]
                    print(f"Selected staking program: {selected_program['name']}")
                    config.staking_vars = staking_handler.get_staking_env_variables(program_id=program_id)
                    break
                except ValueError:
                    print(f"Please enter a valid option (1 - {len(ids)}).")
        else:
            program_id = os.getenv("STAKING_PROGRAM")
            if not program_id:
                raise ValueError("STAKING_PROGRAM environment variable must be set in unattended mode")
            config.staking_vars = staking_handler.get_staking_env_variables(program_id=program_id)

    if config.principal_chain is None:
        config.principal_chain = template["home_chain"]

    # set chain configs in the service template
    no_staking_vars = staking_handler.get_staking_env_variables(program_id=NO_STAKING_PROGRAM_ID)
    for chain in template["configurations"]:
        if chain == config.principal_chain:
            template["configurations"][chain] |= {
                "staking_program_id": config.staking_vars["STAKING_PROGRAM"],
                "rpc": config.rpc[chain],
                "agent_id": int(config.staking_vars["AGENT_ID"]),
                "use_staking": config.staking_vars["USE_STAKING"],
                "cost_of_bond": int(config.staking_vars["MIN_STAKING_BOND_OLAS"]),
            }
        else:
            template["configurations"][chain] |= {
                "staking_program_id": no_staking_vars["STAKING_PROGRAM"],
                "rpc": config.rpc[chain],
                "agent_id": int(no_staking_vars["AGENT_ID"]),
                "use_staking": no_staking_vars["USE_STAKING"],
                "cost_of_bond": int(no_staking_vars["MIN_STAKING_BOND_OLAS"]),
            }

    if config.user_provided_args is None:
        config.user_provided_args = {}

    if attended and any(
        (
            env_var_data["provision_type"] == ServiceEnvProvisionType.USER
            and env_var_name not in config.user_provided_args
        ) for env_var_name, env_var_data in template["env_variables"].items()
    ):
        print_section("Please enter the arguments that will be used by the service.")

    for env_var_name, env_var_data in template["env_variables"].items():
        if env_var_data["provision_type"] == ServiceEnvProvisionType.USER:
            if env_var_name not in config.user_provided_args:
                if attended:
                    print(f"Description: {env_var_data['description']}")
                    if env_var_data["value"]:
                        print(f"Example: {env_var_data['value']}")
                    config.user_provided_args[env_var_name] = input(f"Please enter {env_var_data['name']}: ")
                    print()
                else:
                    env_value = os.getenv(env_var_name)
                    if not env_value:
                        raise ValueError(f"{env_var_name} environment variable must be set in unattended mode")
                    config.user_provided_args[env_var_name] = env_value

            template["env_variables"][env_var_name]["value"] = config.user_provided_args[env_var_name]

        # TODO: Handle it in a more generic way
        if (
            template["env_variables"][env_var_name]["provision_type"] == ServiceEnvProvisionType.COMPUTED and
            "SUBGRAPH_API_KEY" in config.user_provided_args and
            "{SUBGRAPH_API_KEY}" in template["env_variables"][env_var_name]["value"]
        ):
            template["env_variables"][env_var_name]["value"] = template["env_variables"][env_var_name]["value"].format(
                SUBGRAPH_API_KEY=config.user_provided_args["SUBGRAPH_API_KEY"],
            )

    config.store()
    return config

def handle_password_migration(operate: "OperateApp", config: QuickstartConfig) -> t.Optional[str]:
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

def ask_password_if_needed(operate: "OperateApp", config: QuickstartConfig):
    attended = os.getenv("ATTENDED", "true").lower() == "true"
    
    if operate.user_account is None:
        if attended:
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
            if attended:
                password = getpass.getpass("\nEnter local user account password [hidden input]: ")
            else:
                password = os.getenv("OPERATE_PASSWORD")
                if not password:
                    raise ValueError("OPERATE_PASSWORD environment variable must be set in unattended mode")
            
            if operate.user_account.is_valid(password=password):
                break
            password = None
            if attended:
                print("Invalid password!")

    operate.password = password

def get_service(manager: ServiceManager, template: ServiceTemplate) -> Service:
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

        service.env_variables = template["env_variables"]
        service.store()
    else:
        print(f'Creating service {template["hash"]}')
        service = manager.load_or_create(
            hash=template["hash"],
            service_template=template,
        )

    return service

def ask_funds_in_address(
    ledger_api: LedgerApi,
    required_balance: int,
    asset_address: str,
    recipient_name: str,
    recipient_address: str,
    chain: str
) -> None:
    """Ask for funds in address."""
    if required_balance > get_asset_balance(ledger_api, asset_address, recipient_address):
        print(
            f"[{chain}] Please make sure {recipient_name} {recipient_address} "
            f"has at least {wei_to_token(required_balance, chain, asset_address)}",
        )
        waiting_for_amount = required_balance - get_asset_balance(ledger_api, asset_address, recipient_address)
        spinner = Halo(
            text=f"[{chain}] Waiting for at least {wei_to_token(waiting_for_amount, chain, asset_address)}...",
            spinner="dots"
        )
        spinner.start()

        while True:
            time.sleep(1)
            updated_balance = get_asset_balance(ledger_api, asset_address, recipient_address)
            if updated_balance >= required_balance:
                break

        spinner.succeed(f"[{chain}] {recipient_name} updated balance: {wei_to_token(updated_balance, chain, asset_address)}.")

def ensure_enough_funds(operate: "OperateApp", service: Service) -> None:
    attended = os.getenv("ATTENDED", "true").lower() == "true"

    if not operate.wallet_manager.exists(ledger_type=LedgerType.ETHEREUM):
        print("Creating the Master EOA...")
        wallet, mnemonic = operate.wallet_manager.create(ledger_type=LedgerType.ETHEREUM)
        wallet.password = operate.password
        if attended:
            print_box(f"Please save the mnemonic phrase for the Master EOA:\n{', '.join(mnemonic)}", 0, '-')
            input("Press enter to continue...")
        else:
            print(f"Mnemonic phrase for Master EOA:\n{', '.join(mnemonic)}")
    else:
        wallet = operate.wallet_manager.load(ledger_type=LedgerType.ETHEREUM)

    manager = operate.service_manager()
    config = load_local_config()

    for chain_name, chain_config in service.chain_configs.items():
        print_section(f"[{chain_name}] Set up the service in the Olas Protocol")
        chain_metadata = CHAIN_TO_METADATA[chain_name]

        if chain_config.ledger_config.rpc is not None:
            os.environ["CUSTOM_CHAIN_RPC"] = chain_config.ledger_config.rpc

        chain = chain_config.ledger_config.chain
        ledger_api = wallet.ledger_api(
            chain=chain,
            rpc=chain_config.ledger_config.rpc,
        )

        for asset_address, fund_requirements in chain_config.chain_data.user_params.fund_requirements.items():
            gas_fund_req = 0
            agent_fund_requirement = fund_requirements.agent
            safe_fund_requirement = fund_requirements.safe
            service_state = manager._get_on_chain_state(service, chain_name)
            if asset_address == ZERO_ADDRESS:
                gas_fund_req = chain_metadata.get("gasFundReq")
                if service_state in (OnChainState.NON_EXISTENT, OnChainState.PRE_REGISTRATION, OnChainState.ACTIVE_REGISTRATION):
                    agent_fund_requirement += 2  # for 1 wei in msg.value during registration and activation

            # print the master EOA balance that was created above
            balance_str = wei_to_token(get_asset_balance(ledger_api, asset_address, wallet.crypto.address), chain_name, asset_address)
            print(f"[{chain_name}] Master EOA balance: {balance_str}",)

            # if master safe exists print its balance
            safe_exists = wallet.safes.get(chain) is not None
            if safe_exists:
                balance_str = wei_to_token(get_asset_balance(ledger_api, asset_address, wallet.safes[chain]), chain_name, asset_address)
                print(f"[{chain_name}] Master safe balance: {balance_str}")

            # if service safe exists print its balance
            if chain_config.chain_data.multisig != NON_EXISTENT_MULTISIG:
                service_save_balance = get_asset_balance(ledger_api, asset_address, chain_config.chain_data.multisig)
                print(f"[{chain_name}] Service safe balance: {wei_to_token(service_save_balance, chain_name, asset_address)}")
                if service_save_balance >= safe_fund_requirement:
                    safe_fund_requirement = 0  # no need to fund the service safe if it has enough funds

            # if agent EOA exists print its balance
            if len(service.keys) > 0:
                agent_eoa_balance = get_asset_balance(ledger_api, asset_address, service.keys[0].address)
                print(f"[{chain_name}] Agent EOA balance: {wei_to_token(agent_eoa_balance, chain_name, asset_address)}")
                if agent_eoa_balance >= agent_fund_requirement:
                    agent_fund_requirement = 0  # no need to fund the agent EOA if it has enough funds

            # ask for enough funds in master EOA for gas fees
            ask_funds_in_address(
                ledger_api=ledger_api,
                required_balance=gas_fund_req,
                asset_address=asset_address,
                recipient_name="Master EOA",
                recipient_address=wallet.crypto.address,
                chain=chain_name
            )

            # if master safe does not exist, create it
            if not safe_exists:
                print(f"[{chain_name}] Creating Master Safe")
                wallet_manager = operate.wallet_manager
                wallet = wallet_manager.load(ledger_type=LedgerType.ETHEREUM)
                if attended:
                    backup_owner = input("Please input your backup owner (leave empty to skip): ")
                else:
                    backup_owner = os.getenv("BACKUP_OWNER", "")
                    if backup_owner != "":
                        print(f"[{chain_name}] Linking Backup Owner:{backup_owner}")

                wallet.create_safe(
                    chain=chain,
                    rpc=chain_config.ledger_config.rpc,
                    backup_owner=None if backup_owner == "" else backup_owner,
                )

            # ask for enough funds in master safe for agent EOA + service safe
            ask_funds_in_address(
                ledger_api=ledger_api,
                required_balance=agent_fund_requirement + safe_fund_requirement,
                asset_address=asset_address,
                recipient_name="Master Safe",
                recipient_address=wallet.safes[chain],
                chain=chain_name
            )

        # if staking, ask for the required OLAS for it
        if chain_config.chain_data.user_params.use_staking:
            if service_state in (
                OnChainState.NON_EXISTENT,
                OnChainState.PRE_REGISTRATION,
            ):
                required_olas = 2 * config.staking_vars["MIN_STAKING_BOND_OLAS"]
            elif service_state == OnChainState.ACTIVE_REGISTRATION:
                required_olas = config.staking_vars["MIN_STAKING_BOND_OLAS"]
            else:
                required_olas = 0

            ask_funds_in_address(
                ledger_api=ledger_api,
                required_balance=required_olas,
                asset_address=config.staking_vars["CUSTOM_OLAS_ADDRESS"],
                recipient_name="Master Safe",
                recipient_address=wallet.safes[chain],
                chain=chain_name
            )


def run_service(operate: "OperateApp", config_path: str) -> None:
    """Run service."""

    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_title(f"{template['name']} quickstart")
    config = configure_local_config(template)
    manager = operate.service_manager()
    service = get_service(manager, template)
    ask_password_if_needed(operate, config)

    # reload manger and config after setting operate.password
    manager = operate.service_manager()
    config = load_local_config()
    ensure_enough_funds(operate, service)

    print_box("PLEASE, DO NOT INTERRUPT THIS PROCESS.")
    print_section(f"Deploying on-chain service on {config.principal_chain}...")
    print("Cancelling the on-chain service update prematurely could lead to an inconsistent state of the Safe or the on-chain service state, which may require manual intervention to resolve.\n")
    manager.deploy_service_onchain_from_safe(service_config_id=service.service_config_id)

    print_section("Funding the service")
    manager.fund_service(service_config_id=service.service_config_id)

    print_section("Deploying the service")
    manager.deploy_service_locally(service_config_id=service.service_config_id, use_docker=True)

    print_section(f"Starting the {template['name']}")
