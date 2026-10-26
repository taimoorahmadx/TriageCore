from src.ci.tracing import Commit, attribute


def test_attributes_single_matching_commit():
    commits = [Commit("abc123", "Ada", ("src/app.py",))]
    result = attribute(["src/app.py"], commits)
    assert result.attributed_commit == "abc123"
    assert result.candidates == ("abc123",)
    assert result.ambiguous_commit is False


def test_two_matching_commits_are_ambiguous():
    commits = [
        Commit("new", "Ada", ("src/app.py",)),
        Commit("old", "Lin", ("src/app.py",)),
    ]
    result = attribute(["src/app.py"], commits)
    assert result.attributed_commit is None
    assert result.candidates == ("new", "old")
    assert result.ambiguous_commit is True


def test_no_matching_commit_is_not_attributed():
    result = attribute(["src/app.py"], [Commit("abc123", "Ada", ("README.md",))])
    assert result.attributed_commit is None
    assert result.candidates == ()
    assert result.ambiguous_commit is False


def test_only_considers_first_ten_commits():
    commits = [Commit(f"sha-{index}", "author", ("README.md",)) for index in range(10)]
    commits.append(Commit("too-old", "author", ("src/app.py",)))
    result = attribute(["src/app.py"], commits)
    assert result.attributed_commit is None
    assert result.candidates == ()
    assert result.ambiguous_commit is False


def test_matches_relative_path_suffixes():
    result = attribute(
        ["/workspace/repo/src/app.py"],
        [Commit("abc123", "Ada", ("src/app.py",))],
    )
    assert result.attributed_commit == "abc123"


def test_dependency_manifest_and_lockfile_changes():
    result = attribute(
        ["src/app.py"],
        [Commit("abc123", "Ada", ("requirements-dev.txt", "frontend/package-lock.json"))],
    )
    assert result.dependency_change is True
