var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/DurableChat.ts
var DurableChat = class {
  constructor(state, env) {
    this.chatHistory = [];
    this.maxHistoryLength = 10;
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      const storedHistory = await this.state.storage.get("chatHistory");
      if (storedHistory) {
        this.chatHistory = storedHistory;
      }
    });
  }
  static {
    __name(this, "DurableChat");
  }
  async fetch(request) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/websocket") {
      if (request.headers.get("upgrade") != "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }
      const { 0: client, 1: server } = new WebSocketPair();
      this.state.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === "/chat") {
      try {
        const body = await request.json();
        const systemPrompt = {
          role: "system",
          content: `You are the CF_AI_Compliance_Auditor, a strict and highly accurate language model. Your sole task is to assess the user-provided text against the following compliance rules.
                    
--- START OF RULEBOOK: ${body.rulebook} ---
1. Do not mention any personally identifiable information (PII) such as full names, home addresses, or phone numbers.
2. Do not use inflammatory, offensive, or derogatory language.
3. All content must be written in a professional, formal tone.
4. Do not include URLs or external links without prior approval.
--- END OF RULEBOOK ---

ASSESSMENT INSTRUCTIONS:
1. Analyze the provided text ONLY against the RULES.
2. If violations are found, provide a concise, numbered list of the specific rules violated, and explain how the text breaks them.
3. If NO violations are found, return a single phrase: "Compliance Check: PASS. The text adheres to all rules."
4. Your response MUST be direct and not conversational.`
        };
        const llmMessages = [
          systemPrompt,
          { role: "user", content: `Text to check: "${body.message}"` }
        ];
        console.log("Calling AI with messages:", JSON.stringify(llmMessages, null, 2));
        const aiResponse = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: llmMessages
        });
        console.log("Raw AI Response:", JSON.stringify(aiResponse, null, 2));
        let replyContent;
        if (typeof aiResponse === "string") {
          replyContent = aiResponse.trim();
        } else if (aiResponse.response) {
          replyContent = aiResponse.response.trim();
        } else if (aiResponse.result && aiResponse.result.response) {
          replyContent = aiResponse.result.response.trim();
        } else if (Array.isArray(aiResponse) && aiResponse.length > 0) {
          replyContent = aiResponse[0].response || aiResponse[0].content || JSON.stringify(aiResponse[0]);
        } else {
          console.error("Unexpected AI response structure:", aiResponse);
          replyContent = "Error: Unexpected AI response format";
        }
        this.chatHistory.push({ role: "user", content: body.message });
        this.chatHistory.push({ role: "assistant", content: replyContent });
        if (this.chatHistory.length > this.maxHistoryLength) {
          this.chatHistory = this.chatHistory.slice(this.chatHistory.length - this.maxHistoryLength);
        }
        await this.state.storage.put("chatHistory", this.chatHistory);
        return new Response(JSON.stringify({ response: replyContent }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error("AI or chat error:", errorMsg, e);
        return new Response(JSON.stringify({ error: `LLM Error: ${errorMsg}` }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
  webSocketMessage(ws, message) {
  }
  webSocketClose(ws, code, reason) {
    console.log(`WebSocket closed: ${code} - ${reason}`);
  }
};

// src/index.ts
import htmlContent from "./094d95abeca86979554c041d5365797194b218c0-index.html";
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/frontend/index.html") {
      return new Response(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const objectId = env.DURABLE_CHAT.idFromName("compliance_session_1");
    const stub = env.DURABLE_CHAT.get(objectId);
    return stub.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-xRucv7/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-xRucv7/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  DurableChat,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
