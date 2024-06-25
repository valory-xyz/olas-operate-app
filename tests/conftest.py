import asyncio
from dataclasses import dataclass
from pathlib import Path

import pytest_asyncio
from uvicorn import Config, Server

from operate import cli


@dataclass
class ServerConfig:
    """Server configuration"""

    TEST_HOME = Path("/", "tmp", ".operate")
    TEST_HOST = "localhost"
    TEST_PORT = 8814


SERVER_ENDPOINT = f"http://{ServerConfig.TEST_HOST}:{ServerConfig.TEST_PORT}"


@pytest_asyncio.fixture
async def server():
    """Server start"""
    app = cli.create_app(home=ServerConfig.TEST_HOME)
    config = Config(
        app=app,
        host=ServerConfig.TEST_HOST,
        port=ServerConfig.TEST_PORT,
        log_level="info",
    )
    server = Server(config=config)
    server_task = asyncio.create_task(server.serve())

    # Await until the server is up
    while not server.started:
        await asyncio.sleep(0.1)

    yield server

    # Raise the exit flag
    server.should_exit = True

    # Await until the server exits
    await server_task
