import pytest
import httpx
from operate import cli
from uvicorn import Config, Server
import asyncio
import pytest_asyncio
from pathlib import Path
from dataclasses import dataclass

@dataclass
class ServerConfig:
    """Server configuration"""
    TEST_HOME = Path("/", "tmp", ".operate")
    TEST_HOST = "localhost"
    TEST_PORT = 8814


@pytest_asyncio.fixture
async def server():
    """"""
    app = cli.create_app(home=ServerConfig.TEST_HOME)
    config = Config(
        app=app,
        host=ServerConfig.TEST_HOST,
        port=ServerConfig.TEST_PORT,
        log_level="info"
    )
    server = Server(config=config)
    server_task = asyncio.create_task(server.serve())

    # Esperar a que el servidor esté listo
    while not server.started:
        await asyncio.sleep(0.1)

    yield server

    # Indicar que el servidor debe cerrarse
    server.should_exit = True

    # Cancelar y esperar la tarea del servidor, manejando la cancelación correctamente
    await server_task


@pytest.mark.asyncio
async def test_items_endpoint(server):
    url = f"http://{ServerConfig.TEST_HOST}:{ServerConfig.TEST_PORT}/api/services"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        assert response.status_code == 200
        assert response.json() == []
