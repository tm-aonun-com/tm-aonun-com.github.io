const { log } = console


let obj = {
	a: 1,
	b: {
		bb: {
			bbb: 222
		}
	},
	c: [3, 33, 333]
}




function toKeyArray(str, escape = '/') {
	let cursor = 0,
		length = str.length,
		dot = '.',
		start = 0,
		item,
		char,
		prevChar,
		result = [];
	while (cursor < length) {
		char = str.charAt(cursor)
		if (char === dot) {
			prevChar = str.charAt(cursor - 1)
			if (prevChar === escape) {
				++cursor
			} else if (prevChar === dot) {
				item = '';
				result.push(item)
				start = cursor + 1
			} else {
				item = str.slice(start, cursor).replace(/\/\./g, '.')
				result.push(item)
				start = cursor + 1

			}
		}
		++cursor
	}
	item = str.slice(start, cursor).replace(/\/\./g, '.')
	result.push(item)
	return result
}


function getFromKeyArray(obj, keyArray) {
	let value, key, index, ok;
	value = obj
	ok = keyArray.every((k, i) => {
		key = k
		index = i
		value = value[k]
		return value !== undefined && value !== null
	})
	return { ok, value, index, key, keyArray }
}

// log(getFromKeyArray(obj, toKeyArray('a.b.c')))


function setFromKeyArray(obj, keyArray, value, create = false) {
	let key,
		index = 0,
		length = keyArray.length,
		lastIndex = length - 1,
		item = obj,
		ok, v

	length = keyArray.length
	lastIndex = length - 1
	while (index < length) {
		key = keyArray[index]
		v = item[key]
		if (index === lastIndex) {
			if (typeof item === 'object') {
				item[key] = value
			} else {
				throw new Error(`${item} is not object.`)
			}
		} else {
			ok = v !== null && typeof v === 'object'
			if (ok) {
				item = item[key]
			} else {
				if (create) {
					if (v === null || v === undefined) {
						item = item[key] = v = {}
					} else {
						throw new Error(`${keyArray.slice(0, index + 1).join('.')} is ${v}(${typeof v})`)
					}
				} else {
					let message = `obj.${keyArray.slice(0, index + 1).join('.')} === ${JSON.stringify(v)}. Unable to deep from obj.${keyArray.join('.')}.`
					// console.warn(message)
					// break;
					throw new Error(message)
				}

			}
			item = v
		}
		index++
	}
	return {
		obj,
		keyArray,
		value,
		create,
		item,
		ok
	}
}


// obj.d = 'string'
// setFromKeyArray(obj, toKeyArray('d.dd'), '4')

// log(obj)



function objectChangeListener(obj, keypath, handle) {
	let { map } = objectChangeListener
	let listener

	function listen(listener, obj, keypath, handle) {
		let value, curValue, keyArray
		clearInterval(listener.interval)
		keyArray = toKeyArray(keypath)
		value = getFromKeyArray(obj, keyArray).value
		listener.interval = setInterval(() => {
			curValue = getFromKeyArray(obj, keyArray).value
			if (value !== curValue) {
				handle(curValue, value)
				value = curValue
			}
		})
	}

	if (map.has(obj)) {
		listener = map.get(obj)
		if (listener.handle === handle) return;
	} else {
		listener = map.set(obj, { keypath, handle })
	}

	listen(listener, obj, keypath, handle)
}
objectChangeListener.map = new Map()



// test
{
	// objectChangeListener(obj, 'b.bb.bbb', (newValue, oldValue) => {
	// 	log('change', newValue, obj)
	// })
	// setTimeout(() => obj.b.bb.bbb = 'new1', 1000)
	// setTimeout(() => obj.b.bb.bbb = 'new2', 2000)
	// setTimeout(() => obj.b.bb.bbb = 'new3', 3000)
}




let map = new Map()
function on(obj, keypath, handle) {
	if (typeof handle !== 'function') throw new Error('handle is not function.');
	if (!map.has(obj)) map.set(obj, {})
	let o = map.get(obj)
	o[keypath] = handle
}
function off(obj, keypath) {
	if (keypath) {
		if (map.has(obj)) delete map.get(obj)[keypath]
	} else {
		map.delete(obj)
	}
}

function change(obj, keypath, value) {
	if (map.has(obj)) {
		let o = map.get(obj)
		let k
		if (Object.keys(o).some((e) => {
			k = e
			return keypath.indexOf(e) === 0
		})) {
			setFromKeyArray(obj, toKeyArray(keypath), value)
			let v = getFromKeyArray(obj, toKeyArray(k)).value
			return Reflect.apply(o[k], obj, [v, keypath, obj])
		}
	}
}


// test
{
	on(obj, 'b.bb', function (value, keypath, obj) {
		log('change', value, keypath)
	})


	change(obj, 'b.bb.bbb', 'new1')
	change(obj, 'b.bb.bbb.d', {})
	change(obj, 'b.bb.ccc', 3)
}

