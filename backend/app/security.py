"""Local password hashing and opaque session-token helpers."""

from __future__ import annotations

import hashlib

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

PASSWORD_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)


def hash_password(password: str, salt: bytes | None = None) -> str:
    """Hash with Argon2id, using a random salt unless a seed salt is supplied."""
    return PASSWORD_HASHER.hash(password) if salt is None else PASSWORD_HASHER.hash(password, salt=salt)


def hash_demo_password(password: str, seed: int, email: str) -> str:
    """Hash a public seeded demo password reproducibly with an account-specific salt."""
    salt = hashlib.sha256(f"quorum-demo:{seed}:{email.lower()}".encode("utf-8")).digest()[:16]
    return hash_password(password, salt=salt)


def verify_password(password_hash: str, password: str) -> bool:
    """Verify a candidate password, treating malformed hashes as failures."""
    try:
        return PASSWORD_HASHER.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
