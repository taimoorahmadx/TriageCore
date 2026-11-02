# B1 real-app QA fixture: Modern TodoMVC

This fixture is copied from [1Marc/modern-todomvc-vanillajs](https://github.com/1Marc/modern-todomvc-vanillajs), upstream revision `58e4669bd959f1b8f8c63a8b2ab6f55173f6104d` (reviewed 2026-11-02).

The upstream README states that the app is about 200 lines, uses native JavaScript modules, has no build tools, and is licensed CC BY 4.0. Attribution: **TasteJS / Marc Grabanski, Modern Vanilla JavaScript TodoMVC**. License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The stylesheet identifies itself as copied from TodoMVC boilerplate; its upstream package [`tastejs/todomvc-app-css`](https://github.com/tastejs/todomvc-app-css) also states CC BY 4.0 (copyright Sindre Sorhus). See `SOURCE-README.md` for the upstream app's original attribution text.

Serve this directory over HTTP because the app uses ES modules. The project QA pipeline serves it at `/apps/modern-todomvc/`. No package installation or build step is needed.

`js/bootstrap.js` is the only added runtime file. The original HTML was changed only to load it; it applies deterministic B1 query-parameter mutations, seeds a test item, then imports the untouched upstream `js/app.js`. See `mutations.md`.
