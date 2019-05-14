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


	// 1.0.4      获取所有 rules 的 selectorText
	function getSelectors(){
		function fn(){
			let s = new Set()
			let result = []
			Array.from(document.styleSheets).forEach(({rules})=>{
				result = result.concat(Array.from(new Set(Object.values(rules).map(e=>e.selectorText).reverse())).reverse())
			})
			return result
		}
		if(document.readyState === COMPLETE) {
			return fn()
		}else{
			return Main.promise.then(function(){
				return fn()
			})
		}
	}


	// 1.0.4      修正获取
	function getRuleObjects() {
		function fn(){
			getSelectors()
			return Array.from(document.styleSheets).reduce((r, e) => {
				for (let rule of e.rules) {
					let { selectorText } = rule
					r[selectorText] = Object.assign({}, r[selectorText], getObject(selectorText))
					log(selectorText)
				}
				return r
			}, {})
		}
		if (document.readyState === COMPLETE) {
			let s = getSelectors()
			let result = {}
			s.forEach(selectorText=>{
				result[selectorText] = get(selectorText)
			})
			return result
		} else {
			return Main.promise.then(function () {
				return getSelectors().then(function(s){
					let result = {}
					s.forEach(selectorText=>{
						result[selectorText] = get(selectorText)
					})
					return result
				})
			})
		}
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
		let isCssText = false
		if (isCssText = type === 'string') {
			kvs = css.split(';').map(_ => _.split(':'))
		} else if (css !== null && type === 'object') {
			kvs = Object.entries(css)
		}
		if (kvs) {
			let i = 0
			Array.from(rules).forEach(e => {
				if (e.selectorText === selector) {
					i++
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
			if (i === 0) {// 1.0.3 修正了rules中没有找到对应的selector时，无法赋值的错误。
				css = isCssText ? css : Object.entries(css).map(e => e.join(':')).join(';')
				sheet.addRule(selector, css, rules.length)
			}
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

	// 1.0.4      修正设置
	function set(selectorText, v) {
		Main.promise.then(function () {
			log(selectorText, v)

			setMap(selectorText, v)
		})
		return Main
	}

	// 1.0.4      修正读取
	function get(selectorText) {
		if (document.readyState === COMPLETE) {
			return getObject(selectorText)
		} else {
			return Main.promise.then(function (v) {
				return getObject(selectorText)
			})
		}
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

	let enumerable = true

	Object.defineProperties(Main, {
		selectors: { get: getSelectors, enumerable },// 1.0.4      获取所有 rules 的 selectorText
		all: { get: getRuleObjects, enumerable },
		set: { value: set },
		get: { value: get },
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
		merge: { value: merge },// 1.0.2      合并 dom 中的所有 css 标签
		promise: { value: createPromise() },
	});

	Object.defineProperty(g, 'cssd', { value: Main })
})(this)
