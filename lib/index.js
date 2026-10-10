/**
 * Host half of dsh-client-ui-solarized-grid.
 *
 * The theme is browser-side: lib/client.js registers the token override layer and injects the
 * grid stylesheet. This row exists only so the Loader mounts the package, which is what makes
 * client-modules serve the bundle.
 */
export const name = "dsh-client-ui-solarized-grid";

/** No host-side contribution. */
export function apply() {}
