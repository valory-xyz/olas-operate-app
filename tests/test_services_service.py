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

"""Tests for services.service module."""

import json
import typing as t
from pathlib import Path

import pytest
from deepdiff import DeepDiff

from operate.services.service import (
    SERVICE_CONFIG_PREFIX,
    SERVICE_CONFIG_VERSION,
    Service,
)


DEFAULT_CONFIG_KWARGS = {
    "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
    "use_staking": True,
    "use_mech_marketplace": False,
    "rpc": "https://rpc.com",
    "service_config_id": "sc-00000000-0000-0000-0000-000000000000",
    "hash_timestamp": 1704063600,
    "token": 42,
    "staked": True,
    "on_chain_state": 4,
    "staking_program_id": "staking_program_1",
    "threshold": 1,
    "agent_id": 14,
    "cost_of_bond": 10000000000000000,
    "fund_requirements_agent": 100000000000000000,
    "fund_requirements_safe": 5000000000000000000,
    "nft": "bafybeinft",
    "name": "Test Service",
    "description": "Service description",
    "keys_address_0": "0x0000000000000000000000000000000000000001",
    "keys_private_key_0": "0x0000000000000000000000000000000000000000000000000000000000000001",
    "instance_0": "0x0000000000000000000000000000000000000001",
    "multisig": "0x0000000000000000000000000000000000000020",
}


def get_config_json_data_v0(**kwargs: t.Any) -> t.Dict[str, t.Any]:
    """get_config_json_data_v0"""

    return {
        "hash": kwargs.get("hash"),
        "keys": [
            {
                "ledger": 0,
                "address": kwargs.get("keys_address_0"),
                "private_key": kwargs.get("keys_private_key_0"),
            }
        ],
        "ledger_config": {"rpc": kwargs.get("rpc"), "type": 0, "chain": 2},
        "chain_data": {
            "instances": [kwargs.get("instance_0")],
            "token": kwargs.get("token"),
            "multisig": kwargs.get("multisig"),
            "staked": True,
            "on_chain_state": kwargs.get("on_chain_state"),
            "user_params": {
                "nft": kwargs.get("nft"),
                "agent_id": kwargs.get("agent_id"),
                "threshold": kwargs.get("threshold"),
                "use_staking": kwargs.get("use_staking"),
                "cost_of_bond": kwargs.get("cost_of_bond"),
                "olas_cost_of_bond": 10000000000000000000,
                "olas_required_to_stake": 10000000000000000000,
                "fund_requirements": {
                    "agent": kwargs.get("fund_requirements_agent"),
                    "safe": kwargs.get("fund_requirements_safe"),
                },
            },
        },
        "service_path": f"/home/user/.operate/services/{kwargs.get('hash')}/trader_pearl",
        "name": kwargs.get("name"),
    }


def get_config_json_data_v2(**kwargs: t.Any) -> t.Dict[str, t.Any]:
    """get_config_json_data_v2"""

    return {
        "version": 2,
        "hash": kwargs.get("hash"),
        "keys": [
            {
                "ledger": 0,
                "address": kwargs.get("keys_address_0"),
                "private_key": kwargs.get("keys_private_key_0"),
            }
        ],
        "home_chain_id": "100",
        "chain_configs": {
            "100": {
                "ledger_config": {"rpc": kwargs.get("rpc"), "type": 0, "chain": 2},
                "chain_data": {
                    "instances": [kwargs.get("instance_0")],
                    "token": kwargs.get("token"),
                    "multisig": kwargs.get("multisig"),
                    "staked": True,
                    "on_chain_state": kwargs.get("on_chain_state"),
                    "user_params": {
                        "staking_program_id": kwargs.get("staking_program_id"),
                        "nft": kwargs.get("nft"),
                        "threshold": kwargs.get("threshold"),
                        "use_staking": kwargs.get("use_staking"),
                        "cost_of_bond": kwargs.get("cost_of_bond"),
                        "fund_requirements": {
                            "agent": kwargs.get("fund_requirements_agent"),
                            "safe": kwargs.get("fund_requirements_safe"),
                        },
                    },
                },
            }
        },
        "service_path": f"/home/user/.operate/services/{kwargs.get('hash')}/trader_pearl",
        "name": kwargs.get("name"),
    }


def get_config_json_data_v3(**kwargs: t.Any) -> t.Dict[str, t.Any]:
    """get_config_json_data_v3"""

    return {
        "version": 3,
        "hash": kwargs.get("hash"),
        "keys": [
            {
                "ledger": 0,
                "address": kwargs.get("keys_address_0"),
                "private_key": kwargs.get("keys_private_key_0"),
            }
        ],
        "home_chain_id": "100",
        "chain_configs": {
            "100": {
                "ledger_config": {"rpc": kwargs.get("rpc"), "type": 0, "chain": 2},
                "chain_data": {
                    "instances": [kwargs.get("instance_0")],
                    "token": kwargs.get("token"),
                    "multisig": kwargs.get("multisig"),
                    "staked": True,
                    "on_chain_state": kwargs.get("on_chain_state"),
                    "user_params": {
                        "staking_program_id": kwargs.get("staking_program_id"),
                        "nft": kwargs.get("nft"),
                        "threshold": kwargs.get("threshold"),
                        "use_staking": kwargs.get("use_staking"),
                        "use_mech_marketplace": kwargs.get("use_mech_marketplace"),
                        "cost_of_bond": kwargs.get("cost_of_bond"),
                        "fund_requirements": {
                            "agent": kwargs.get("fund_requirements_agent"),
                            "safe": kwargs.get("fund_requirements_safe"),
                        },
                    },
                },
            }
        },
        "service_path": f"/home/user/.operate/services/{kwargs.get('hash')}/trader_pearl",
        "name": kwargs.get("name"),
    }


