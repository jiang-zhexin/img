import { Hono } from "hono";
import { cache } from "hono/cache";
import { etag } from "hono/etag";
import { vValidator } from "@hono/valibot-validator";

import { ImageTransform } from "./schema/image_transform";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(
  cache({
    cacheName: "transformed-images",
    cacheControl: "public, max-age=31556952, immutable",
  })
);

app.use(
  etag({
    generateDigest: (body) => crypto.subtle.digest({ name: "SHA-256" }, body),
  })
);

app.get("*", vValidator("query", ImageTransform), async (c) => {
  const key = c.req.path.slice(1);
  const obj = await c.env.BUCKET.get(key);
  if (obj === null) {
    return c.notFound();
  }
  const opts = c.req.valid("query");
  if (Object.keys(opts).length === 0) {
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    return new Response(obj.body, { headers });
  }
  const result = await c.env.IMAGES.input(obj.body)
    .transform(opts)
    .output({ format: "image/webp" });
  return result.response();
});

export default app;
