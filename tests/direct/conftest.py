import os
import tempfile


# genlayer-testing-suite v0.29 replaces stdin with a temporary file. Windows
# keeps the duplicated descriptor open long enough for os.unlink to raise
# WinError 32. Keep the fixture-owned temp file until normal process cleanup.
_unlink = os.unlink


def _windows_safe_unlink(path):
    try:
        _unlink(path)
    except PermissionError:
        if not str(path).startswith(tempfile.gettempdir()):
            raise


os.unlink = _windows_safe_unlink


def to_hex(addr):
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    from genlayer_py.types import CalldataAddress
    return CalldataAddress(addr).as_hex
