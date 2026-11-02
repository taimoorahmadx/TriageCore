const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "rename";
const target = params.get("target") || "delete";
const itemId = params.get("item") || `b1-${mode}-${target}`;
const isDelete = target === "delete";
const controlDataValue = isDelete ? "destroy" : "toggle";
const originalClass = isDelete ? "destroy" : "toggle";
const relocatedClass = isDelete ? "delete-control-renamed" : "toggle-control-renamed";
const storageKey = "todo-modern-vanillajs";

window.localStorage.setItem(
	storageKey,
	JSON.stringify([
		{
			id: itemId,
			title: `B1 ${target} item (${mode})`,
			completed: isDelete,
		},
	])
);

const statusStyle = document.createElement("style");
statusStyle.textContent = `
	[data-b1-state] { margin: 8px auto; max-width: 550px; padding: 8px 12px; font: 14px sans-serif; }
	[data-b1-state="success"] { color: #176b37; background: #e7f6ec; }
	[data-b1-state="error"] { color: #8b1c1c; background: #fdeaea; }
	.todo-list li button.destroy { display: block; }
	.todo-list li button.delete-control-renamed { display: block; position: absolute; top: 0; right: 10px; bottom: 0; width: 40px; height: 40px; margin: auto 0; font-size: 30px; color: #949494; }
	.todo-list li button.delete-control-renamed::after { content: "×"; }
	.todo-list li input.toggle-control-renamed { opacity: 1; position: relative; width: 20px; height: 20px; }
`;
document.head.append(statusStyle);

function addStatus(state, message) {
	let element = document.querySelector(`[data-b1-state="${state}"]`);
	if (!element) {
		element = document.createElement("p");
		element.dataset.b1State = state;
		element.setAttribute(state === "error" ? "role" : "aria-live", state === "error" ? "alert" : "polite");
		document.body.prepend(element);
	}
	element.textContent = message;
}

const list = document.querySelector('[data-todo="list"]');
const observer = new MutationObserver(() => {
	const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
	const item = stored.find((todo) => todo.id === itemId);
	const completed = !isDelete && item?.completed;
	if (window.__b1AppReady && ((!isDelete && completed) || (isDelete && !item))) {
		addStatus("success", `B1 action completed: ${target}`);
	}

	if (mode !== "slow") {
		const control = list.querySelector(`[data-todo="${controlDataValue}"]`);
		if (control?.classList.contains(originalClass)) {
			control.classList.replace(originalClass, relocatedClass);
		}
	}
});
observer.observe(list, { attributes: true, childList: true, subtree: true });

document.addEventListener(
	"click",
	(event) => {
		if (!event.target.closest(`[data-todo="${controlDataValue}"]`)) return;
		if (mode === "throw") {
			event.stopImmediatePropagation();
			throw new Error("B1 injected handler failure");
		}
		if (mode === "noop") {
			event.stopImmediatePropagation();
			return;
		}
		if (mode === "request") {
			event.stopImmediatePropagation();
			fetch(`/__b1_missing_resource__?case=${encodeURIComponent(itemId)}`).then((response) => {
				if (!response.ok) addStatus("error", `B1 simulated service failure: HTTP ${response.status}`);
			});
		}
	},
	true
);

if (mode === "slow") {
	await new Promise((resolve) => window.setTimeout(resolve, 1800));
}

await import("./app.js");
window.__b1AppReady = true;
