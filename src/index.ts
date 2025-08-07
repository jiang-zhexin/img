import { Hono } from "hono";
import { cache } from "hono/cache";
import { etag } from "hono/etag";

const app = new Hono<{ Bindings: CloudflareBindings }>();

const imgApp = new Hono<{ Bindings: CloudflareBindings }>();

app.route("*.jpg", imgApp);
app.route("*.jpeg", imgApp);
app.route("*.png", imgApp);
app.route("*.webp", imgApp);

imgApp.use(
  "*",
  async (c, next) => {
    const cache = await caches.open("transformed-images");
    const cacheResponse = await cache.match(c.req.url);
    if (cacheResponse) {
      return cacheResponse;
    }
    await next();
  },
  cache({
    cacheName: "transformed-images",
    cacheControl: "max-age=60",
  }),
  etag(),
  async (c) => {
    const obj = await c.env.BUCKET.get(c.req.path);
    if (obj === null) {
      return c.notFound();
    }
    const result = await c.env.IMAGES.input(obj.body)
      .transform({ width: 600 })
      .output({ format: "image/webp", quality: 50 });
    return result.response();
  }
);

export default app;
