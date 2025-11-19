# PROMPTS.md: AI-Assisted Coding Prompts

This project was built with assistance from a powerful LLM (Gemini/ChatGPT) to structure the code and ensure adherence to Cloudflare's best practices for Workers AI and Durable Objects.

## Code Generation Prompts

1.  **Goal:** Workers AI Call Structure
    **Prompt:** "Write a TypeScript function for a Cloudflare Worker that uses the `@cf/meta/llama-3-8b-instruct` model to perform a text classification task. The function must accept a system prompt, a user message, and return the AI's response."

2.  **Goal:** Durable Object for Memory
    **Prompt:** "Create a Cloudflare Durable Object class in TypeScript that can store and retrieve a conversation history array of objects (role and content) using `this.state.storage`. It must also contain an example `fetch` handler to update the history."

3.  **Goal:** Worker Entrypoint
    **Prompt:** "Create the main `index.ts` Cloudflare Worker file that imports and binds a Durable Object named `DURABLE_CHAT` and forwards all incoming fetch requests to a fixed ID of that object."

## Core LLM Logic Prompt (System Prompt)

The system prompt below is sent to the Llama 3.3 model on Workers AI with every compliance check to enforce the "Auditor" persona and output format:

**System Prompt (found in `src/DurableChat.ts`):**
