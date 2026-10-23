"""Suite-wide guard against accidental outbound socket connections."""

import ipaddress
import socket

import pytest


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
