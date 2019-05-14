function encodeArgs(str, args) {
	// 但愿是字符串
	if (typeof str !== 'string') return '';

	let s, regexp;
	regexp = /\{([^\}]+?)\}/g;

	// 在这里{为转义符，遇到{{须进行回避
	s = str.split('{{');// 回避{{符号
	s = s.map(function (str) {
		return str.replace(regexp, function (match, name) {
			let v = args[name];
			if (v === undefined || v === null) v = match;
			// console.debug(v !== match ? `替换成功：${match}-->${v}`: `保留原样：${match}`);
			return v;
		});
	});
	return s.join('{{');
}
