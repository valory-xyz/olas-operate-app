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

import random
import string
import typing as t
from pathlib import Path

import pytest
from deepdiff import DeepDiff

from operate.cli import OperateApp
from operate.operate_types import ServiceTemplate

from .test_services_service import DEFAULT_CONFIG_KWARGS


ROOT_PATH = Path(__file__).resolve().parent
OPERATE_HOME = ROOT_PATH / ".operate_test"


@pytest.fixture
def random_string() -> str:
    """random_string"""
    length = 8
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))  # nosec B311


def get_template(**kwargs: t.Any) -> ServiceTemplate:
    """get_template"""

    return {
        "name": kwargs.get("name"),
        "hash": kwargs.get("hash"),
        "description": kwargs.get("description"),
        "image": "https://image_url",
        "service_version": "",
        "home_chain": "gnosis",
        "configurations": {
            "gnosis": {
                "staking_program_id": kwargs.get("staking_program_id"),
                "nft": kwargs.get("nft"),
                "rpc": "http://localhost:8545",
                "threshold": kwargs.get("threshold"),
                "agent_id": kwargs.get("agent_id"),
                "use_staking": kwargs.get("use_staking"),
                "use_mech_marketplace": kwargs.get("use_mech_marketplace"),
                "cost_of_bond": kwargs.get("cost_of_bond"),
                "fund_requirements": {
                    "agent": kwargs.get("fund_requirements_agent"),
                    "safe": kwargs.get("fund_requirements_safe"),
                },
                "fallback_chain_params": {},
            }
        },
        "env_variables": {
            "VAR1": {
                "name": "var1_name",
                "description": "var1_description",
                "value": "var1_value",
                "provision_type": "var1_provision_type",
            },
            "VAR2": {
                "name": "var2_name",
                "description": "var2_description",
                "value": "var2_value",
                "provision_type": "var2_provision_type",
            },
        },
    }


