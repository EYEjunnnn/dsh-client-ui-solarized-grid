/**
 * Browser half of dsh-client-ui-solarized-grid.
 *
 * Registers the Solarized token override layer on the theme service and injects the
 * notebook-grid stylesheet. The bundle is a single self-contained module: it requires
 * nothing from the shared platform table and owns only the style element it appends.
 */
window.__ModuleLoader__.load({
	id: "dsh-client-ui-solarized-grid",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/** Override-layer identity, also used as the owned stylesheet's tag. */
		const SOURCE = "dsh-client-ui-solarized-grid";
		/** Marks the once-per-browser light-appearance pin. */
		const LIGHT_PIN_KEY = "dsh-solarized-grid:light-pinned";
		/** Stylesheet owned by this bundle; the module system drops it on teardown. */
		const gridCss = /*__CSS__*/;

		/*__TOKENS__*/

		/** Append this bundle's stylesheet once, following the ui-theme convention. */
		function installStyles() {
			if (typeof document === "undefined") return () => {};
			const tagId = `${SOURCE}/grid.css`;
			if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = SOURCE;
			tag.dataset.pluginCss = tagId;
			tag.textContent = gridCss;
			document.head.appendChild(tag);
			return () => tag.remove();
		}

		/**
		 * Show Solarized Light on first sight. The stored preference stays untouched when it
		 * already resolves light; a dark resolution is pinned to light once per browser, and
		 * a later choice in Settings is respected until this key is cleared.
		 */
		function pinLight(ctx) {
			try {
				if (localStorage.getItem(LIGHT_PIN_KEY) !== null) return;
				localStorage.setItem(LIGHT_PIN_KEY, "1");
				if (ctx.theme.getTheme().active.colorScheme === "dark") ctx.theme.setTheme("light");
			} catch {
				/* private mode or a documentless run: keep the stored preference */
			}
		}

		/** Service requirement: the theme registry that owns the snapshot. */
		const inject = ["theme"];

		/**
		 * Provide the Solarized palette and the notebook background.
		 * @param ctx - Client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => installStyles(), `${SOURCE}: grid stylesheet`);
			ctx.effect(() => ctx.theme.overrideTokens(SOURCE, SOLARIZED_TOKENS), `${SOURCE}: token override layer`);
			ctx.effect(() => {
				pinLight(ctx);
			}, `${SOURCE}: light appearance pin`);
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
