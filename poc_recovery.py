import os
import time
import re
import json
import subprocess
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from dotenv import load_dotenv

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

load_dotenv()
console = Console()

def ask_llm(prompt: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "Error: GROQ_API_KEY is missing."
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "openai/gpt-oss-20b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0
    }
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            result = subprocess.run([
                "curl", "-sS", "-X", "POST", url,
                "-H", "Content-Type: application/json",
                "-H", f"Authorization: Bearer {api_key}",
                "-d", json.dumps(payload)
            ], capture_output=True, text=True, check=True)
            
            json_data = json.loads(result.stdout)
            
            if "error" in json_data:
                if attempt < max_retries - 1:
                    time.sleep(3)
                    continue
                return f"API Error: {json_data['error']}"
                
            if "choices" not in json_data:
                if attempt < max_retries - 1:
                    time.sleep(3)
                    continue
                return f"Raw Response: {result.stdout}"
                
            return json_data["choices"][0]["message"]["content"]
            
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(3)
                continue
            raw_out = result.stdout if 'result' in locals() else 'No stdout'
            return f"Error connecting to API via curl: {str(e)}\nRaw output: {raw_out}"

def inject_toast(page, message: str, color: str = "#4F46E5", duration_ms: int = 4000):
    script = """
    ([msg, col, dur]) => {
        const toast = document.createElement('div');
        toast.innerText = msg;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.padding = '16px 24px';
        toast.style.backgroundColor = col;
        toast.style.color = 'white';
        toast.style.borderRadius = '12px';
        toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
        toast.style.fontFamily = 'Inter, sans-serif';
        toast.style.zIndex = '9999';
        toast.style.fontWeight = '600';
        toast.style.fontSize = '15px';
        toast.style.transition = 'opacity 0.5s, transform 0.5s';
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 50);

        // Animate out
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 500);
        }, dur);
    }
    """
    page.evaluate(script, [message, color, duration_ms])

def highlight_element(page, selector: str):
    script = """
    (sel) => {
        const el = document.querySelector(sel);
        if (el) {
            el.style.outline = '4px solid #10B981';
            el.style.outlineOffset = '4px';
            el.style.transition = 'all 0.3s ease';
        }
    }
    """
    page.evaluate(script, selector)

