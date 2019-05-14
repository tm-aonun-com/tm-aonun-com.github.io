(function (g) {

	function styleD() { }

	const COMPLETE = 'complete'
	let { log, warn } = console


	// 获取所有的sheets
	function getSheets() {
		return Array.from(document.styleSheets)
	}

	// 创建随机的 title 名称
	function createTitle() {
		return Date.now().toString(36) + Math.random().toString(36).slice(2)
	}
	function getTitle() {
		if(!styleD.title) styleD.title = createTitle()
		return styleD.title
	}

	function createElement() {
		let r = document.createElement('style')
		r.setAttribute('title', getTitle())
		return styleD.element = r
	}
	function getElement() {
		let title = getTitle()
		let r = document.querySelector(`[title="${title}"]`)
		if(!r) r = document.body.appendChild(createElement())
		return styleD.element = r
	}

	function getSheet(){
		let s, ss = Array.from(document.styleSheets), t = getTitle()
		for(s of ss) {
			if(s.title===t) {
				break
			}
		}
		styleD.sheet = s
		return s
	}

	function getRules() {
		return Array.from(document.styleSheets).reduce((r, e) => r.concat(Array.from(e.rules)), [])
	}
	
	function removeStyleSheets() {
		getSheets().forEach(e => {
			e.ownerNode.remove()
		})
	}

	function merge() {
		let rules = getRules()
		removeStyleSheets()
		getElement()
		let sheet = getSheet()
		rules.forEach(e => {
			let k = e.selectorText
			let v = e.cssText
			v = v.slice(v.indexOf('{') + 1, v.lastIndexOf('}'))
			sheet.addRule(k, v)
		})
	}

	function set(selectorText, cssText = '') {
		let sheet = getSheet()
		let a = Array.from(sheet.rules).filter(e => e.selectorText === selectorText)
		cssText = a.reduce((r, e) => r + e.cssText.slice(e.cssText.indexOf('{') + 1, e.cssText.lastIndexOf('}')), '') + ';' + cssText
		a.forEach(e => {
			let i = Array.from(sheet.rules).indexOf(e)
			if (i > -1) sheet.removeRule(i)
		})
		
		sheet.addRule(selectorText, cssText, sheet.length)
	}
	function get(selectorText) {
		let sheet = getSheet()
		let a = Array.from(sheet.rules).filter(e => e.selectorText === selectorText)
		let cssObject = a.reduce((r, e) => {
			// r + e.cssText.slice(e.cssText.indexOf('{') + 1, e.cssText.lastIndexOf('}'))
			let m = Array.from(e.style)
			e.cssText.slice(e.cssText.indexOf('{') + 1, e.cssText.lastIndexOf('}')).split(';').forEach(e=>{
				let [k,v] = e.split(':',2)
				if(k && v) r[k.trim()] = v.trim()
			})
			return r
		}, {})
		return cssObject
	}
	function getText(selectorText) {
		let sheet = getSheet()
		let a = Array.from(sheet.rules).filter(e => e.selectorText === selectorText)
		let cssText = ''
		cssText = a.reduce((r, e) => r + e.cssText.slice(e.cssText.indexOf('{') + 1, e.cssText.lastIndexOf('}')), '')
		return cssText
	}

	function createPromise() {
		return new Promise(function (resolve, reject) {
			if (document.readyState === COMPLETE) return resolve(styleD)
			let type = 'readystatechange'
			function fn(e) {
				if (document.readyState === 'complete') {
					merge()
					document.removeEventListener(type, fn)
					return resolve(styleD)
				}
			}
			document.addEventListener(type, fn)
		})
	}


	g.styleD = styleD
	Object.defineProperty(styleD, 'promise', { value: createPromise(), enumerable: true })
	Object.defineProperty(styleD, 'set', {
		value(selectorText, v) {
			styleD.promise.then(function () {
				let type = typeof v
				if (type === 'string') {
					set(selectorText, v)
				} else if (v !== null && type === 'object') {
					for (let selectorText in v) {
						set(selectorText, v)
					}
					Object.entries(v)
				}
			})
			return styleD
		}, enumerable: true
	})
	Object.defineProperty(styleD, 'get', {
		value(selectorText) {
			if (document.readyState === COMPLETE) {
				return get(selectorText)
			} else {
				return styleD.promise.then(function (v) {
					return get(selectorText)
				})
			}
		}
	})
	Object.defineProperty(styleD, 'getText', {
		value(selectorText) {
			if (document.readyState === COMPLETE) {
				return getText(selectorText)
			} else {
				return styleD.promise.then(function (v) {
					return getText(selectorText)
				})
			}
		}
	})
})(this)
