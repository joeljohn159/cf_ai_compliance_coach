export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface Env {
    AI: any;
}

export class DurableChat {
    private state: DurableObjectState;
    private env: Env;
    private chatHistory: Message[] = [];
    private maxHistoryLength = 10;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
        this.state.blockConcurrencyWhile(async () => {
            const storedHistory = await this.state.storage.get<Message[]>('chatHistory');
            if (storedHistory) {
                this.chatHistory = storedHistory;
            }
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Add CORS headers helper
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (url.pathname === '/websocket') {
            if (request.headers.get('upgrade') != 'websocket') {
                return new Response('Expected WebSocket upgrade', { status: 426 });
            }
            const { 0: client, 1: server } = new WebSocketPair();
            this.state.acceptWebSocket(server);
            return new Response(null, { status: 101, webSocket: client });
        }

        if (url.pathname === '/chat') {
            try {
                const body: { message: string; rulebook: string } = await request.json();

                const systemPrompt: Message = {
                    role: 'system',
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
4. Your response MUST be direct and not conversational.`,
                };

                const llmMessages: Message[] = [
                    systemPrompt,
                    { role: 'user', content: `Text to check: "${body.message}"` },
                ];

                console.log('Calling AI with messages:', JSON.stringify(llmMessages, null, 2));

                const aiResponse = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
                    messages: llmMessages,
                });

                console.log('Raw AI Response:', JSON.stringify(aiResponse, null, 2));

                // Fix: Handle different response structures
                let replyContent: string;

                if (typeof aiResponse === 'string') {
                    replyContent = aiResponse.trim();
                } else if (aiResponse.response) {
                    replyContent = aiResponse.response.trim();
                } else if (aiResponse.result && aiResponse.result.response) {
                    replyContent = aiResponse.result.response.trim();
                } else if (Array.isArray(aiResponse) && aiResponse.length > 0) {
                    replyContent = aiResponse[0].response || aiResponse[0].content || JSON.stringify(aiResponse[0]);
                } else {
                    console.error('Unexpected AI response structure:', aiResponse);
                    replyContent = 'Error: Unexpected AI response format';
                }

                this.chatHistory.push({ role: 'user', content: body.message });
                this.chatHistory.push({ role: 'assistant', content: replyContent });

                if (this.chatHistory.length > this.maxHistoryLength) {
                    this.chatHistory = this.chatHistory.slice(this.chatHistory.length - this.maxHistoryLength);
                }

                await this.state.storage.put('chatHistory', this.chatHistory);

                return new Response(JSON.stringify({ response: replyContent }), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    },
                });
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
                console.error('AI or chat error:', errorMsg, e);
                return new Response(JSON.stringify({ error: `LLM Error: ${errorMsg}` }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
        // Handle websocket messages if needed
    }

    webSocketClose(ws: WebSocket, code: number, reason: string): void {
        console.log(`WebSocket closed: ${code} - ${reason}`);
    }
}