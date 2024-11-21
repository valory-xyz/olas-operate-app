# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2023 Valory AG
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

"""Chain profiles."""

from operate.operate_types import ChainType, ContractAddresses


CONTRACTS = {
    ChainType.GNOSIS: ContractAddresses(
        {
            "service_manager": "0x04b0007b2aFb398015B76e5f22993a1fddF83644",
            "service_registry": "0x9338b5153AE39BB89f50468E608eD9d764B755fD",
            "service_registry_token_utility": "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",
            "gnosis_safe_proxy_factory": "0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE",
            "gnosis_safe_same_address_multisig": "0x6e7f594f680f7aBad18b7a63de50F0FeE47dfD06",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    )
}

STAKING = {
    ChainType.GNOSIS: {
        "pearl_alpha": "0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A",
        "pearl_beta": "0xeF44Fb0842DDeF59D37f85D61A1eF492bbA6135d",
        "pearl_beta_2": "0x1c2F82413666d2a3fD8bC337b0268e62dDF67434",
        "pearl_beta_3": "0xBd59Ff0522aA773cB6074ce83cD1e4a05A457bc1",
        "pearl_beta_4": "0x3052451e1eAee78e62E169AfdF6288F8791F2918",
        "pearl_beta_5": "0x4Abe376Fda28c2F43b84884E5f822eA775DeA9F4",
        "pearl_beta_mech_marketplace": "0xDaF34eC46298b53a3d24CBCb431E84eBd23927dA",
    }
}

OLAS = {
    ChainType.GNOSIS: "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f",
}
