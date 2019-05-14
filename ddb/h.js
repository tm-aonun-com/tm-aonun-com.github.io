{

	let H = Object.create(null)

	let map = new Map()

	let on = function on(type, defaultPrevented=false) {
		if (map.has(type)) return;
		getPool(type).defaultPrevented = defaultPrevented
		window.addEventListener(type, handle)
	}

	let off = function (type, remove = false) {
		window.removeEventListener(type, handle)
		if (remove) map.delete(type)
	}

	let handle = function (e) {
		let { type, target } = e
		let pool = getPool(type)
		if(pool.defaultPrevented) e.preventDefault()
		for (let o of pool) {
			if (!e.next) break
			let s = document.querySelectorAll(o.selector)
			let b = Array.from(s).some(e => e === target)
			if (b) {
				let fn = o.fn
				if (fn) {
					let type = typeof fn
					if (type === 'function') {
						let args = o.args ? ([e]).concat(o.args) : [e]
						Reflect.apply(fn, target, args)
					} else if (type === 'string') {
						let fn = handles.get(fn)
						if (typeof fn === 'function') {
							let args = o.args ? ([e]).concat(o.args) : [e]
							Reflect.apply(fn, target, args)
						}
					}
				}
			}
		}
	}

	let getPool = function (type) {
		let pool = map.get(type)
		if (!Array.isArray(pool)) {
			pool = []
			map.set(type, pool)
		}
		return pool
	}

	/* 【移除事件】
	 内核的实现上以 type 为索引，因此不效仿 jQuery 中 delegate() 参数的顺序。
	 例：$(window).delegate(selector, type, fn)
	 */
	let add = function (type, selector, fn, ...args) {
		getPool(type).push({ selector, fn, args })
		return H
	}

	let adds = function (types, selector, fn, ...args) {
		if (Array.isArray(types)) {
			types.forEach(type => add(type, selector, fn, ...args))
		}
		return H
	}

	let remove = function (type, selector, fn) {
		let s = []
		let pool = getPool(type)
		let i = pool.length - 1
		while (i > -1) {
			let o = pool[i]
			if (selector) {
				if (o.selector === selector) {
					if (typeof fn === 'function') {
						if (o.fn === fn) {
							pool.splice(i, 1)
						}
					} else {
						pool.splice(i, 1)
					}
				}
			} else {
				pool.splice(i, 1)
			}
			i--;
		}
	}


	// exprots
	Object.defineProperty(this, 'H', { value: H, enumerable: true })
	Object.defineProperties(H, {
		map: { value: map, enumerable: false },
		handle: { value: handle, enumerable: false },
		on: { value: on, enumerable: true },
		off: { value: off, enumerable: true },
		add: { value: add, enumerable: true },
		adds: { value: add, enumerable: true },
		remove: { value: remove, enumerable: true },
	})
}