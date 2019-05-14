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
