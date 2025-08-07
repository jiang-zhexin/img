import { Hono } from "hono";
import { cache } from "hono/cache";
import { etag } from "hono/etag";
import { logger } from "hono/logger";
import { vValidator } from "@hono/valibot-validator";

import { ImageTransform } from "./schema/image_transform";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(logger());

app.use(async (c, next) => {
  const cache = await caches.open("transformed-images");
  const cacheResponse = await cache.match(c.req.url);
  if (cacheResponse) {
    return cacheResponse;
  }
  await next();
});

app.use(
  cache({
    cacheName: "transformed-images",
    cacheControl: "public, max-age=31556952, immutable",
  })
);

app.use(etag());

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
    return new Response(obj.body, { headers });
  }
  const result = await c.env.IMAGES.input(obj.body)
    .transform(opts)
    .output({ format: "image/webp" });
  return result.response();
});

export default app;
