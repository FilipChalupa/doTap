const WebSocket = require('ws')

const PORT = process.env.PORT || 8080
const DEBUG = process.env.DEBUG || false
const wss = new WebSocket.Server({ port: PORT })

let lastClientId = 0
const players = {}

console.log(`Server started at port ${PORT}`)

function clientLog(clientId, message) {
	if (DEBUG) {
		console.log(`[${clientId}] ${message}`)
	}
}

function broadcastToOtherPlayers(blacklistIds, data) {
	Object.keys(players).forEach((clientId) => {
		clientId = clientId
		const player = players[clientId]
		if (!blacklistIds.includes(clientId)) {
			sendToClient(player.socket, data)
		}
	})
}

function sendToClient(clientSocket, data) {
	if (clientSocket.readyState === WebSocket.OPEN) {
		clientSocket.send(JSON.stringify(data))
	}
}

function sendToPlayers(playerIds, data) {
	playerIds.forEach((playerId) => {
		if (players[playerId]) {
			sendToClient(players[playerId].socket, data)
		}
	})
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
					broadcastToOtherPlayers([ clientId ], {
						claim: {
							by: clientId,
							score: players[clientId].score,
						},
					})
					break
				case 'give':
					sendToPlayers([ data.to ], {
						add: data.amount,
					})
					break
				default:
					clientLog(clientId, `Unknown action: ${action}`)
				}
		})
	})
})

const BEST_TIME_PERIOD = 5000
function broadcastBestPlayerLoop() {
	let bestScore = 0
	const now = Date.now()

	Object.keys(players).forEach((playerId) => {
		const player = players[playerId]
		if (player.lastInputTime > now - BEST_TIME_PERIOD) {
			if (player.score > bestScore) {
				bestScore = player.score
			}
		}
	})

	if (bestScore !== 0) {
		broadcastToOtherPlayers([], {
			best: bestScore,
		})
	}

	setTimeout(() => {
		broadcastBestPlayerLoop()
	}, 1000)
}

broadcastBestPlayerLoop()
