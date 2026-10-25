# TriageCore developer commands. Run from the repo root.
# Override the interpreter if needed, e.g.  make test PY=python3

PY ?= .venv/bin/python

.PHONY: help setup test test-engine lint weights sensitivity eval api ui verify

help:
	@echo "setup test test-engine lint weights sensitivity eval api ui verify"

setup:
	python3 -m venv .venv
	$(PY) -m pip install -e ".[dev]"
	$(PY) -m playwright install chromium
	cd frontend && npm install

test:
	$(PY) -m pytest -q

test-engine:
	$(PY) -m pytest -q tests/test_engine.py

lint:
	$(PY) -m ruff check src tests

weights:
	$(PY) -m src.core.weights

sensitivity:
	$(PY) -m src.core.sensitivity

eval:
	$(PY) -m src.eval.evaluate

api:
	$(PY) -m uvicorn poc_api.main:app --port 8000

ui:
	cd frontend && npm run dev

verify: test weights
	cd frontend && npm run lint && npm run build
