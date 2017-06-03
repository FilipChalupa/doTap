const CACHE_NAME = 'v1.1'

const urlsToCache = [
	'',
	'index.js',
]

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => {
				return cache.addAll(urlsToCache)
			})
	)
})

self.addEventListener('fetch', (event) => {
	console.log('fetch')
	event.respondWith(
		caches.match(event.request)
			.then((response) => {
				if (response) {
					return response
				}
				return fetch(event.request)
			})
	)
})

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						return caches.delete(cacheName)
					}
				})
			)
		})
	)
})
