Object.prototype.grep_ = function (...ks) {
	let rs = Object.create(null)
	let f = (k) => {
		let v = this[k]
		if (v !== undefined) rs[k] = v
		// console.log(k, v)
	}
	ks.forEach(k => {
		if (k instanceof RegExp) {
			Object.getOwnPropertyNames(this).filter(_ => k.test(_)).forEach(k => {
				f(k)
			})
		} else {
			f(k)
		}
	})
	return rs
}
Object.prototype.each_ = function (f, all = false) {
	Object[all ? 'getOwnPropertyNames' : 'keys'](this).forEach(k => {
		f(this[k], k, this)
	})
}
Object.prototype.desc_ = function (k) {
	if (k === undefined) {
		if (Object.getOwnPropertyDescriptors instanceof Function) {
			return Object.getOwnPropertyDescriptors(this)
		} else {
			return Object.getOwnPropertyNames(this).map(k => Object.getOwnPropertyDescriptor(this, k))
		}
	} else {
		return Object.getOwnPropertyDescriptor(this, k)
	}
}
Object.prototype.nomalize_ = function(){
	for (let k in this) {
		let v = this[k]
		if (v === undefined) delete this[k]
	}
	return this
}

String.prototype.apply_ = function (arg, stay = true) {
	if (arg === undefined) return this
	return this.replace(/(?<!\$)\$\{([^\}]+?)\}/g, function (old,k) {
		let v = arg[k]
		return v === undefined ? (stay ? old : '') : v
	})
}

Object.defineProperties(Date.prototype,{
	fy:{get(){return this.getFullYear()}, set(v){this.setFullYear(v)}},
	m:{get(){return this.getMonth()+1}, set(v){this.setMonth(v-1)}},
	d:{get(){return this.getDate()}, set(v){this.setDate(v)}},
	h:{get(){return this.getHours()}, set(v){this.setHours(v)}},
	i:{get(){return this.getMinutes()}, set(v){this.setMinutes(v)}},
	s:{get(){return this.getSeconds()}, set(v){this.setSeconds(v)}},
	ms:{get(){return this.getMilliseconds()}, set(v){this.setMilliseconds(v)}},
	w:{get(){return this.getDay()}, set(v){this.setDat()}},
	FY:{get(){return this.getUTCFullYear()}, set(v){this.setUTCFullYear(v)}},
	M:{get(){return this.getUTCMonth()+1}, set(v){this.setUTCMonth(v-1)}},
	D:{get(){return this.getUTCDate()}, set(v){this.setUTCDate(v)}},
	H:{get(){return this.getUTCHours()}, set(v){this.setUTCHours(v)}},
	I:{get(){return this.getUTCMinutes()}, set(v){this.setUTCMinutes(v)}},
	S:{get(){return this.getUTCSeconds()}, set(v){this.setUTCSeconds(v)}},
	MS:{get(){return this.getUTCMilliseconds()}, set(v){this.setUTCMilliseconds(v)}},
	W:{get(){return this.getUTCDay()}, set(v){this.setUTCDay(v)}},
	y:{get(){return this.getYear()}},
	t:{get(){return this.getTime()}},
	tz:{get(){return this.getTimezoneOffset()}},
	ios:{get(){return this.toISOString()}},
	gmt:{get(){return this.toGMTString()}},
	utc:{get(){return this.toUTCString()}},
	time:{get(){return this.toTimeString()}},
	date:{get(){return this.toDateString()}},
	locale:{get(){return this.toLocaleString()}},
	ltime:{get(){return this.toLocaleTimeString()}},
	ldate:{get(){return this.toLocaleDateString()}},
	two:{value:function(v){return v.toString().padStart(2,'0')}},
	str:{get(){return this.fy+'.'+this.two(this.m)+'.'+this.two(this.d)+' '+this.two(this.h)+':'+this.two(this.i)+':'+this.two(this.s) }}
});