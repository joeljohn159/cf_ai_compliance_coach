# AI Compliance Coach

A compliance checking tool built with Cloudflare Workers AI and Durable Objects. Uses Llama 3 to analyze text against predefined rulebooks.

## What it does

- Checks text for compliance violations
- Uses AI to evaluate against security and brand guidelines
- Stores conversation history using Durable Objects
- Tracks statistics (checks performed, violations found, passes)

## Prerequisites

- Node.js and npm
- Cloudflare account with Workers AI enabled
- Wrangler CLI

## Setup

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Update `wrangler.toml` with your Cloudflare account ID

3. Login to Cloudflare:
```bash
npx wrangler login
```

## Running Locally

```bash
npm run dev
```

This runs the Worker in remote mode (needed for AI binding to work).

Open http://localhost:8787 in your browser.

## Project Structure

```
cf-ai-compliance-coach/
├── src/
│   ├── index.ts           # Main Worker entry point
│   ├── DurableChat.ts     # Durable Object for chat history
│   └── types.d.ts         # TypeScript declarations
├── frontend/
│   └── index.html         # UI
├── wrangler.toml          # Cloudflare config
└── package.json
```

## How it works

1. User submits text and selects a rulebook
2. Worker forwards request to Durable Object
3. Durable Object calls Workers AI (Llama 3)
4. AI evaluates text against compliance rules
5. Response is returned and stored in chat history

## Deployment

```bash
npm run deploy
```

Your app will be available at `https://cf-ai-compliance-coach.<your-subdomain>.workers.dev`