class TestServiceManager:
    """Tests for services.manager.ServiceManager class."""

    @pytest.mark.parametrize("update_new_var", [True, False])
    @pytest.mark.parametrize("update_update_var", [True, False])
    @pytest.mark.parametrize("update_name", [True, False])
    @pytest.mark.parametrize("update_description", [True, False])
    @pytest.mark.parametrize("update_hash", [True, False])
    def test_service_manager_partial_update(
        self,
        update_new_var: bool,
        update_update_var: bool,
        update_name: bool,
        update_description: bool,
        update_hash: bool,
        tmp_path: Path,
        random_string: str,
    ) -> None:
        """Test operate.service_manager().update()"""

        operate = OperateApp(
            home=tmp_path / ".operate_test",
        )
        operate.setup()
        password = random_string
        operate.create_user_account(password=password)
        operate.password = password
        service_manager = operate.service_manager()
        service_template = get_template(**DEFAULT_CONFIG_KWARGS)
        service = service_manager.create(service_template)
        service_config_id = service.service_config_id
        service_json = service_manager.load(service_config_id).json

        new_hash = "bafybeicts6zhavxzz2rxahz3wzs2pzamoq64n64wp4q4cdanfuz7id6c2q"
        VAR2_updated_attributes = {
            "name": "var2_name_updated",
            "description": "var2_description_updated",
            "value": "var2_value_updated",
            "provision_type": "var2_provision_type_updated",
            "extra_attr": "extra_val",
        }

        VAR3_attributes = {
            "name": "var3_name",
            "description": "var3_description",
            "value": "var3_value",
            "provision_type": "var3_provision_type",
        }

        # Partial update
        update_template: t.Dict = {}
        expected_service_json = service_json.copy()

        if update_new_var:
            update_template["env_variables"] = update_template.get("env_variables", {})
            update_template["env_variables"]["VAR3"] = VAR3_attributes
            expected_service_json["env_variables"]["VAR3"] = VAR3_attributes

        if update_update_var:
            update_template["env_variables"] = update_template.get("env_variables", {})
            update_template["env_variables"]["VAR2"] = VAR2_updated_attributes
            expected_service_json["env_variables"]["VAR2"] = VAR2_updated_attributes

        if update_name:
            update_template["name"] = "name_updated"
            expected_service_json["name"] = "name_updated"

        if update_description:
            update_template["description"] = "description_updated"
            expected_service_json["description"] = "description_updated"

        if update_hash:
            update_template["hash"] = new_hash
            expected_service_json["hash"] = new_hash

        service_manager.update(
            service_config_id=service_config_id,
            service_template=update_template,
            allow_different_service_public_id=False,
            partial_update=True,
        )
        service_json = service_manager.load(service_config_id).json

        if update_hash:
            timestamp = max(service_json["hash_history"].keys())
            expected_service_json["hash_history"][timestamp] = new_hash

        diff = DeepDiff(service_json, expected_service_json)
        if diff:
            print(diff)

        assert not diff, "Updated service does not match expected service."

    @pytest.mark.parametrize("update_new_var", [True, False])
    @pytest.mark.parametrize("update_update_var", [True, False])
    @pytest.mark.parametrize("update_delete_var", [True, False])
    @pytest.mark.parametrize("update_name", [True, False])
    @pytest.mark.parametrize("update_description", [True, False])
    @pytest.mark.parametrize("update_hash", [True, False])
    def test_service_manager_update(
        self,
        update_new_var: bool,
        update_update_var: bool,
        update_delete_var: bool,
        update_name: bool,
        update_description: bool,
        update_hash: bool,
        tmp_path: Path,
        random_string: str,
    ) -> None:
        """Test operate.service_manager().update()"""

        operate = OperateApp(
            home=tmp_path / ".operate_test",
        )
        operate.setup()
        password = random_string
        operate.create_user_account(password=password)
        operate.password = password
        service_manager = operate.service_manager()
        service_template = get_template(**DEFAULT_CONFIG_KWARGS)
        service = service_manager.create(service_template)
        service_config_id = service.service_config_id
        service_json = service_manager.load(service_config_id).json

        new_hash = "bafybeicts6zhavxzz2rxahz3wzs2pzamoq64n64wp4q4cdanfuz7id6c2q"
        VAR2_updated_attributes = {
            "name": "var2_name_updated",
            "description": "var2_description_updated",
            "value": "var2_value_updated",
            "provision_type": "var2_provision_type_updated",
            "extra_attr": "extra_val",
        }

        VAR3_attributes = {
            "name": "var3_name",
            "description": "var3_description",
            "value": "var3_value",
            "provision_type": "var3_provision_type",
        }

        # Partial update
        update_template: t.Dict = service_template.copy()
        expected_service_json = service_json.copy()

        if update_new_var:
            update_template["env_variables"] = update_template.get("env_variables", {})
            update_template["env_variables"]["VAR3"] = VAR3_attributes
            expected_service_json["env_variables"]["VAR3"] = VAR3_attributes

        if update_update_var:
            update_template["env_variables"] = update_template.get("env_variables", {})
            update_template["env_variables"]["VAR2"] = VAR2_updated_attributes
            expected_service_json["env_variables"]["VAR2"] = VAR2_updated_attributes

        if update_delete_var:
            update_template["env_variables"] = update_template.get("env_variables", {})
            del update_template["env_variables"]["VAR1"]
            del expected_service_json["env_variables"]["VAR1"]

        if update_name:
            update_template["name"] = "name_updated"
            expected_service_json["name"] = "name_updated"

        if update_description:
            update_template["description"] = "description_updated"
            expected_service_json["description"] = "description_updated"

        if update_hash:
            update_template["hash"] = new_hash
            expected_service_json["hash"] = new_hash

        service_manager.update(
            service_config_id=service_config_id,
            service_template=update_template,
            allow_different_service_public_id=False,
            partial_update=False,
        )
        service_json = service_manager.load(service_config_id).json

        if update_hash:
            timestamp = max(service_json["hash_history"].keys())
            expected_service_json["hash_history"][timestamp] = new_hash

        diff = DeepDiff(service_json, expected_service_json)
        if diff:
            print(diff)

        assert not diff, "Updated service does not match expected service."
