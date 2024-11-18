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

"""Local resource representation."""

import enum
import json
import typing as t
from dataclasses import asdict, is_dataclass
from pathlib import Path


# pylint: disable=too-many-return-statements,no-member


def serialize(obj: t.Any) -> t.Any:
    """Serialize object."""
    if is_dataclass(obj):
        return serialize(asdict(obj))
    if isinstance(obj, Path):
        return str(obj)
    if isinstance(obj, dict):
        return {serialize(key): serialize(obj=value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [serialize(obj=value) for value in obj]
    if isinstance(obj, enum.Enum):
        return obj.value
    return obj


def deserialize(obj: t.Any, otype: t.Any) -> t.Any:
    """Desrialize a json object."""
    base = getattr(otype, "__class__")  # noqa: B009
    if base.__name__ == "_GenericAlias":  # type: ignore
        args = otype.__args__  # type: ignore
        if len(args) == 1:
            (atype,) = args
            return [deserialize(arg, atype) for arg in obj]
        if len(args) == 2:
            (ktype, vtype) = args
            return {
                deserialize(key, ktype): deserialize(val, vtype)
                for key, val in obj.items()
            }
        return obj
    if base is enum.EnumMeta:
        return otype(obj)
    if otype is Path:
        return Path(obj)
    if is_dataclass(otype):
        return otype.from_json(obj)
    return obj


class LocalResource:
    """Initialize local resource."""

    _file: t.Optional[str] = None

    def __init__(self, path: t.Optional[Path] = None) -> None:
        """Initialize local resource."""
        self.path = path

    @property
    def json(self) -> t.Dict:
        """To dictionary object."""
        obj = {}
        for pname, _ in self.__annotations__.items():
            if pname.startswith("_") or pname == "path":
                continue
            obj[pname] = serialize(self.__dict__[pname])
        return obj

    @classmethod
    def from_json(cls, obj: t.Dict) -> "LocalResource":
        """Load LocalResource from json."""
        kwargs = {}
        for pname, ptype in cls.__annotations__.items():
            if pname.startswith("_"):
                continue
            kwargs[pname] = deserialize(obj=obj[pname], otype=ptype)
        return cls(**kwargs)

    @classmethod
    def load(cls, path: Path) -> "LocalResource":
        """Load local resource."""
        file = (
            path / cls._file
            if cls._file is not None and path.name != cls._file
            else path
        )
        data = json.loads(file.read_text(encoding="utf-8"))
        return cls.from_json(obj={**data, "path": path})

    def store(self) -> None:
        """Store local resource."""
        if self.path is None:
            raise RuntimeError(f"Cannot save {self}; Path value not provided.")

        path = self.path
        if self._file is not None:
            path = path / self._file

        path.write_text(
            json.dumps(
                self.json,
                indent=2,
            ),
            encoding="utf-8",
        )
