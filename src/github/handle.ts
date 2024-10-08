import "@total-typescript/ts-reset/array-includes";

import { Bot } from "grammy";
import { ChatInfo } from "../jwt";
import { BotContext } from "../telegram/context";
import { createEventHandler } from "./event-handler";
import { DiscussionCreatedEvent, IssuesOpenedEvent, PingEvent, PullRequestEvent } from "@octokit/webhooks-types";
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

function scapeMessage(mgs: string) {
  return mgs.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const unansweredDiscussionsQuery = "discussions?discussions_q=is%3Aopen+sort%3A-date_created+is%3Aunanswered";

const urlsTitle = "URLs importantes:";
function recommendedUrls(payload: PingEvent) {
  const urls: { name: string; url: string }[] = [];
  if (payload.hook.type === "Repository" && payload.hook.events.includes("discussion")) {
    urls.push({
      name: "Preguntas sin responder",
      url: `https://github.com/${payload.repository!.full_name}/${unansweredDiscussionsQuery}`,
    });
  }

  if (urls.length === 0) return;

  return new MessageBuilder()
    .add(urlsTitle)
    .newLine()
    .add(urls.map(({ name, url }) => `- <a href="${url}">${name}</a>`).join("\n"))
    .build();
}

function isConfiguredProperly(payload: PingEvent) {
  if (payload.hook.events.includes("issues")) return true;
  if (payload.hook.events.includes("discussion")) return true;
  if (payload.hook.events.includes("pull_request")) return true;
  return false;
}

const badlyConfiguredMessage = new MessageBuilder()
  .add("El webhook no esta escuchando a issues o discussions.")
  .add("Elimina el webhook y añade correctamente la configuración (ve /start).")
  .build();

githubWebhookEventHandler.on("ping", async ({ payload }, { bot, chatInfo }) => {
  if (!isConfiguredProperly(payload)) {
    await bot.api.sendMessage(chatInfo.chatId, badlyConfiguredMessage, {
      message_thread_id: chatInfo.topicId,
    });
    return;
  }

  const msg = new MessageBuilder()
    .add("¡El Webhook está funcionando!")
    .newLine()
    .add(getConfiguredTo(payload))
    .newLine(2)
    .add(recommendedUrls(payload))
    .newLine(2)
    .add(chatInfo.isSimpleGroup && simpleGroupWarning)
    .build();

  await bot.api.sendMessage(chatInfo.chatId, msg, {
    message_thread_id: chatInfo.topicId,
    parse_mode: "HTML",
  });
});

function buildMessageFromDiscussion({
  discussion: { title, user, html_url, category },
  repository,
}: DiscussionCreatedEvent) {
  return `<a href="${repository.html_url}">${repository.name}</a>[${category.name}] - <a href="${user.html_url}">@${
    user.login
  }</a>\n<a href="${html_url}">${scapeMessage(title)}</a>`;
}

githubWebhookEventHandler.on("discussion.created", async ({ payload }, { bot, chatInfo }) => {
  await bot.api.sendMessage(chatInfo.chatId, buildMessageFromDiscussion(payload), {
    parse_mode: "HTML",
    message_thread_id: chatInfo.topicId,
    link_preview_options: {
      prefer_small_media: true,
      url: payload.discussion.html_url,
    },
  });
});

function buildMessageFromIssue({ issue: { title, user, html_url, number }, repository }: IssuesOpenedEvent) {
  return `<a href="${repository.html_url}">${repository.name}</a>#${number} - <a href="${user.html_url}">@${
    user.login
  }</a>\n<a href="${html_url}">${scapeMessage(title)}</a>`;
}

githubWebhookEventHandler.on("issues.opened", async ({ payload }, { bot, chatInfo }) => {
  await bot.api.sendMessage(chatInfo.chatId, buildMessageFromIssue(payload), {
    parse_mode: "HTML",
    message_thread_id: chatInfo.topicId,
    link_preview_options: {
      prefer_small_media: true,
      url: payload.issue.html_url,
    },
  });
});

function buildMessageFromPR({ pull_request: { title, user, html_url, number }, repository }: PullRequestEvent) {
  return `<a href="${repository.html_url}">${repository.name}</a>#${number} - <a href="${user.html_url}">@${
    user.login
  }</a>\n<a href="${html_url}">${scapeMessage(title)}</a>`;
}

githubWebhookEventHandler.on("pull_request.opened", async ({ payload }, { bot, chatInfo }) => {
  await bot.api.sendMessage(chatInfo.chatId, buildMessageFromPR(payload), {
    parse_mode: "HTML",
    message_thread_id: chatInfo.topicId,
    link_preview_options: {
      prefer_small_media: true,
      url: payload.pull_request.html_url,
    },
  });
});
