import { Context } from "grammy";

export type BotContext = Context & {
  env: {
    githubWebhookUrl: string;
    jwtSecret: string;
  };
};
