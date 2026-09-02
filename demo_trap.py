from poc_recovery import run_scenario, console
from rich.panel import Panel

if __name__ == "__main__":
    console.print(Panel.fit("[bold red]TriageCore Demo - Scenario 2: Masked Regression Escalation[/bold red]"))
    run_scenario("trap")
