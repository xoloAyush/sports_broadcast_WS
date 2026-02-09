import { WebSocketServer, WebSocket } from "ws"

function sendJson(socket, payload) {

    if (socket.readyState !== WebSocket.OPEN) return

    socket.send(JSON.stringify(payload))
}

function broadcast(wss, payload) {

    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue

        client.send(JSON.stringify(payload))
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024
    })

    wss.on('connection', (socket) => {
        socket.isAlive = true
        socket.on('pong', () => {
            socket.isAlive = true
        })

        sendJson(socket, { type: 'welcome', payload: { message: 'Welcome to the sports broadcast server' } })

        socket.on('error', (err) => {
            console.log(err)
        })
    })

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate()

            ws.isAlive = false
            ws.ping()
        })
    }, 30000)

    wss.on('close', () => {
        clearInterval(interval)
    })

    function broadcastMatchCreated(match) {
        broadcast(wss, {
            type: 'match_created',
            payload: match
        })
    }

    return { broadcastMatchCreated }
}

// 👉 isAlive = false does NOT mean the client is dead
// 👉 It means “you haven’t proven you’re alive yet in this round”

// ws cat
// wscat -c ws://localhost:8000/ws