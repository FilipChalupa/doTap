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
		return 1000
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
		this.value = 0
	}


	static get font() {
		return '30px Arial'
	}


	static get color() {
		return '#000000'
	}


	onTap() {
		this.value += 1
	}


	render(context, time, canvasWidth, canvasHeight) {
		context.font = Score.font
		context.textAlign = 'center'
		context.fillStyle = Score.color
		context.fillText(this.value, Math.floor(canvasWidth / 2), Math.floor(canvasHeight / 2))
	}

}



class App {

	constructor() {
		this.canvasElement = document.getElementById('canvas')
		this.context = this.canvasElement.getContext('2d')

		this.ripples = []
		this.score = new Score()

		this.onTap = this.onTap.bind(this)
		this.onResize = this.onResize.bind(this)
		this.loop = this.loop.bind(this)

		this.addListeners()
		this.sizeCanvas()
		this.loop()
	}


	addListeners() {
		this.canvasElement.addEventListener('click', this.onTap)
		window.addEventListener('resize', this.onResize)
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

		context.clearRect(0, 0, width, height)

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


const app = new App()
