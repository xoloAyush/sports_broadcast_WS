import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from "../arcjet.js";

/**
 * Send a value over a WebSocket by serializing it to JSON when the socket is open.
 * @param {WebSocket} socket - The WebSocket to send the message on.
 * @param {*} payload - The value to serialize and send as JSON.
 */
function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

/**
 * Broadcasts a JSON-serializable payload to every connected client currently in the OPEN state.
 * @param {import('ws').WebSocketServer} wss - The WebSocketServer whose clients will receive the payload.
 * @param {*} payload - The value to send; it will be JSON-stringified before transmission.
 */
function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

/**
 * Attaches a WebSocket server at the "/ws" upgrade path to an existing HTTP server and exposes a helper to notify clients of newly created matches.
 * @param {import('http').Server} server - The existing HTTP server to handle WebSocket upgrades on.
 * @returns {{ broadcastMatchCreated: (match: any) => void }} An object with `broadcastMatchCreated(match)` which broadcasts a `{ type: 'match_created', data: match }` message to all connected WebSocket clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ noServer: true, path: '/ws', maxPayload: 1024 * 1024 });

    server.on('upgrade', async (req, socket, head) => {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);

        if (pathname !== '/ws') {
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    if (decision.reason.isRateLimit()) {
                        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                    } else {
                        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    }
                    socket.destroy();
                    return;
                }
            } catch (e) {
                console.error('WS upgrade protection error', e);
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    wss.on('connection', async (socket, req) => {

        socket.isAlive = true;
        socket.on('pong', () => { socket.isAlive = true; });

        sendJson(socket, { type: 'welcome' });

        socket.on('error', console.error);
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping();
        })
    }, 30000);

    wss.on('close', () => clearInterval(interval));

    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreated }
}

// 👉 isAlive = false does NOT mean the client is dead
// 👉 It means “you haven’t proven you’re alive yet in this round”

// ws cat
// wscat -c ws://localhost:8000/ws