log = console.log
const DDB_CSS_PROMISE = new Promise(function (resolve) {
	let id = Date.now().toString(36) + Math.random().toString(36).slice(2);
	let element = (function () {
		let r = document.getElementById(id)
		if (r === null) r = document.createElement('style')
		r.setAttribute('id', id)
		r.setAttribute('title', id)
		return r
	})();
	let type = 'load'
	let fn = function fn(e) {
		if (document.readyState === 'complete') {
			document.body.appendChild(element)
			let sheet = document.styleSheets.item(document.styleSheets.length - 1)
			resolve({ sheet, element, id })
			css.sheet = sheet
			css.id = id
			css.element = element
			document.removeEventListener(type, fn)
		}
	}
	document.addEventListener(type, fn)
});
function css(selector, cssText) {

	DDB_CSS_PROMISE.then(function ({ sheet, element, id }) {
		document.body.appendChild(element)
		let rules = Array.from(sheet.rules).filter(e => e.selectorText === selector)
		if (rules.length === 0) {
			let type = typeof cssText
			if (cssText !== null && type === 'object') {
				sheet.addRule(selector, '')
				let rule = sheet.rules.item(r = sheet.rules.length - 1)
				let { styleMap } = rule

				for (let k in cssText) {
					styleMap.set(k, cssText[k])
					// rule.style[k] = cssText[k]
				}
			} else {
				sheet.addRule(selector, cssText)
			}
		} else {
			let rule = rules[rules.length - 1]
			let type = typeof cssText
			if (cssText !== null && type === 'object') {
				for (let k in cssText) {
					rule.style[k] = cssText[k]
				}
			} else {
				cssText.split(/\s*;\s*/).forEach((s) => {
					let { k, v } = s.split('\s*:\s*', 2)
					rule.style[k] = v
				})
			}
		}
	})
	return DDB_CSS_PROMISE
}

// css('body', {background:'red', border:'1px solid #f00'})