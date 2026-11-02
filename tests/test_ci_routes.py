from src.api import ci_routes


def test_cases_withhold_historical_label_and_form_safe_source_link():
    items = ci_routes.cases()
    historical = next(item for item in items if item["source_type"] == "historical_github_actions")
    assert "label" not in historical
    assert historical["repo"] and str(historical["run_id"]).isdigit()
    assert historical["source_url"] == (
        f"https://github.com/{historical['repo']}/actions/runs/{historical['run_id']}"
    )
    fixture = next(item for item in items if item["source_type"] == "fixture")
    assert "label" in fixture


def test_cases_omit_source_link_for_unsafe_metadata(monkeypatch):
    monkeypatch.setattr(ci_routes, "load_demo_cases", lambda: [{
        "id": "unsafe", "source_type": "historical_github_actions",
        "repo": "owner/../repo", "run_id": "42", "label": "bug",
    }])
    item = ci_routes.cases()[0]
    assert item["source_url"] is None
    assert "label" not in item
