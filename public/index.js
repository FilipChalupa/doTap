const PI2 = 2 * Math.PI


function transColor(fromRGB, toRGB, deltaTime) {
	const step = Math.max(1, deltaTime)
	const result = fromRGB
	for (let i = 0; i < 3; i++) {
		if (result[i] < toRGB[i]) {
			result[i] = Math.round(Math.min(result[i] + step, toRGB[i]))
		} else {
			result[i] = Math.round(Math.max(result[i] - step, toRGB[i]))
		}
	}
	return result
}


class Ripple {

	constructor(x, y) {
		this.x = x
		this.y = y
		this.birthTime = Date.now()
	}


	static get color() {
		return [127, 127, 127, 0.3] // rgba
	}


	static get radius() {
		return 100
	}


	static get timeToLive() {
		return 500
	}


	isFinished(time) {
		return time - this.birthTime > Ripple.timeToLive
	}


	render(context, time) {
		const progress = (time - this.birthTime) / Ripple.timeToLive
		const radius = Ripple.radius * progress
		const c = Ripple.color
		const color = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] * (1-progress)})`
		context.beginPath()
		context.arc(this.x, this.y, radius, 0, PI2)
		context.closePath()
		context.fillStyle = color
		context.fill()
	}

}


class Score {

	constructor() {
		this.value = this.getStoredScore()
		this.currentFontSize = 0
		this.targetFontSize = 0
		this.updateCallback = null
		this.claimCallback = null
		this.isInverted = false
		this.currentColor = Score.color
	}


	static get font() {
		return 'Arial'
	}


	static get maxFontSize() {
		return 150
	}


	static get color() {
		return [0, 0, 0]
	}


	static get colorInv() {
		return [255, 255, 255]
	}


	static get occupyWidth() {
		return 0.5
	}


	getValue() {
		return this.value
	}


	setInverted(isInverted) {
		this.isInverted = isInverted
	}


	getStoredScore() {
		return Number(localStorage.getItem('score')) || 0
	}


	storeScore() {
		localStorage.setItem('score', this.value)
	}


	updateValue(value) {
		this.value = value
		this.storeScore()
		this.sendScore()
	}


	onTap() {
		this.updateValue(this.value + 1)
		this.sendClaim()
	}


	add(value) {
		this.updateValue(this.value + value)
	}


	removeRelativeTo(otherScore) {
		const valueToRemove = 1
		let newValue = this.value - valueToRemove
		if (newValue < 0) {
			this.updateValue(0)
			return this.value
		}

		this.updateValue(newValue)
		return valueToRemove
	}


	sendScore() {
		if (this.updateCallback) {
			this.updateCallback(this.value)
		}
	}


	sendClaim() {
		if (this.claimCallback) {
			this.claimCallback()
		}
	}


	onUpdate(updateCallback) {
		this.updateCallback = updateCallback
	}


	onClaim(claimCallback) {
		this.claimCallback = claimCallback
	}


	render(context, canvasWidth, canvasHeight, deltaTime) {
		const text = this.value
		context.textAlign = 'center'
		context.textBaseline = 'middle'
		const targetColor = this.isInverted ? Score.colorInv : Score.color
		this.currentColor = transColor(this.currentColor, targetColor, deltaTime)
		context.fillStyle = `rgb(${this.currentColor[0]}, ${this.currentColor[1]}, ${this.currentColor[2]})`

		this.targetFontSize = Score.maxFontSize
		while (true) {
			context.font = `${this.targetFontSize}px ${Score.font}`
			if (context.measureText(text).width < canvasWidth * Score.occupyWidth) {
				break
			}
			this.targetFontSize--
		}
		this.currentFontSize = Math.round(this.currentFontSize + (this.targetFontSize - this.currentFontSize) / 5)
		context.font = `${this.currentFontSize}px ${Score.font}`
		context.fillText(text, Math.floor(canvasWidth / 2), Math.floor(canvasHeight / 2))
	}

}



class Offline {

	constructor() {
		this.isOffline = true
		this.opacity = 0
		this.targetOpacity = 0
		this.delayNextChange = true
	}


	static get color() {
		return [127, 127, 127]
	}


	static get font() {
		return 'Arial'
	}


	static get fontSize() {
		return 14
	}


	static get text() {
		return 'Offline'
	}


	static get nextChangeDelay() {
		return 3000
	}


	setOffline(isOffline) {
		this.isOffline = isOffline

		if (this.delayNextChange) {
			this.delayNextChange = false
			setTimeout(() => {
				this.updateTargetOpacity()
			}, Offline.nextChangeDelay)
		} else {
			this.updateTargetOpacity()
		}
	}


	updateTargetOpacity() {
		this.targetOpacity = this.isOffline ? 1 : 0
	}


	render(context, canvasWidth, canvasHeight) {
		if (this.targetOpacity !== this.opacity) {
			this.opacity = Math.min(1, Math.max(this.opacity + (this.targetOpacity - this.opacity) / 10))
		}
		context.textAlign = 'right'
		context.textBaseline = 'hanging'
		context.font = `${Offline.fontSize}px ${Offline.font}`
		context.fillStyle = `rgba(${Offline.color[0]},${Offline.color[1]},${Offline.color[2]},${this.opacity})`
		context.fillText(Offline.text, canvasWidth - Offline.fontSize, Offline.fontSize)
	}

}



class Network {

	constructor(url, score, bestCallback, isConnectedCallback) {
		this.url = url
		this.score = score
		this.bestCallback = bestCallback
		this.socket = null
		this.isConnected = false
		this.isConnectedCallback = isConnectedCallback

		this.open = this.open.bind(this)
		this.message = this.message.bind(this)
		this.close = this.close.bind(this)
		this.onScoreUpdate = this.onScoreUpdate.bind(this)
		this.onScoreClaim = this.onScoreClaim.bind(this)

		this.connect()
		this.addListeners()
	}


	static get reconnectTimeout() {
		return 3000
	}


	addListeners() {
		this.score.onUpdate(this.onScoreUpdate)
		this.score.onClaim(this.onScoreClaim)
	}


	setConnected(isConnected) {
		this.isConnected = isConnected
		if (this.isConnectedCallback) {
			this.isConnectedCallback(isConnected)
		}
	}


	onScoreUpdate(score) {
		this.sendScore(score)
	}


	sendScore(score) {
		this.send({
			score,
		})
	}


	onScoreClaim() {
		this.send({
			claimPoints: true,
		})
	}


	connect() {
		this.socket = new WebSocket(this.url)
		this.socket.addEventListener('open', this.open)
		this.socket.addEventListener('message', this.message)
		this.socket.addEventListener('close', this.close)
	}


	send(data) {
		if (this.isConnected) {
			this.socket.send(JSON.stringify(data))
		}
	}


	open(event) {
		this.setConnected(true)
		this.sendScore(this.score.getValue())
	}


	message(event) {
		const actions = JSON.parse(event.data)
		Object.keys(actions).forEach((action) => {
			const data = actions[action]
			switch(action) {
				case 'claim':
					this.send({
						give: {
							to: data.by,
							amount: this.score.removeRelativeTo(data.score),
						},
					})
					break
				case 'add':
					this.score.add(data)
					break
				case 'best':
					if (this.bestCallback) {
						this.bestCallback(data)
					}
					break
				default:
					console.warn(`Unknown action: ${action}`)
			}
		})
	}


	close(event) {
		this.socket = null
		this.setConnected(false)
		setTimeout(() => {
			this.connect()
		}, Network.reconnectTimeout)
	}

}



class App {

	constructor(networkUrl) {
		this.canvasElement = document.getElementById('canvas')
		this.context = this.canvasElement.getContext('2d')
		this.isInverted = false
		this.currentColor = App.backroundColor
		this.startTime = Date.now()
		this.lastTime = this.startTime

		this.onTap = this.onTap.bind(this)
		this.onResize = this.onResize.bind(this)
		this.loop = this.loop.bind(this)
		this.setInverted = this.setInverted.bind(this)
		this.bestCallback = this.bestCallback.bind(this)
		this.isConnectedCallback = this.isConnectedCallback.bind(this)

		this.ripples = []
		this.score = new Score()
		this.network = new Network(networkUrl, this.score, this.bestCallback, this.isConnectedCallback)
		this.offline = new Offline()

		this.addListeners()
		this.sizeCanvas()
		this.loop()
	}


	static get backroundColor() {
		return [255, 255, 255]
	}


	static get backroundColorInv() {
		return [0, 0, 0]
	}


	addListeners() {
		this.canvasElement.addEventListener('click', this.onTap)
		window.addEventListener('resize', this.onResize)
	}


	isConnectedCallback(isConnected) {
		this.offline.setOffline(!isConnected)

		if (!isConnected && this.isInverted) {
			this.setInverted(false)
		}
	}


	setInverted(isInverted) {
		this.isInverted = isInverted
		this.score.setInverted(isInverted)
	}


	bestCallback(isBest) {
		if (isBest !== this.isInverted) {
			this.setInverted(isBest)
		}
	}


	addRipple(x, y) {
		this.ripples.push(new Ripple(x, y))
	}


	onTap(e) {
		const x = e.clientX
		const y = e.clientY
		this.addRipple(x, y)
		this.score.onTap()
	}


	onResize(e) {
		this.sizeCanvas()
	}


	sizeCanvas() {
		this.canvasElement.width = window.innerWidth
		this.canvasElement.height = window.innerHeight
	}


	render() {
		const context = this.context
		const currentTime = Date.now()
		const deltaTime = currentTime - this.lastTime
		this.lastTime = currentTime
		const width = this.canvasElement.width
		const height = this.canvasElement.height

		const targetColor = this.isInverted ? App.backroundColorInv : App.backroundColor
		this.currentColor = transColor(this.currentColor, targetColor, deltaTime)
		context.fillStyle = `rgb(${this.currentColor[0]}, ${this.currentColor[1]}, ${this.currentColor[2]})`
		context.rect(0, 0, width, height)
		context.fill()

		this.ripples = this.ripples.filter((ripple) => {
			ripple.render(context, currentTime)
			return !ripple.isFinished(currentTime)
		})

		this.score.render(context, width, height, deltaTime)
		this.offline.render(context, width, height)
	}


	loop() {
		this.render()

		requestAnimationFrame(this.loop)
	}

}


const wsUrl = window.location.hostname === 'localhost' ? 'ws://localhost:8080' : 'wss://ofecka.herokuapp.com/'
const app = new App(wsUrl)


if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('sw.js')
	})
}
