(function (g) {
	function Main() { }

	const COMPLETE = 'complete'
	// let { log, warn } = console


	// 获取所有的sheets
	function getSheets() {
		return Array.from(document.styleSheets)
	}


	// 创建随机的 title 名称
	function createTitle() {
		return Date.now().toString(36) + Math.random().toString(36).slice(2)
	}
	function getTitle() {
		if (!Main.title) Main.title = createTitle()
		return Main.title
	}



	function createElement() {
		let r = document.createElement('style')
		r.setAttribute('title', getTitle())
		return Main.element = r
	}
	function getElement() {
		let title = getTitle()
		let r = document.querySelector(`[title="${title}"]`)
		if (!r) r = document.body.appendChild(createElement())
		return Main.element = r
	}

	function getSheet() {
		let s, ss = Array.from(document.styleSheets), t = getTitle()
		for (s of ss) {
			if (s.title === t) {
				break
			}
		}
		Main.sheet = s
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

	function setText(selector, css) {
		let sheet = getSheet()
		let rules = sheet.rules
		let type = typeof css
		if (css !== null && type === 'object') {
			let s = css;
			css = ''
			for (let k in s) {
				let v = s[k], kv = `${k}: ${v}; `
				css += kv
			}
		}
		css = Array.from(sheet.rules).reduce((r, e) => {
			if (e.selectorText === selector) {
				for (let i = 0, s = e.style, l = s.length; i < l; i++) {
					let k = s[i], v = s[k], kv = `${k}: ${v}; `
					if (v !== 'initial') css = kv + css
				}
			}
			return css
		}, css)
		deleteRule(selector)
		sheet.addRule(selector, css, rules.length)
		return css
	}

	function getRuleObjects() {
		return Array.from(document.styleSheets).reduce((r, e) => {
			for (let rule of e.rules) {
				let { selectorText } = rule
				let o = {}
				for (let e of rule.styleMap) {
					let [k, v] = e
					o[k] = v.join(' ')
				}
				r[selectorText] = o
			}
			return r
		}, {})
	}

	function CssdObject() { }
	Object.defineProperty(CssdObject.prototype, 'toString', {
		value() {
			let r = []
			for (let k in this) {
				v = this[k]
				r.push(`${k}: ${v};`)
			}
			return r.join('\n')
		}
	})

	function getObject(selector) {
		let sheet = getSheet()
		let rules = Array.from(sheet.rules)
		let o = new CssdObject()
		rules.forEach((rule) => {
			if (rule.selectorText === selector) {
				let m = Array.from(rule.styleMap)
				Object.assign(o, parseCssText(rule.cssText))
			}
		})
		return o
	}

	function parseCssText(cssText) {
		let o = {}
		if (typeof cssText === 'string') {
			cssText.slice(cssText.indexOf('{') + 1, cssText.lastIndexOf('}')).split(';').forEach(e => {
				let [k, v] = e.split(':')
				if (typeof k === 'string' && (k = k.trim()) && typeof v === 'string' && (v = v.trim())) {
					o[k] = v
				}
			})
		}
		return o
	}



	function setMap(selector, css) {
		let sheet = getSheet()
		let rules = sheet.rules
		let type = typeof css
		let kvs
		if (type === 'string') {
			kvs = css.split(';').map(_ => _.split(':'))
		} else if (css !== null && type === 'object') {
			kvs = Object.entries(css)
		}
		if (kvs) {
			Array.from(rules).forEach(e => {
				if (e.selectorText === selector) {
					kvs.forEach(([k, v]) => {
						if (typeof k === 'string' && (k = k.trim()) && typeof v === 'string' && (v = v.trim())) {
							try {
								e.styleMap.set(k, v)
							} catch (err) {
								console.trace(`${k} => ${v}\n\t` + err.message)
							}
						}
					})
				}
			})
		}
		return kvs
	}


	function deleteRule(selector) {
		let s = getSheet()
		let i
		while ((i = Array.from(s.rules).findIndex((e) => e.selectorText === selector)) > -1) {
			s.deleteRule(i)
		}
	}

	function set(selectorText, cssText = '') {
		let sheet = getSheet()
		let a = Array.from(sheet.rules).filter(e => e.selectorText === selectorText)
		let t = typeof cssText
		if (t === 'string') {
			let start = cssText.indexOf('{') + 1
			let end = cssText.lastIndexOf('}')
			let v
			if (start > -1 && end > -1 && end > start) {
				v = a.reduce((r, e) => r + e.cssText.slice(start, end), '')
				if (v) v += '; ' + cssText
			} else {
				v = cssText
			}
			log(selectorText, v)
			a.forEach(e => {
				let i = Array.from(sheet.rules).indexOf(e)
				if (i > -1) sheet.removeRule(i)
			})
			sheet.addRule(selectorText, v, sheet.length)
		} else if (cssText !== null && t === 'object') {
			for (let k in cssText) {
				let v = cssText[k]
				set(selectorText, k + ':' + v)
			}
		}
	}

	function get(selectorText) {
		let sheet = getSheet()
		let a = Array.from(sheet.rules).filter(e => e.selectorText === selectorText)
		let cssObject = a.reduce((r, e) => {
			// r + e.cssText.slice(e.cssText.indexOf('{') + 1, e.cssText.lastIndexOf('}'))
			let m = Array.from(e.style)
			e.cssText.slice(e.cssText.indexOf('{') + 1, e.cssText.lastIndexOf('}')).split(';').forEach(e => {
				let [k, v] = e.split(':', 2)
				if (k && v) r[k.trim()] = v.trim()
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
			if (document.readyState === COMPLETE) return resolve(Main)
			let type = 'readystatechange'
			function fn(e) {
				if (document.readyState === 'complete') {
					merge()
					document.removeEventListener(type, fn)
					return resolve(Main)
				}
			}
			document.addEventListener(type, fn)
		})
	}


	Object.defineProperties(Main, {
		all: { get: getRuleObjects },
		set: {
			value(selectorText, v) {
				Main.promise.then(function () {
					setMap(selectorText, v)
				})
				return Main
			}, enumerable: true
		},
		get: {
			value(selectorText) {
				if (document.readyState === COMPLETE) {
					return getObject(selectorText)
				} else {
					return Main.promise.then(function (v) {
						return getObject(selectorText)
					})
				}
			}
		},
		delete: { value: deleteRule },
		clear: { value: removeStyleSheets },
		getSheet: { value: getSheet },
		createTitle: { value: createTitle },
		getTitle: { value: getTitle },
		createElement: { value: createElement },
		getElement: { value: getElement },
		getRules: { value: getRules },
		getObject: { value: getObject },
		parseCssText: { value: parseCssText },
		setMap: { value: setMap },
		merge: { value: merge },
		promise: { value: createPromise(), enumerable: true },
	});

	Object.defineProperty(g, 'cssd', { value: Main })
})(this)
