// `npm test` loader: resolves the `@/` alias and extensionless imports the way Next's bundler does, so plain
// `node --test` (type stripping, --conditions=react-server for `server-only`) runs the app modules unbundled.
import { registerHooks } from "node:module";

const root = new URL("./", import.meta.url).href;
const ours = (url) => url.startsWith(root) && !url.includes("/node_modules/");
// Our .ts files are ES modules; saying so skips Node's CommonJS-first guess and its warning.
const typed = (r) => (ours(r.url) && r.url.endsWith(".ts") ? { ...r, format: "module-typescript" } : r);

registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith("@/")) spec = root + spec.slice(2);
    try {
      return typed(next(spec, ctx));
    } catch (e) {
      if (!/^(\.|file:)/.test(spec) || (ctx.parentURL && !ours(ctx.parentURL))) throw e;
      for (const s of [spec + ".ts", spec + "/index.ts"]) {
        try {
          return typed(next(s, ctx));
        } catch {}
      }
      throw e;
    }
  },
});
