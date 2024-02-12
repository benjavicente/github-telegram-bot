import { Hono } from "hono";

import { githubApp } from "./github";
import { telegramApp } from "./telegram";
import { Env } from "hono/netlify";

const app = new Hono<Env>();

app.get("/", (c) => c.text("Hi"));
app.route("/", telegramApp);
app.route("/", githubApp);

export default app;
