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

"""Local resource as an HTTP object."""

import json
import traceback
import typing as t
from abc import ABC

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import Receive, Scope, Send

from operate.operate_http.exceptions import NotAllowed, ResourceException


# pylint: disable=no-self-use

GenericResource = t.TypeVar("GenericResource")
PostPayload = t.TypeVar("PostPayload")
PostResponse = t.TypeVar("PostResponse")
PutPayload = t.TypeVar("PutPayload")
PutResponse = t.TypeVar("PutResponse")
DeletePayload = t.TypeVar("DeletePayload")
DeleteResponse = t.TypeVar("DeleteResponse")


class Resource(
    t.Generic[
        GenericResource,
        PostPayload,
        PostResponse,
        PutPayload,
        PutResponse,
        DeletePayload,
        DeleteResponse,
    ],
    ABC,
):
    """Web<->Local resource object."""

    _handlers: t.Dict[str, t.Callable]

    def __init__(self) -> None:
        """Initialize object."""
        self._handlers = {
            "GET": self._get,
            "POST": self._post,
            "PUT": self._put,
            "DELETE": self._delete,
        }

    async def access(
        self,
        params: t.Dict,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        """Access resource with identifier."""
        raise ValueError("No resource identifer defined")

    @property
    def json(self) -> GenericResource:
        """Return JSON representation of the resource."""
        raise NotAllowed("Resource access not allowed")

    def create(self, data: PostPayload) -> PostResponse:
        """Create a new resource"""
        raise NotAllowed("Resource creation not allowed")

    def update(self, data: PutPayload) -> PutResponse:
        """Create a new resource"""
        raise NotAllowed("Resource update not allowed")

    def delete(self, data: DeletePayload) -> DeleteResponse:
        """Create a new resource"""
        raise NotAllowed("Resource deletion not allowed")

    def _get(self) -> GenericResource:
        """GET method for the resource."""
        return self.json

    def _post(self, data: PostPayload) -> PostResponse:
        """POST method for the resource."""
        return self.create(data=data)

    def _put(self, data: PutPayload) -> PutResponse:
        """PUT method for the resource."""
        return self.update(data=data)

    def _delete(self, data: DeletePayload) -> DeleteResponse:
        """DELETE method for the resource."""
        return self.delete(data=data)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> t.Any:
        """Web handler for sources."""
        request = Request(scope=scope, receive=receive, send=send)
        if request.path_params:
            await self.access(
                scope["path_params"],
                scope=scope,
                receive=receive,
                send=send,
            )
            return

        try:
            handler = self._handlers[request.method]
            try:
                data = await request.json()
            except json.decoder.JSONDecodeError:
                data = {}
            if request.method == "GET":
                content = handler()
            else:
                content = handler(data)
            response = JSONResponse(content=content)
        except ResourceException as e:
            response = JSONResponse(
                content={"error": e.args[0]},
                status_code=e.code,
            )
        except Exception as e:  # pylint: disable=broad-except
            tb = traceback.format_exc()
            response = JSONResponse(
                content={"error": str(e), "traceback": tb},
                status_code=500,
            )
            print(tb)
        await response(scope=scope, receive=receive, send=send)
