/* 获取
遍历styleSheets下rules中的selectorText，并反馈最终值。
*/
function rule(selectorText, css, type = 1) {
	return documentReadyStateCompletePromise(() => {
		let rule, sheet;
		for (let cssStyleSheet of document.styleSheets) {
			for (let cssRule of cssStyleSheet.cssRules) {
				if (cssRule.type === type && cssRule.selectorText === selectorText) {
					rule = cssRule;
				}
			}
			sheet = cssStyleSheet;
		}
		if(!sheet) {
			getCssdElement()
			let cssdElement = document.querySelector(`style[title="${CSSD_TITLE}"]`)
			if (!cssdElement) {
				cssdElement = document.createElement('style')
				document.body.insertAdjacentElement('afterEnd', cssdElement)
				cssdElement.title = CSSD_TITLE
			}

			return cssdElement
		}
		// 设置css属性
		// let cssType = typeof css
		// if (cssType === 'string') {
		// 	if (rule) {
		// 		for (let e of css.split(/;/g)) {
		// 			let kv = e.split(':')
		// 			if (kv.length === 2) {
		// 				let [k, v] = kv
		// 				rule.style[k] = v
		// 			}
		// 		}
		// 	} else {
		// 		if (css.indexOf(':'))
		// 			sheet.addRule(selectorText, css);
		// 	}
		// } else if (cssType !== null && cssType === 'object') {
		// 	if (rule) {
		// 		for (let k in css) {
		// 			let v = css[k]
		// 			rule.style[hyphenate(k)] = v
		// 		}
		// 	} else {
		// 		sheet.addRule(selectorText, stringifyStyle(css))
		// 	}
		// }

		log(rule, sheet)


		return { rule, sheet }
	})
}



rule('span', { background: 'blue' })
