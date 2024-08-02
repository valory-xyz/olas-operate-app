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

from operate.types import ChainIdentifier, ContractAddresses


CONTRACTS = {
    # TODO: autogenerate this when autonomy is bumped to the latest version.
    #  Cannot be done with the given version.
    #  The addresses have been manually copied from:
    #  https://github.com/valory-xyz/open-autonomy/blob/v0.15.1/autonomy/chain/constants.py
    ChainIdentifier.GNOSIS: ContractAddresses(
        {
            "service_manager": "0x04b0007b2aFb398015B76e5f22993a1fddF83644",
            "service_registry": "0x9338b5153AE39BB89f50468E608eD9d764B755fD",
            "service_registry_token_utility": "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",
            "gnosis_safe_proxy_factory": "0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE",
            "gnosis_safe_same_address_multisig": "0x6e7f594f680f7aBad18b7a63de50F0FeE47dfD06",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.ETHEREUM: ContractAddresses(
        {
            "service_registry": "0x48b6af7B12C71f09e2fC8aF4855De4Ff54e775cA",
            "service_registry_token_utility": "0x3Fb926116D454b95c669B6Bf2E7c3bad8d19affA",
            "service_manager": "0x2EA682121f815FBcF86EA3F3CaFdd5d67F2dB143",
            "gnosis_safe_proxy_factory": "0x46C0D07F55d4F9B5Eed2Fc9680B5953e5fd7b461",
            "gnosis_safe_same_address_multisig": "0xfa517d01DaA100cB1932FA4345F68874f7E7eF46",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.GOERLI: ContractAddresses(
        {
            "service_registry": "0x1cEe30D08943EB58EFF84DD1AB44a6ee6FEff63a",
            "service_registry_token_utility": "0x6d9b08701Af43D68D991c074A27E4d90Af7f2276",
            "service_manager": "0x1d333b46dB6e8FFd271b6C2D2B254868BD9A2dbd",
            "gnosis_safe_proxy_factory": "0x65dD51b02049ad1B6FF7fa9Ea3322E1D2CAb1176",
            "gnosis_safe_same_address_multisig": "0x06467Cb835da623384a22aa902647784C1c9f5Ae",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.POLYGON: ContractAddresses(
        {
            "service_registry": "0xE3607b00E75f6405248323A9417ff6b39B244b50",
            "service_registry_token_utility": "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",
            "service_manager": "0x04b0007b2aFb398015B76e5f22993a1fddF83644",
            "gnosis_safe_proxy_factory": "0x3d77596beb0f130a4415df3D2D8232B3d3D31e44",
            "gnosis_safe_same_address_multisig": "0xd8BCC126ff31d2582018715d5291A508530587b0",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.POLYGON_MUMBAI: ContractAddresses(
        {
            "service_registry": "0xf805DfF246CC208CD2F08ffaD242b7C32bc93623",
            "service_registry_token_utility": "0x131b5551c81e9B3E89E9ACE30A5B3D45144E3e42",
            "service_manager": "0xE16adc7777B7C2a0d35033bd3504C028AB28EE8b",
            "gnosis_safe_proxy_factory": "0x9dEc6B62c197268242A768dc3b153AE7a2701396",
            "gnosis_safe_same_address_multisig": "0xd6AA4Ec948d84f6Db8EEf25104CeE0Ecd280C74e",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.CHIADO: ContractAddresses(
        {
            "service_registry": "0x31D3202d8744B16A120117A053459DDFAE93c855",
            "service_registry_token_utility": "0xc2c7E40674f1C7Bb99eFe5680Efd79842502bED4",
            "service_manager": "0xc965a32185590Eb5a5fffDba29E96126b7650eDe",
            "gnosis_safe_proxy_factory": "0xeB49bE5DF00F74bd240DE4535DDe6Bc89CEfb994",
            "gnosis_safe_same_address_multisig": "0xE16adc7777B7C2a0d35033bd3504C028AB28EE8b",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.ARBITRUM_ONE: ContractAddresses(
        {
            "service_registry": "0xE3607b00E75f6405248323A9417ff6b39B244b50",
            "service_registry_token_utility": "0x3d77596beb0f130a4415df3D2D8232B3d3D31e44",
            "service_manager": "0x34C895f302D0b5cf52ec0Edd3945321EB0f83dd5",
            "gnosis_safe_proxy_factory": "0x63e66d7ad413C01A7b49C7FF4e3Bb765C4E4bd1b",
            "gnosis_safe_same_address_multisig": "0xBb7e1D6Cb6F243D6bdE81CE92a9f2aFF7Fbe7eac",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.ARBITRUM_SEPOLIA: ContractAddresses(
        {
            "service_registry": "0x31D3202d8744B16A120117A053459DDFAE93c855",
            "service_registry_token_utility": "0xeB49bE5DF00F74bd240DE4535DDe6Bc89CEfb994",
            "service_manager": "0x5BA58970c2Ae16Cf6218783018100aF2dCcFc915",
            "gnosis_safe_proxy_factory": "0x19936159B528C66750992C3cBcEd2e71cF4E4824",
            "gnosis_safe_same_address_multisig": "0x10100e74b7F706222F8A7C0be9FC7Ae1717Ad8B2",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.OPTIMISTIC: ContractAddresses(
        {
            "service_registry": "0x3d77596beb0f130a4415df3D2D8232B3d3D31e44",
            "service_registry_token_utility": "0xBb7e1D6Cb6F243D6bdE81CE92a9f2aFF7Fbe7eac",
            "service_manager": "0xFbBEc0C8b13B38a9aC0499694A69a10204c5E2aB",
            "gnosis_safe_proxy_factory": "0xE43d4F4103b623B61E095E8bEA34e1bc8979e168",
            "gnosis_safe_same_address_multisig": "0xb09CcF0Dbf0C178806Aaee28956c74bd66d21f73",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.OPTIMISTIC_SEPOLIA: ContractAddresses(
        {
            "service_registry": "0x31D3202d8744B16A120117A053459DDFAE93c855",
            "service_registry_token_utility": "0xeB49bE5DF00F74bd240DE4535DDe6Bc89CEfb994",
            "service_manager": "0x5BA58970c2Ae16Cf6218783018100aF2dCcFc915",
            "gnosis_safe_proxy_factory": "0x19936159B528C66750992C3cBcEd2e71cF4E4824",
            "gnosis_safe_same_address_multisig": "0x10100e74b7F706222F8A7C0be9FC7Ae1717Ad8B2",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.BASE: ContractAddresses(
        {
            "service_registry": "0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE",
            "service_registry_token_utility": "0x34C895f302D0b5cf52ec0Edd3945321EB0f83dd5",
            "service_manager": "0x63e66d7ad413C01A7b49C7FF4e3Bb765C4E4bd1b",
            "gnosis_safe_proxy_factory": "0xBb7e1D6Cb6F243D6bdE81CE92a9f2aFF7Fbe7eac",
            "gnosis_safe_same_address_multisig": "0xFbBEc0C8b13B38a9aC0499694A69a10204c5E2aB",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.BASE_SEPOLIA: ContractAddresses(
        {
            "service_registry": "0x31D3202d8744B16A120117A053459DDFAE93c855",
            "service_registry_token_utility": "0xeB49bE5DF00F74bd240DE4535DDe6Bc89CEfb994",
            "service_manager": "0x5BA58970c2Ae16Cf6218783018100aF2dCcFc915",
            "gnosis_safe_proxy_factory": "0x19936159B528C66750992C3cBcEd2e71cF4E4824",
            "gnosis_safe_same_address_multisig": "0x10100e74b7F706222F8A7C0be9FC7Ae1717Ad8B2",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.CELO: ContractAddresses(
        {
            "service_registry": "0xE3607b00E75f6405248323A9417ff6b39B244b50",
            "service_registry_token_utility": "0x3d77596beb0f130a4415df3D2D8232B3d3D31e44",
            "service_manager": "0x34C895f302D0b5cf52ec0Edd3945321EB0f83dd5",
            "gnosis_safe_proxy_factory": "0x63e66d7ad413C01A7b49C7FF4e3Bb765C4E4bd1b",
            "gnosis_safe_same_address_multisig": "0xBb7e1D6Cb6F243D6bdE81CE92a9f2aFF7Fbe7eac",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
    ChainIdentifier.CELO_ALFAJORES: ContractAddresses(
        {
            "service_registry": "0x31D3202d8744B16A120117A053459DDFAE93c855",
            "service_registry_token_utility": "0xeB49bE5DF00F74bd240DE4535DDe6Bc89CEfb994",
            "service_manager": "0x5BA58970c2Ae16Cf6218783018100aF2dCcFc915",
            "gnosis_safe_proxy_factory": "0x19936159B528C66750992C3cBcEd2e71cF4E4824",
            "gnosis_safe_same_address_multisig": "0x10100e74b7F706222F8A7C0be9FC7Ae1717Ad8B2",
            "multisend": "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        }
    ),
}

STAKING = {
    ChainIdentifier.GNOSIS: "0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A",
}

OLAS = {
    ChainIdentifier.GNOSIS: "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f",
}