def run_scenario(scenario: str):
    console.print(f"\n[bold magenta]--- Running Scenario: {scenario.upper()} ---[/bold magenta]")
    
    file_uri = f"file:///home/user/Desktop/TriageCore/tests/dummy/test_page.html?scenario={scenario}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"ERROR: {str(err)}"))

        page.goto(file_uri)
        page.wait_for_timeout(1000)

        initial_selector = "#submit-btn"
        target_selector = initial_selector

        try:
            console.print(f"[cyan][{scenario}][/cyan] Attempting click with selector [bold]'{initial_selector}'[/bold]...")
            inject_toast(page, f"Agent: Attempting to click '{initial_selector}'...", color="#3B82F6")
            page.click(initial_selector, timeout=2000)
        except PlaywrightTimeoutError:
            console.print(f"[red][{scenario}] TimeoutError: Selector '{initial_selector}' failed.[/red]")
            inject_toast(page, f"🚨 Error: Selector '{initial_selector}' not found!", color="#EF4444")
            page.wait_for_timeout(1500)
            
            console.print(f"[yellow][{scenario}] Extracting DOM and calling AI for healing...[/yellow]")
            inject_toast(page, "🧠 Agent: Extracting DOM & calculating new selector via Groq AI... (This takes 10-20s)", color="#8B5CF6", duration_ms=20000)
            dom_content = page.content()
            
            prompt = (
                f"The CSS selector '{initial_selector}' failed to find the checkout/submit button.\n"
                f"Here is the current HTML of the page:\n\n{dom_content}\n\n"
                "Please analyze the HTML. First, write a brief 1-2 sentence reasoning explaining how you are locating the new button. "
                "Then, on a new line, provide the correct, updated CSS selector wrapped in backticks (e.g., `#new-id`)."
            )
            with console.status("[bold yellow]Waiting for Groq API response...[/bold yellow]", spinner="dots"):
                content_val = ask_llm(prompt)
            console.print(Panel(str(content_val), title="[bold blue]AI Reasoning (Selector)[/bold blue]", border_style="blue"))
            
            matches = re.findall(r'`([^`]+)`', str(content_val))
            target_selector = matches[-1].strip() if matches else str(content_val).strip()
            
            console.print(f"[green][{scenario}] LLM extracted new selector: '{target_selector}'[/green]")
            inject_toast(page, f"✨ Success! AI found new selector: '{target_selector}'", color="#10B981")
            
            highlight_element(page, target_selector)
            page.wait_for_timeout(2000)
            
            try:
                console.print(f"[cyan][{scenario}][/cyan] Retrying click with new selector...")
                inject_toast(page, "Agent: Retrying click...", color="#3B82F6")
                page.click(target_selector, timeout=2000)
                console.print(f"[green][{scenario}] Click successful.[/green]")
            except PlaywrightTimeoutError:
                console.print(f"[red][{scenario}] TimeoutError: Healed selector also failed. Aborting.[/red]")
                browser.close()
                return

        page.wait_for_timeout(1500)
        
        post_click_dom = page.content()
        
        console.print(f"[yellow][{scenario}] Gathering post-click evidence and analyzing...[/yellow]")
        inject_toast(page, "🧠 Agent: Analyzing post-click evidence... (Please wait)", color="#8B5CF6", duration_ms=20000)
        logs_str = "\n".join(console_logs) if console_logs else "No console logs."
        
        classification_prompt = (
            "We have healed a broken selector and clicked the button.\n"
            "Based on the following post-click evidence, did the click result in a SAFE_HEAL "
            "(e.g., successful action, success message visible) or did it mask a broken javascript handler "
            "MASKED_REGRESSION_ESCALATED (e.g., JS errors in console, no success message)?\n\n"
            f"Console logs:\n{logs_str}\n\n"
            f"Post-click DOM:\n{post_click_dom}\n\n"
            "First, write a brief 1-2 sentence reasoning trace explaining your diagnosis. "
            "Then, on a new line, provide strictly one of the following strings wrapped in backticks: `SAFE_HEAL` or `MASKED_REGRESSION_ESCALATED`."
        )
        
        with console.status("[bold yellow]Waiting for Groq API classification...[/bold yellow]", spinner="dots"):
            class_content = ask_llm(classification_prompt)
        
        console.print(Panel(str(class_content), title="[bold magenta]AI Reasoning (Classification)[/bold magenta]", border_style="magenta"))
        
        matches = re.findall(r'`([^`]+)`', str(class_content))
        classification = matches[-1].strip() if matches else str(class_content).strip()
        
        color = "green" if classification == "SAFE_HEAL" else "red"
        panel = Panel(
            Text(classification, justify="center", style=f"bold {color}"),
            title=f"Scenario: {scenario.upper()}",
            expand=False,
            border_style=color
        )
        console.print(panel)
        
        toast_color = "#10B981" if classification == "SAFE_HEAL" else "#EF4444"
        inject_toast(page, f"Final Verdict: {classification}", color=toast_color, duration_ms=5000)
        page.wait_for_timeout(4000)
        
        browser.close()

if __name__ == "__main__":
    import sys
    console.print(Panel.fit("[bold cyan]TriageCore: AI Self-Healing & Classification Demo[/bold cyan]"))
    
    if len(sys.argv) > 1:
        target = sys.argv[1].lower()
        if target in ["control", "trap"]:
            run_scenario(target)
        else:
            console.print("[red]Unknown scenario. Use 'control' or 'trap'.[/red]")
    else:
        # Default behavior: run both sequentially
        run_scenario("control")
        time.sleep(1)
        run_scenario("trap")
