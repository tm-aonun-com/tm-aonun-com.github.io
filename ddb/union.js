function union(a, b, ak, bk) {
	if (bk === undefined) bk = ak;
	let r = [];
	a.forEach(e => {
		let v = e[ak];
		if (v !== undefined) {
			let i = b.findIndex(e => e[bk] === v);
			let o = Object.assign({}, e, b[i]);
			if (ak !== bk) delete o[bk];
			r.push(o);
		} else {
			r.push(v);
		}
	});
	return r;
}

function insert(a, b, ak, bk) {
	if (bk === undefined) bk = ak;
	let r = [];
	a.forEach(e => {
		let v = e[ak];
		if (v !== undefined) {
			let i = b.findIndex(e => e[bk] === v);
			let o = Object.assign({}, e);
			o[ak] = b[i];
			r.push(o);
		} else {
			r.push(v);
		}
	});
	return r;
}
