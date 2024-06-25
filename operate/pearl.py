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

"""File used for pyinstaller to create a single executable file."""

# pylint: disable=all
# mypy: ignore-errors
# flake8: noqa
from aea.crypto.registries.base import *
from aea.mail.base_pb2 import DESCRIPTOR
from aea_ledger_cosmos.cosmos import *  # noqa
from aea_ledger_ethereum.ethereum import *
from aea_ledger_ethereum_flashbots.ethereum_flashbots import *  # noqa
from google.protobuf.descriptor_pb2 import FileDescriptorProto
from multiaddr.codecs.idna import to_bytes as _
from multiaddr.codecs.uint16be import to_bytes as _

from operate.cli import main


if __name__ == "__main__":
    main()
