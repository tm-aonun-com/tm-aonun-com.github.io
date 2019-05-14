function DataLog(datas) {
	this.init(datas)
}
DataLog.prototype.init = function (datas) {
	this.datas = Array.isArray(datas) ? datas : []
}
DataLog.prototype.filter = function (time, equal = true) {
	if (!Number.isNaN(time)) {
		return new DataLog(this.datas.filter(e => equal ? (e.time >= time) : e.time > time))
	}
	return this
}
DataLog.prototype.sort = function () {
	this.datas.sort((a, b) => a.time > b.time ? -1 : (a.time < b.time ? 1 : 0))
	return this
}
DataLog.prototype.add = function (...o) {
	let time = Date.now()
	let data = o.reduce((r, e) => {
		let type = typeof e
		if (type === 'string') {
			return Object.assign(r, { [e]: undefined })
		}
		if (type === 'object' && e !== null) {
			return Object.assign(r, e)
		}
		return r
	}, {})
	this.datas.push({ data, time }) 
	return this
}
DataLog.prototype.clear = function () {
	this.datas.length = 0
	return this
}
DataLog.prototype.compress = function (reset = false) {
	let time = -1
	let o = this.datas.reduce((r, e) => {
		if (e.time < time) {
			console.log(e.time, time)
			return this.sort().compress(reset)
		}
		time = e.time
		return Object.assign(r, e.data)
	}, {})
	o.nomalize_()
	if (reset) {
		this.datas = [{ data: Object.assign({}, o), time }]
	}
	return new DataLog([{ data: o, time }])
}


if(typeof 'module'!==undefined) module.exports = DataLog
