// The @octokit/webhooks event handler is just a router,
// but it does not includes a way to include more information about the request,
// witch is absurd. This is a simpler implementation with context.

import { emitterEventNames, EmitterWebhookEvent } from "@octokit/webhooks";

type WebhookEventName = (typeof emitterEventNames)[number];

class EventHandler<Env = {}> {
  eventHandlers: Map<string, Function | Map<string, Function>>;

  constructor() {
    this.eventHandlers = new Map();
  }

  on<E extends WebhookEventName>(event: E, callback: (event: EmitterWebhookEvent<E>, env: Env) => Promise<void>) {
    const [eventName, actionName] = event.split(".");

    // Save event handlers
    if (!actionName) {
      this.eventHandlers.set(eventName, callback);
      return;
    }

    // Save event.action handlers
    let actionHandlers = this.eventHandlers.get(eventName);
    if (!actionHandlers || typeof actionHandlers === "function") {
      actionHandlers = new Map();
      this.eventHandlers.set(eventName, actionHandlers);
    }
    actionHandlers.set(actionName, callback);
  }

  async receive(event: EmitterWebhookEvent, env: Env) {
    // Get an event handler
    const eventHandler = this.eventHandlers.get(event.name);
    if (!eventHandler) return;
    if (typeof eventHandler === "function") return await eventHandler(event, env);

    // Get an event.action handler
    if (!("action" in event.payload)) return;
    const actionHandler = eventHandler.get(event.payload.action);
    if (!actionHandler) return;
    return await actionHandler(event, env);
  }
}

export function createEventHandler<Env = {}>() {
  /* Just like createEventHandler from @octokit/webhooks, but with context */
  return new EventHandler<Env>();
}
