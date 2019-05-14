async function afn(...fs) {
	let s = fs.filter(f => typeof f === 'function')
	let f, v, m;
	while (f = s.shift()) {
		v = await new Promise((yes, no) => {
			m = { yes, no }
			Reflect.apply(f, m, [v])
		})
	}
	return v
}

async function afn2(...fs) {
	let s = afn2.s;
	s.push(...fs.filter(f => typeof f === 'function'))
	if (afn2.b) {
		return Promise.resolve(true);
	}
	afn2.b = true
	let f, v, m;
	while (f = s.shift()) {
		v = await new Promise((yes, no) => {
			m = { yes, no }
			Reflect.apply(f, m, [v])
		})
	}
	afn2.b = false
	return v
}
afn2.b = false
Object.defineProperty(afn2, 's', { value: [], enumerable: true })