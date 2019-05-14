const CUSTOMIZE_STYLE_ID = Date.now().toString(36) + Math.random().toString(36).slice(2);
const CUSTOMIZE_STYLE_ELEMENT = (function () {
	let r = document.getElementById(CUSTOMIZE_STYLE_ID)
	if (r === null) r = document.createElement('style')
	r.setAttribute('id', CUSTOMIZE_STYLE_ID)
	r.setAttribute('title', CUSTOMIZE_STYLE_ID)
	return r
})();
const CUSTOMIZE_SHEET = (function () {
	document.head.appendChild(CUSTOMIZE_STYLE_ELEMENT)
	return document.styleSheets.item(document.styleSheets.length - 1)
})();
{
	let fn = function() {
		document.removeEventListener('load', fn)
		document.body.appendChild(CUSTOMIZE_STYLE_ELEMENT)
	}
	document.addEventListener('load',fn)
}
function css(selector, cssText) {
	// document.body.appendChild(CUSTOMIZE_STYLE_ELEMENT)
	let rules = Array.from(CUSTOMIZE_SHEET.rules).filter(e => e.selectorText === selector)
	if (rules.length === 0) {
		let type = typeof cssText
		if (cssText !== null && type === 'object') {
			CUSTOMIZE_SHEET.addRule(selector, '')
			let rule = CUSTOMIZE_SHEET.rules.item(r = CUSTOMIZE_SHEET.rules.length - 1)
			let { styleMap } = rule
			for (let k in cssText) {
				let v = cssText[k]
				// log(styleMap.has(k), styleMap.size, k,v)
				styleMap.set(k,v)
			}
		} else {
			CUSTOMIZE_SHEET.addRule(selector, cssText)
		}
	} else {
		let rule = rules[rules.length-1]
		let type = typeof cssText
		if (cssText !== null && type === 'object') {
			for (let k in cssText) {
				let v = cssText[k]
				rule.style[k] = v
			}
		} else {
			cssText.split(/\s*;\s*/).forEach((s) => {
				let { k, v } = s.split('\s*:\s*', 2)
				rule.style[k] = v
			})
		}
	}
}

// css('body', {background:'red', border:'1px solid #f00'})