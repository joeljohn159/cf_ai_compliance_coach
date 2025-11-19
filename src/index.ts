import { DurableChat, Message } from './DurableChat';
import htmlContent from '../frontend/index.html';

export { DurableChat };

export interface Env {
    DURABLE_CHAT: DurableObjectNamespace;
    AI: any;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Serve the HTML file
        if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/frontend/index.html') {
            return new Response(htmlContent, {
                headers: {
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Forward all other requests to Durable Object
        const objectId = env.DURABLE_CHAT.idFromName('compliance_session_1');
        const stub = env.DURABLE_CHAT.get(objectId);
        return stub.fetch(request);
    },
} satisfies ExportedHandler<Env>;