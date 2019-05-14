let { log, warn, info, dir, trace, group, groupEnd } = console




// /* 尾部添加 <style> 标签
// 	selectorText
// 	cssText
// */
// function appendStyle(selectorText, cssText) {
// 	let element = document.createElement('style')
// 	getElement().appendChild(element)
// 	element.textContent = `${selectorText} {${cssText}}`
// }




// function getAll() {
// 	return getRules(rule => {
// 		if (rule instanceof CSSStyleRule) {
// 			let str = extractCurlyBraces(rule.cssText)
// 			let props = extractProperties(str)
// 			return { [rule.selectorText]: props }
// 		}
// 		return rule.cssText
// 	})
// }

// // log(getOwnCssRules())
// function parseCSSStyleRule(rule) {
// 	return extractProperties(extractCurlyBraces(rule.cssText))
// }


// function preMergeOwnCssRules() {
// 	let result = {}
// 	let i = 0
// 	getRules(rule => {
// 		if (rule instanceof CSSStyleRule) {
// 			let { selectorText } = rule
// 			if (Reflect.has([selectorText])) {
// 				Object.assign(result[selectorText], parseCSSStyleRule(rule))
// 			} else {
// 				result[selectorText] = parseCSSStyleRule(rule)
// 			}
// 		} else {
// 			result[i++] = rule.cssText
// 		}
// 	})
// 	return result
// }
// function mergeOwnCssRules() {
// 	let result = ''
// 	let o = {}
// 	let i = 0
// 	getRules(rule => {
// 		if (rule instanceof CSSStyleRule) {
// 			let { selectorText } = rule
// 			if (Reflect.has([selectorText])) {
// 				Object.assign(o[selectorText], Style.parse(rule.style.cssText))
// 			} else {
// 				o[selectorText] = Style.parse(rule.style.cssText)
// 			}
// 		} else {
// 			result += rule.cssText + '\n'
// 		}
// 	})
// 	for (let k in o) {
// 		result += Style.stringify(o[k], k)
// 	}
// 	return result
// }



// function add(selectorText, cssText) {
// 	return documentReadyStateCompletePromise(() => {
// 		let ss = document.styleSheets
// 		let len = ss.length
// 		let s
// 		if (len) {
// 			s = ss[len - 1]
// 			s.addRule(selectorText, cssText)
// 		} else {
// 			getElement()
// 			return add(selectorText, cssText)
// 		}
// 	})
// }




// log(getRules(rule=>extractCurlyBraces(rule.cssText)))







	// 其他领域
	// document.activeElement
	// document.scrollingElement
	// ononline = onoffline = function (e) {
	// 	console.log(e.type, e)
	// }


	cssd.set('span', {color:'red'})
	cssd.set('span', {color:'blue', background:'yellow'})
	cssd.set('span', {borderColor:'#F0F', borderStyle:'solid', borderWidth:'6px'})
	cssd.set('span', {borderRadius:'5px'})
	cssd.set('span', 'padding:30px;')


	cssd.get('span').then(log)


	cssd.get().then(v=>log(JSON.stringify(v,null,2)))