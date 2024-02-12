import { Hono } from "hono";

import { githubWebhookEventHandler } from "./handle";
import { verify } from "@octokit/webhooks-methods";
import { decodeChatInfo } from "../jwt";
import { Env } from "../env";

export const githubApp = new Hono<Env>();

githubApp.post("github/webhook", async (c) => {
  if (c.req.header("content-type") !== "application/json") {
    return c.body("Invalid content-type", 400);
  }

  const id = c.req.header("x-github-delivery");
  const signature = c.req.header("x-hub-signature");
  const name = c.req.header("x-github-event");

  if (!id || !name || !signature) return c.body("Missing headers", 400);

  const token = c.req.query("token");
  if (!token) return c.body("Missing token", 400);

  const textPayload = await c.req.text();
  const isValidPayload = await verify(c.env.GITHUB_WEBHOOK_SECRET, textPayload, signature);

  if (!isValidPayload) return c.body("Invalid signature", 400);

  try {
    const payload = JSON.parse(textPayload);
    const chatInfo = await decodeChatInfo(c.env.JWT_SECRET, token);

    await githubWebhookEventHandler.receive({ id, name: name as any, payload }, { chatInfo, bot: c.var.bot });
    return c.body("OK", 200);
  } catch (error) {
    c.status(500);
    console.error(error);
    return c.body("Error processing webhook");
  }
});
