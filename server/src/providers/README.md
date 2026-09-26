# Provider adapters

Keep Steam, RAWG, and F95 clients behind provider adapters in this directory. Normalize provider results to the catalog model in `../catalog.ts`; do not expose upstream response shapes or credentials to the browser.

The requested libraries are declared in the server workspace. The F95 and reCAPTCHA packages have older releases, so check their current compatibility and upstream access requirements when implementing the live adapter.
