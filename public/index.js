const PI2 = 2 * Math.PI

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
	}


	static get font() {
		return 'Arial'
	}


	static get maxFontSize() {
		return 150
	}


	static get color() {
		return '#000000'
	}


	static get colorInv() {
		return '#FFFFFF'
	}


	static get occupyWidth() {
		return 0.5
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


	render(context, time, canvasWidth, canvasHeight) {
		const text = this.value
		context.textAlign = 'center'
		context.textBaseline = 'middle'
		context.fillStyle = this.isInverted ? Score.colorInv : Score.color

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



class Network {

	constructor(url, score, isBestCallback) {
		this.url = url
		this.score = score
		this.isBestCallback = isBestCallback
		this.socket = null
		this.connected = false

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


	onScoreUpdate(score) {
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
		if (this.connected) {
			this.socket.send(JSON.stringify(data))
		}
	}


	open(event) {
		this.connected = true
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
					if (this.isBestCallback) {
						this.isBestCallback(data)
					}
					break
				default:
					console.warn(`Unknown action: ${action}`)
			}
		})
	}


	close(event) {
		this.socket = null
		this.connected = false
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

		this.onTap = this.onTap.bind(this)
		this.onResize = this.onResize.bind(this)
		this.loop = this.loop.bind(this)
		this.setInverted = this.setInverted.bind(this)

		this.ripples = []
		this.score = new Score()
		this.network = new Network(networkUrl, this.score, this.setInverted)

		this.addListeners()
		this.sizeCanvas()
		this.loop()
	}


	static get backroundColor() {
		return '#FFFFFF'
	}


	static get backroundColorInv() {
		return '#000000'
	}


	addListeners() {
		this.canvasElement.addEventListener('click', this.onTap)
		window.addEventListener('resize', this.onResize)
	}


	setInverted(isInverted) {
		this.isInverted = isInverted
		this.score.setInverted(isInverted)
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
		const width = this.canvasElement.width
		const height = this.canvasElement.height

		context.rect(0, 0, width, height)
		context.fillStyle = this.isInverted ? App.backroundColorInv :App.backroundColor
		context.fill()

		this.ripples = this.ripples.filter((ripple) => {
			ripple.render(context, currentTime)
			return !ripple.isFinished(currentTime)
		})

		this.score.render(context, currentTime, width, height)
	}


	loop() {
		this.render()

		requestAnimationFrame(this.loop)
	}

}


const app = new App('wss://ofecka.herokuapp.com/')