def get_config_json_data_v4(**kwargs: t.Any) -> t.Dict[str, t.Any]:
    """get_config_json_data_v4"""

    return {
        "version": kwargs.get("version"),
        "service_config_id": kwargs.get("service_config_id"),
        "hash": kwargs.get("hash"),
        "hash_history": {kwargs.get("hash_timestamp"): kwargs.get("hash")},
        "keys": [
            {
                "ledger": "ethereum",
                "address": kwargs.get("keys_address_0"),
                "private_key": kwargs.get("keys_private_key_0"),
            }
        ],
        "home_chain": "gnosis",
        "chain_configs": {
            "gnosis": {
                "ledger_config": {"rpc": kwargs.get("rpc"), "chain": "gnosis"},
                "chain_data": {
                    "instances": [kwargs.get("instance_0")],
                    "token": kwargs.get("token"),
                    "multisig": kwargs.get("multisig"),
                    "staked": kwargs.get("staked"),
                    "on_chain_state": kwargs.get("on_chain_state"),
                    "user_params": {
                        "staking_program_id": kwargs.get("staking_program_id"),
                        "nft": kwargs.get("nft"),
                        "threshold": kwargs.get("threshold"),
                        "agent_id": kwargs.get("agent_id"),
                        "use_staking": kwargs.get("use_staking"),
                        "use_mech_marketplace": kwargs.get("use_mech_marketplace"),
                        "cost_of_bond": kwargs.get("cost_of_bond"),
                        "fund_requirements": {
                            "agent": kwargs.get("fund_requirements_agent"),
                            "safe": kwargs.get("fund_requirements_safe"),
                        },
                    },
                },
            }
        },
        "description": kwargs.get("description"),
        "env_variables": {},
        "service_path": kwargs.get("service_path"),
        "name": kwargs.get("name"),
    }


get_expected_data = get_config_json_data_v4


class TestService:
    """Tests for services.service.Service class."""

    @pytest.mark.parametrize(
        "staking_program_id", ["staking_program_1", "staking_program_2"]
    )
    @pytest.mark.parametrize("use_mech_marketplace", [True, False])
    @pytest.mark.parametrize("use_staking", [True, False])
    @pytest.mark.parametrize(
        "get_config_json_data",
        [get_config_json_data_v0, get_config_json_data_v2, get_config_json_data_v3],
    )
    def test_service_migrate_format(
        self,
        get_config_json_data: t.Callable[..., t.Dict[str, t.Any]],
        use_staking: bool,
        use_mech_marketplace: bool,
        staking_program_id: str,
        tmp_path: Path,
    ) -> None:
        """Test services.service.Service.migrate_format()"""

        config_kwargs = DEFAULT_CONFIG_KWARGS.copy()
        config_kwargs["use_staking"] = use_staking
        config_kwargs["use_mech_marketplace"] = use_mech_marketplace
        config_kwargs["staking_program"] = staking_program_id
        old_config_json_data = get_config_json_data(**config_kwargs)

        # Emulate an existing service directory contents
        service_config_dir = tmp_path / old_config_json_data.get(
            "service_config_id", old_config_json_data.get("hash")
        )
        service_config_dir.mkdir(parents=True, exist_ok=True)

        config_json_path = service_config_dir / "config.json"
        with open(config_json_path, "w", encoding="utf-8") as file:
            json.dump(old_config_json_data, file, indent=4)

        # Migrate the service using Service.migrate_format and read the resulting
        # migrated data
        Service.migrate_format(service_config_dir)

        migrated_config_dir = next(tmp_path.glob(f"{SERVICE_CONFIG_PREFIX}*/"))
        new_config_json_path = migrated_config_dir / "config.json"
        with open(new_config_json_path, "r", encoding="utf-8") as file:
            migrated_data = json.load(file)

        # Construct the expected data
        if old_config_json_data.get("version", 0) < 2:
            config_kwargs["staking_program_id"] = "pearl_alpha"

        if old_config_json_data.get("version", 0) < 3:
            config_kwargs["use_mech_marketplace"] = False

        if old_config_json_data.get("version", 0) < 4:
            config_kwargs["description"] = config_kwargs["name"]

        config_kwargs["service_config_id"] = migrated_config_dir.name
        config_kwargs["version"] = SERVICE_CONFIG_VERSION
        config_kwargs["hash_timestamp"] = list(migrated_data["hash_history"].keys())[0]
        config_kwargs["service_path"] = str(migrated_config_dir / "trader_pearl")

        expected_data = get_expected_data(**config_kwargs)

        diff = DeepDiff(migrated_data, expected_data)
        if diff:
            print(diff)

        assert not diff, "Migrated data does not match expected data."
