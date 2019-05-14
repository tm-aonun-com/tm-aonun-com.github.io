!function (g) {



	const CSSD_TITLE = 'cssd-element'

	function getElement() {

		let cssdElement = document.querySelector(`style[title="${CSSD_TITLE}"]`)
		if (!cssdElement) {
			cssdElement = document.createElement('style')
			document.body.insertAdjacentElement('afterEnd', cssdElement)
			cssdElement.setAttribute('title', CSSD_TITLE)
		}

		return cssdElement
	}



	let Style = {
		stringify(style, selectorText) {
			let result
			let type = typeof style
			if (type === 'string') {
				result = style
			} else if (type === 'object' && style !== null) {
				result = ''
				for (let k in style) {
					let v = style[k]
					result += `  ${k} : ${v};\n`
				}
				if (typeof selectorText === 'string' && selectorText.length) {
					result = `${selectorText} \{\n${result}\}\n`
				}
			}
			return result
		},
		parse(cssText) {
			if (typeof cssText === 'string' && cssText.indexOf(':')) {
				if (cssText.indexOf('{') < cssText.lastIndexOf('}')) {
					cssText = this.extractCurlyBraces(cssText)
				}
				return this.extractProperties(cssText)
			}
		},
		// 抽出中括号里面的内容
		extractCurlyBraces(cssText) {
			let str = cssText.match(/(?<=\{).+(?=\})/u)
			return str ? str[0] : ''
		},
		// 抽出属性的名称和数值
		extractProperties(cssText) {
			let props = cssText.split(/;/g)

			let result = {}
			for (let e of props) {
				let [k, v] = e.split(':')
				if (typeof k === 'string') {
					k = k.trim()
					if (typeof v === 'string') {
						v = v.trim()
					}
				}
				if (k && v) {
					result[k] = v
				} else {
					continue
				}
			}
			return result
		},
	};



	/* 【必须】
	css的名称变换
	*/
	function cached(fn) {
		let cache = Object.create(null);
		return (function cachedFn(str) {
			let hit = cache[str];
			return hit || (cache[str] = fn(str))
		})
	}
	let camelizeRE = /-(\w)/g;
	let camelize = cached(function (str) {
		return str.replace(camelizeRE, function (_, c) { return c ? c.toUpperCase() : ''; })
	});
	let capitalize = cached(function (str) {
		return str.charAt(0).toUpperCase() + str.slice(1)
	});
	let hyphenateRE = /\B([A-Z])/g;
	let hyphenate = cached(function (str) {
		return str.replace(hyphenateRE, '-$1').toLowerCase()
	});





	/* 获取所有cssRule
	
	首先、遍历 document.styleSheets下的 cssStyleSheet。
	再遍历 cssStyleSheet 的 rule。
		
	提供可选的 filter and map 中间件，可获得中间件处理后的结果集。
	*/
	function getRules(filter) {
		let result = []
		for (let cssStyleSheet of document.styleSheets) {
			// log(cssStyleSheet.rules === cssStyleSheet.cssRules)// 相等
			for (let rule of cssStyleSheet.cssRules) {
				// 过滤搜集 filter
				if (typeof filter === 'function') {
					let v = filter(rule)
					if (v) result.push(v)
				} else {
					result.push(rule)
				}
			}
		}
		return result
	}




	/* 文档准备完毕后执行。
		
	承诺在满足 document.readyState === 'complete' 的条件下执行回调函数 fn。
	返回值为 promise ，所以可以使用 .then 函数执行回调函数。
	
	例：
	documentReadyStateCompletePromise(warn).then(log)
	文档准备完毕后，首先输出warn，后输出log。
	*/
	function documentReadyStateCompletePromise(fn) {
		let promise = new Promise((resolve, reject) => {
			const COMPLETE = 'complete'
			function listenDocumentComplete(e) {
				if (document.readyState === COMPLETE) {
					resolve(document.readyState)
					document.removeEventListener('readystatechange', listenDocumentComplete)
				}
			}
			if (document.readyState !== COMPLETE) {
				document.addEventListener('readystatechange', listenDocumentComplete)
			} else {
				resolve(document.readyState)
			}
		})
		if (typeof fn === 'function') {
			return promise.then(fn)
		}
		return promise;
	}




	/* 合并标签
	将文档中的 <style> 和 <link> 标签合并为一个 <style> 并插入到文档尾部
	*/
	function merge() {
		return documentReadyStateCompletePromise(() => {
			let cssText = mergeText()
			for (let cssStyleSheet of document.styleSheets) {
				let node = cssStyleSheet.ownerNode
				if(node.getAttribute('title')!==CSSD_TITLE) {
					cssStyleSheet.disabled = true
					node.remove()
				}
			}
			let element = getElement()
			element.textContent = cssText
			return { element, cssText }
		})
	}
	/* 
		合并为一个标签
	*/
	function mergeText() {
		let result = ''
		let s = new Set()
		let o = {}
		let i = 0
		getRules(rule => {
			if (rule instanceof CSSStyleRule) {
				let { selectorText } = rule
				let style = Style.parse(rule.style.cssText)
				if (Reflect.has([selectorText])) {
					Object.assign(o[selectorText], style)
				} else {
					o[selectorText] = style
				}
			} else {
				s.add(rule.cssText)
			}
		})
		result += Array.from(s).join('\n') + '\n'
		for (let k in o) {
			result += Style.stringify(o[k], k)
		}
		return result
	}



	function set(selectorText, css, type = 1) {
		return documentReadyStateCompletePromise(() => {
			let { styleSheets } = document;
			let rule, sheet;
			for (let cssStyleSheet of styleSheets) {
				for (let cssRule of cssStyleSheet.cssRules) {
					if (cssRule.type === type && cssRule.selectorText === selectorText) {
						rule = cssRule;
					}
				}
				sheet = cssStyleSheet;
			}
			// 文档内没有任何
			if (!sheet) {
				getElement()
				sheet = styleSheets.item(0)
			}
			// 设置css属性
			let cssType = typeof css
			if (cssType === 'string') {
				if (rule) {
					for (let e of css.split(/;/g)) {
						let kv = e.split(':')
						if (kv.length === 2) {
							let [k, v] = kv
							rule.style[k] = v
						}
					}
				} else {
					if (css.indexOf(':'))
						sheet.addRule(selectorText, css);
				}
			} else if (cssType !== null && cssType === 'object') {
				if (rule) {
					for (let k in css) {
						let v = css[k]
						rule.style[hyphenate(k)] = v
					}
				} else {
					sheet.addRule(selectorText, Style.stringify(css))
				}
			}

			return { rule, sheet }
		})
	}




	function get(selectorText, type = 1) {
		return documentReadyStateCompletePromise(() => {
			let { styleSheets } = document
			let result = {}
			let needAll = !selectorText
			log(needAll)
			for (let cssStyleSheet of styleSheets) {
				for (let cssRule of cssStyleSheet.cssRules) {
					if (cssRule.type === type) {
						if (needAll){
							let k = cssRule.selectorText
							if (!result[k]) result[k] = {}
							Object.assign(result[k], Style.parse(cssRule.style.cssText))
						}else if(cssRule.selectorText === selectorText) {
							Object.assign(result, Style.parse(cssRule.style.cssText))
						}
					}
				}
			}
			return result
		})
	}





	/* 
	测试
	*/
	function test() {
		for (let cssStyleSheet of document.styleSheets) {
			// log(cssStyleSheet.rules === cssStyleSheet.cssRules)// 相等
			for (let rule of cssStyleSheet.cssRules) {
				// rule 有好几种。CSSStyleRule、
				if (rule instanceof CSSStyleRule) {
					/* CSSStyleRule
					 cssText
					 parentRule
					 parentStyleSheet
					 selectorText
					 style:
						  cssFloat
						cssText
						getPropertyPriority
						getPropertyValue
						item
						length
						removeProperty
						setProperty
						parentRule: CSSStyleRule
						
					 styleMap:
						 size
						 append
						 set
						 delete
						 clear
						 entries
						 forEach
						 get
						 getAll
						 has
						 keys
						 values
					 type: 1
					 */
					!function () {
						group(rule.selectorText)

						log(rule.style.cssText) // 样式
						// warn(rule.cssText)// 选择器{样式}

						// 不推荐使用，重复细分内容会更多更复杂。
						// rule.styleMap.forEach((cssKeywordValues, name, stylePropertyMap) => {
						// 	let value = cssKeywordValues.toString()
						// 	if(value !== 'initial') log(name, value)
						// })

						!function () {
							group('styleMap')
							for (let e of rule.styleMap) {
								let [name, cssKeywordValues] = e
								let value = cssKeywordValues.toString()
								if (value !== 'initial') {
									log(name, value)
								}
							}
							groupEnd('styleMap')
						}

						// 同上
						// {
						// 	group('style')
						// 	for (let i = 0; i < rule.style.length; i++) {
						// 		let name = rule.style.item(i)
						// 		let value = rule.style.getPropertyValue(name)
						// 		if (value !== 'initial') {
						// 			log(name, value)
						// 		}
						// 	}
						// 	groupEnd('style')
						// }

						groupEnd(rule.selectorText)
					}()

				} else if (rule instanceof CSSKeyframesRule) {
					/* CSSKeyframesRule
						cssRules
						cssText
						name
						parentRule
						parentStyleSheet
						type: 7
					*/
					!function () {
						group(rule.name)
						log(rule.cssText)// 全部内容
						{
							group('cssRules')
							for (let cssKeyframesRule of rule.cssRules) {
								log(cssKeyframesRule.cssText)// 下面的 keyText{style.cssText}

								// log(cssKeyframesRule.keyText)
								// log(cssKeyframesRule.style.cssText)// 下面的name:value

								// for(let name of cssKeyframesRule.style){
								// 	// CSSStyleDeclaration
								// 	let value = cssKeyframesRule.style[name]
								// 	if(value==='200px') cssKeyframesRule.style[name] = '100px'
								// 	log(name, cssKeyframesRule.style[name])
								// }
							}
							groupEnd('cssRules')
						}
						groupEnd(rule.name)
					}()
				} else {
					/* type
						CSSMediaRule
						conditionText
						cssRules
						cssText
						media
						type: 4
					*/
					warn(rule)
				}
			}
		}
		return result
	}



	// exports
	Object.defineProperty(this, 'cssd', { value: {} })

	Object.defineProperties(this.cssd, {
		CSSD_TITLE: { get() { return CSSD_TITLE }, enumerable: true },
		documentReadyStateCompletePromise: { value: documentReadyStateCompletePromise, enumerable: true },
		get: { value: get, enumerable: true },
		getElement: { value: getElement, enumerable: true },
		getRules: { value: getRules, enumerable: true },
		set: { value: set, enumerable: true },
		Style: { value: Style, enumerable: true },
		merge: { value: merge, enumerable: true },
		mergeText: { value: mergeText, enumerable: true },
		test: { value: test, enumerable: true },
	})

}(this)