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



class App {

	constructor() {
		this.canvasElement = document.getElementById('canvas')
		this.context = this.canvasElement.getContext('2d')

		this.ripples = []

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
	}


	onResize(e) {
		this.sizeCanvas()
	}


	sizeCanvas() {
		this.canvasElement.width = window.innerWidth
		this.canvasElement.height = window.innerHeight
	}


	render() {
		const c = this.context
		const currentTime = Date.now()

		c.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)

		this.ripples = this.ripples.filter((ripple) => {
			ripple.render(c, currentTime)
			return !ripple.isFinished(currentTime)
		})
	}


	loop() {
		this.render()

		requestAnimationFrame(this.loop)
	}

}


const app = new App()
