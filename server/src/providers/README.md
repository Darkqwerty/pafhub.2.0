# Provider adapters

Keep Steam, RAWG, F95, and Epic clients behind provider adapters in this directory. Normalize provider results to the catalog model in `../catalog.ts`; do not expose upstream response shapes or credentials to the browser.

Epic has no public owned-games API, so `../importers/epic.ts` talks to the private Epic Games Launcher services (OAuth, launcher assets, catalog). Those endpoints are undocumented and may change without notice.

The requested libraries are declared in the server workspace. The F95 and reCAPTCHA packages have older releases, so check their current compatibility and upstream access requirements when implementing the live adapter.
