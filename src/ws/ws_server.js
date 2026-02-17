import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set())
    }

    matchSubscribers.get(matchId).add(socket)

}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId)

    if (!subscribers) return

    subscribers.delete(socket)

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId)
    }
}

function cleanupSubscriptions(socket) {
    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket)
    }

}

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId)

    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload)

    for (const client of subscribers) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message)
        }
    }
}

function handleMessage(socket, data) {
    let message

    try {
        message = JSON.parse(data.toString())
    } catch (e) {
        sendJson(socket, { type: 'error', message: 'Invalid JSON' })
        return
    }

    if (message.type === 'subscribe' && Number.isInteger(message.matchId)) {
        const { matchId } = message
        subscribe(matchId, socket)
        sendJson(socket, { type: 'subscribed', matchId: matchId })
    }

    if (message.type === 'unsubscribe' && Number.isInteger(message.matchId)) {
        const { matchId } = message
        unsubscribe(matchId, socket)
        sendJson(socket, { type: 'unsubscribed', matchId: matchId })
    }
}

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

        socket.subscriptions = new Set()
        sendJson(socket, { type: 'welcome' });

        socket.on('message', (data) => {
            handleMessage(socket, data)
        })
        socket.on('error', () => {
            socket.terminate();
        });

        socket.on('close', () => {
            cleanupSubscriptions(socket);
        })

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
        broadcastToAll(wss, { type: 'match_created', data: match });
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, { type: 'commentary', data: comment });
    }

    return { broadcastMatchCreated, broadcastCommentary }
}

// 👉 isAlive = false does NOT mean the client is dead
// 👉 It means “you haven’t proven you’re alive yet in this round”

// ws cat
// wscat -c ws://localhost:8000/ws

// -------- FRONTEND ---------------

// const fanB = new WebSocket("ws://localhost:8000/ws")

// fanB.onmessage = (e)=>{
//     const msg = JSON.parse(e.data)
//     console.log("%c[Fan B - Match 2 only]","color: #00ff00; font-weight:bold", msg)
// }

// fanB.onopen = () => {
//     fanB.send(JSON.stringify({ type:"subscribe", matchId: 2 }))
//     console.log("Fan B subscribed to Match 2")
// }
