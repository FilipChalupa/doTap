const WebSocket = require('ws')

const port = process.env.PORT || 8080
const wss = new WebSocket.Server({ port })

let lastClientId = 0
const players = {}

console.log(`Server started at port ${port}`)

function clientLog(clientId, message) {
	console.log(`[${clientId}] ${message}`)
}

function broadcastToOtherPlayers(fromClientId, data) {
	Object.keys(players).forEach((clientId) => {
		clientId = clientId
		const player = players[clientId]
		if (clientId !== fromClientId) {
			sendToClient(player.socket, data)
		}
	})
}

function sendToClient(clientSocket, data) {
	if (clientSocket.readyState === WebSocket.OPEN) {
		clientSocket.send(JSON.stringify(data))
	}
}

function sendToPlayer(playerId, data) {
	if (players[playerId]) {
		sendToClient(players[playerId].socket, data)
	}
}

wss.on('connection', (ws) => {
	const clientId = `p${String(lastClientId++)}`
	clientLog(clientId, 'New connection')
	players[clientId] = {
		socket: ws,
		score: 0,
		lastInputTime: Date.now(),
	}

	ws.on('message', (message) => {
		clientLog(clientId, `New message: ${message}`)
		players[clientId].lastInputTime = Date.now()
		const actions = JSON.parse(message)
		Object.keys(actions).forEach((action) => {
			const data = actions[action]
			switch (action) {
				case 'score':
					players[clientId].score = Number(data)
					break
				case 'claimPoints':
					broadcastToOtherPlayers(clientId, {
						claim: {
							by: clientId,
							score: players[clientId].score,
						},
					})
					break
				case 'give':
					sendToPlayer(data.to, {
						add: data.amount,
					})
					break
				default:
					clientLog(clientId, `Unknown action: ${action}`)
				}
		})
	})
})
