function stringifyStyle(style, selectorText) {
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
		if (typeof selectorText==='string' && selectorText.length) {
			result = `${selectorText} \{\n${result}\}\n`
		}
	}
	return result
}
