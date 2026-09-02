from poc_recovery import run_scenario, console
from rich.panel import Panel

if __name__ == "__main__":
    console.print(Panel.fit("[bold cyan]TriageCore Demo - Scenario 1: Safe DOM Healing[/bold cyan]"))
    run_scenario("control")
