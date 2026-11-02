from starlette.routing import Mount

from src.api.app import app
from src.api.qa_routes import scenarios


def test_modern_todomvc_preview_is_served_with_query_mutation() -> None:
    apps_mount = next(route for route in app.routes if isinstance(route, Mount) and route.path == "/apps")
    file_path, _ = apps_mount.app.lookup_path("modern-todomvc/index.html")

    assert apps_mount.app.directory.endswith("tests/apps")
    assert file_path.endswith("tests/apps/modern-todomvc/index.html")
    assert 'js/bootstrap.js' in open(file_path, encoding="utf-8").read()


def test_scenarios_identify_all_modern_todomvc_cases() -> None:
    scenario_rows = scenarios()
    real_app_scenarios = [s for s in scenario_rows if s["source"] == "Modern TodoMVC"]
    assert len(real_app_scenarios) == 10
    assert all(s["page"].startswith("apps/modern-todomvc/index.html?") for s in real_app_scenarios)
    assert all("deterministic test mutation" in s["description"].lower() for s in real_app_scenarios)
    assert all(s["source"] == "scenario_lab" for s in scenario_rows if s not in real_app_scenarios)
