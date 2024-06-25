"""Backend tests"""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Type, Union

import httpx  # type: ignore
import pytest  # type: ignore
from uvicorn import Server

from tests.conftest import SERVER_ENDPOINT, ServerConfig


@dataclass
class HTTP:
    """HTTP codes"""

    OK = 200
    UNAUTHORIZED = 401
    GET = "get"
    POST = "post"
    PUT = "put"


async def request_test(
    url: str, method: str, http_code: int, json: Optional[Union[List, Dict]]
) -> None:
    """Request test"""
    async with httpx.AsyncClient() as client:
        response = await getattr(client, method)(url)
        assert response.status_code == http_code
        if json is not None:
            assert response.json() == json


# /api
@pytest.mark.parametrize(
    "url, method, http_code, json",
    [
        (
            f"{SERVER_ENDPOINT}/api",
            HTTP.GET,
            HTTP.OK,
            {
                "name": "Operate HTTP server",
                "version": "0.1.0.rc0",
                "home": str(ServerConfig.TEST_HOME),
            },
        ),
    ],
)
@pytest.mark.asyncio
async def test_api(
    server: Type[Server],
    url: str,
    method: str,
    http_code: int,
    json: Optional[Union[List, Dict]],
) -> None:
    """Test api"""
    url = f"{SERVER_ENDPOINT}/api"
    await request_test(url, method, http_code, json)


# /shutdown_endpoint
@pytest.mark.asyncio
async def test_shutdown(server: Type[Server]) -> None:
    """Test shutdown"""
    with open(
        Path(ServerConfig.TEST_HOME, "operate.kill"), "r", encoding="utf-8"
    ) as file:
        shutdown_endpoint = file.read().strip()
        url = f"{SERVER_ENDPOINT}/{shutdown_endpoint}"
        await request_test(url, HTTP.GET, HTTP.OK, None)


# /api/services
@pytest.mark.parametrize(
    "url, method, http_code, json",
    [
        (f"{SERVER_ENDPOINT}/api/services", HTTP.GET, HTTP.OK, []),
        (f"{SERVER_ENDPOINT}/api/services", HTTP.POST, HTTP.UNAUTHORIZED, None),
        (f"{SERVER_ENDPOINT}/api/services", HTTP.PUT, HTTP.UNAUTHORIZED, None),
    ],
)
@pytest.mark.asyncio
async def test_api_services(
    server: Type[Server],
    url: str,
    method: str,
    http_code: int,
    json: Optional[Union[List, Dict]],
) -> None:
    """Test services"""
    await request_test(url, method, http_code, json)


# # account
# @app.get("/api/account")
# @app.post("/api/account")
# @app.put("/api/account")
# @app.post("/api/account/login")

# # wallet
# @app.get("/api/wallet")
# @app.get("/api/wallet/{chain}")
# @app.post("/api/wallet")
# @app.get("/api/wallet/safe")
# @app.get("/api/wallet/safe/{chain}")
# @app.post("/api/wallet/safe")
# @app.put("/api/wallet/safe")

# # Services
# @app.get("/api/services")
# @app.post("/api/services")
# @app.put("/api/services")
# @app.get("/api/services/{service}")
# @app.post("/api/services/{service}/onchain/deploy")
# @app.post("/api/services/{service}/onchain/stop")
# @app.get("/api/services/{service}/deployment")
# @app.post("/api/services/{service}/deployment/build")
# @app.post("/api/services/{service}/deployment/start")
# @app.post("/api/services/{service}/deployment/stop")
# @app.post("/api/services/{service}/deployment/delete")
