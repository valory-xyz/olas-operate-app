import tomli
from pathlib import Path


def test_api_endpoint(test_client):
    response = test_client.get("/api")
    assert response.status_code == 200
    data = tomli.loads((Path(__file__).parent.parent / "pyproject.toml").read_text())
    assert response.json() == {
        "home": str(test_client._home_dir),
        "name": "Operate HTTP server",
        "version": data["tool"]["poetry"]["version"].replace("-", ""),
    }


def test_account_get_endpoint(test_client):
    """Account not set up."""
    response = test_client.get("/api/account")
    assert response.status_code == 200
    assert response.json() == {"is_setup": False}


def test_account_post_endpoint(test_client):
    """Setup account."""
    response = test_client.get("/api/account")
    assert response.status_code == 200
    assert response.json() == {"is_setup": False}

    response = test_client.post("api/account/login", json={"password": "BAD"})
    assert response.status_code == 400, response
    assert response.json() == {"error": "Account does not exist"}

    pwd = "some_pwd"
    response = test_client.post("/api/account", json={"password": pwd})
    assert response.status_code == 200, response

    response = test_client.post("api/account/login", json={"password": "BAD"})
    assert response.status_code == 401, response
    assert response.json() == {"error": "Password is not valid"}

    response = test_client.post("api/account/login", json={"password": pwd})
    assert response.status_code == 200, response
    assert response.json() == {"message": "Login successful"}

    response = test_client.get("/api/account")
    assert response.status_code == 200
    assert response.json() == {"is_setup": True}
