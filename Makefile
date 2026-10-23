PYTHON ?= python3.11
SEED ?= 42
HOST ?= 127.0.0.1
PORT ?= 8000

.PHONY: setup seed dev test eval build run

setup:
	npm ci
	$(PYTHON) -m pip install -r requirements.txt

seed:
	$(PYTHON) -m backend.synthetic_data.cli --seed $(SEED)

dev:
	npm run dev

test:
	npm run verify
	$(PYTHON) -m pytest backend/tests -q

eval:
	npm run verify

build:
	npm run build

run: build
	$(PYTHON) -m uvicorn app.main:app --app-dir backend --host $(HOST) --port $(PORT)
