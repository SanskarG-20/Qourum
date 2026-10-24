"""Suite-wide guard against accidental outbound socket connections, plus a shared seeded database."""

import ipaddress
import shutil
import socket

import pytest

from backend.app.seed import seed_database


@pytest.fixture(scope="session")
def _seeded_template(tmp_path_factory):
    """Seed the deterministic seed-42 database once; tests copy it instead of rebuilding it."""
    path = tmp_path_factory.mktemp("seed-template") / "template.db"
    seed_database(seed=42, db_path=path)
    return path


@pytest.fixture
def seeded_database(_seeded_template):
    """Return a function that copies the seed-42 database to a destination path."""
    def copy_to(destination):
        shutil.copyfile(_seeded_template, destination)
        return destination
    return copy_to


@pytest.fixture(autouse=True)
def prohibit_network_connections(monkeypatch):
    """Fail every test if application code attempts to open a network socket."""
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    original_sendto = socket.socket.sendto
    original_getaddrinfo = socket.getaddrinfo

    def is_local(address):
        host = address[0] if isinstance(address, tuple) and address else None
        if host in {"localhost", "127.0.0.1", "::1"}:
            return True
        if isinstance(host, str):
            try:
                if ipaddress.ip_address(host).is_loopback:
                    return True
            except ValueError:
                pass
        if isinstance(address, str) and address.startswith(("\\\\?\\pipe\\", "\\\\.\\pipe\\")):
            return True
        return False

    def guarded_connect(sock, address):
        if not is_local(address):
            raise AssertionError("Outbound network access is prohibited in the test suite.")
        return original_connect(sock, address)

    def guarded_connect_ex(sock, address):
        if not is_local(address):
            raise AssertionError("Outbound network access is prohibited in the test suite.")
        return original_connect_ex(sock, address)

    def guarded_getaddrinfo(host, *args, **kwargs):
        if host in {"localhost", "127.0.0.1", "::1"}:
            return original_getaddrinfo(host, *args, **kwargs)
        if isinstance(host, str):
            try:
                if ipaddress.ip_address(host).is_loopback:
                    return original_getaddrinfo(host, *args, **kwargs)
            except ValueError:
                pass
        raise AssertionError("Outbound DNS access is prohibited in the test suite.")

    def guarded_sendto(sock, data, *args):
        address = args[-1] if args else None
        if not is_local(address):
            raise AssertionError("Outbound network access is prohibited in the test suite.")
        return original_sendto(sock, data, *args)

    monkeypatch.setattr(socket.socket, "connect", guarded_connect)
    monkeypatch.setattr(socket.socket, "connect_ex", guarded_connect_ex)
    monkeypatch.setattr(socket.socket, "sendto", guarded_sendto)
    monkeypatch.setattr(socket, "getaddrinfo", guarded_getaddrinfo)
