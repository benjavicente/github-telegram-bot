import "@total-typescript/ts-reset/array-includes";

import { Bot } from "grammy";
import { ChatInfo } from "../jwt";
import { BotContext } from "../telegram/context";
import { createEventHandler } from "./event-handler";
import { DiscussionCreatedEvent, IssuesOpenedEvent, PingEvent } from "@octokit/webhooks-types";
import { MessageBuilder } from "../utils/msgBuilder";

type Env = {
  chatInfo: ChatInfo;
  bot: Bot<BotContext>;
};

export const githubWebhookEventHandler = createEventHandler<Env>();

const simpleGroupWarning = "Nota: si este grupo pasa a ser supergrupo, habrá que reconfigurar el webhook.";

function getConfiguredTo(payload: PingEvent) {
  if (payload.hook.type === "Organization") return `Escuchando a org ${payload.organization!.login}`;
  if (payload.hook.type === "Repository") return `Escuchando a repo ${payload.repository!.name}`;
  return `Escuchando como App`;
}

const unansweredDiscussionsQuery = "discussions?discussions_q=is%3Aopen+sort%3A-date_created+is%3Aunanswered";

function recommendedUrls(payload: PingEvent) {
  const urls: { name: string; url: string }[] = [];
  if (payload.hook.type === "Repository" && payload.hook.events.includes("discussion")) {
    urls.push({
      name: "Preguntas sin responder",
      url: `https://github.com/${payload.repository!.full_name}/${unansweredDiscussionsQuery}`,
    });
  }

  return urls.map(({ name, url }) => `- <a href="${url}">${name}</a>`).join("\n");
}

function isConfiguredProperly(payload: PingEvent) {
  if (payload.hook.events.includes("issues")) return true;
  if (payload.hook.events.includes("discussion")) return true;
  return false;
}

githubWebhookEventHandler.on("ping", async ({ payload }, { bot, chatInfo }) => {
  if (!isConfiguredProperly(payload)) {
    await bot.api.sendMessage(chatInfo.chatId, "The webhook is not listening to issues or discussions", {
      message_thread_id: chatInfo.topicId,
    });
    return;
  }

  const msg = new MessageBuilder()
    .add("Webhook is working!")
    .newLine()
    .add(getConfiguredTo(payload))
    .newLine()
    .add(recommendedUrls(payload))
    .newLine(2)
    .add(chatInfo.isSimpleGroup && simpleGroupWarning)
    .build();

  await bot.api.sendMessage(chatInfo.chatId, msg, {
    message_thread_id: chatInfo.topicId,
    parse_mode: "HTML",
  });
});

function buildMessageFromDiscussion({ number, title, user, html_url, category }: DiscussionCreatedEvent["discussion"]) {
  return `#${number} - ${category.name} - <a href="${user.html_url}">@${user.login}</a>\n<a href="${html_url}">${title}</a>`;
}

githubWebhookEventHandler.on("discussion.created", async ({ payload }, { bot, chatInfo }) => {
  await bot.api.sendMessage(chatInfo.chatId, buildMessageFromDiscussion(payload.discussion), {
    parse_mode: "HTML",
    message_thread_id: chatInfo.topicId,
    link_preview_options: {
      prefer_small_media: true,
      url: payload.discussion.html_url,
    },
  });
});

function buildMessageFromIssue({ number, title, user, html_url }: IssuesOpenedEvent["issue"]) {
  return `#${number} - <a href="${user.html_url}">@${user.login}</a>\n<a href="${html_url}">${title}</a>`;
}

githubWebhookEventHandler.on("issues.opened", async ({ payload }, { bot, chatInfo }) => {
  await bot.api.sendMessage(chatInfo.chatId, buildMessageFromIssue(payload.issue), {
    parse_mode: "HTML",
    message_thread_id: chatInfo.topicId,
    link_preview_options: {
      prefer_small_media: true,
      url: payload.issue.html_url,
    },
  });
});
