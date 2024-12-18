from importlib.metadata import version

def get_backend_version():
    return version("olas-operate-middleware")
