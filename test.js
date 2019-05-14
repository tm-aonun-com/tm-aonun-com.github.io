// const { log } = console

// function RE() { }
// RE.marks = {
// 	search: new RegExp('\\/^[-](|)*+?!{}.$'.split('').map(e=>'\\'+e).join('|'),'g'),
// 	replace: /\$|\&/g,
// }
// RE.search = function search(str) {
// 	return str.replace(RE.marks.search, '\\$&')
// }
// RE.replace = function(str, a, b) {
// 	a = new RegExp(RE.search(a),'g')
// 	b = b.replace(/\$/g, '$$$$')
// 	return str.replace(a, b)
// }
// Object.freeze(RE)

// let s = 'abc$$def'
// // log(s.replace(/(\$+)/g, '$1'))
// log(RE.replace(s, '$', '_'))



function smartMatch(source, sourceTargetArray) {
	var ret = '';
	var o = strDiff(source, sourceTargetArray[0]);
	var d1 = o.diff1, d2 = o.diff2, len1 = d1.length, len2 = d2.length, d1Value, d2Value;
	var regexp = /^[\x01-\xff]+$/;
	if (len1 === len2) {// 不同点个数一样
		var startResult = [];
		startResult.push('⁉ Replace');
		ret = sourceTargetArray[1];
		for (var i = 0; i < len1; i++) {
			d1Value = d2Value = '';
			if (regexp.test(d1[i])) {
				ret = ret.replace(d2[i], d1[i]);
				startResult.push(d2[i] + ' -> ' + d1[i]);
			} else {
				dict.array.some(function (e) {
					if (e && (typeof e[0] === 'string') && e[0] && (typeof e[1] === 'string') && e[1]) {
						if (e[0].trim() === d1[i].trim()) d1Value = e[1].trim();
						if (e[0].trim() === d2[i].trim()) d2Value = e[1].trim();
						if (d1Value && d2Value) return true;
					}
				});
				if (d2Value) {
					ret = ret.replace(d2Value, d1Value || d1[i]);
					if (d1Value) {
						startResult.push(d2Value + ' -> ' + d1Value);
					} else {
						startResult.push(d2Value + ' *> ' + d1[i]);
					}
				} else {
					if (d1Value) {
						startResult.push(d2[i] + ' *> ' + d1Value);
					} else {
						startResult.push(d2[i] + ' *> ' + d1[i]);
					}
				}
			}
		}
		startResult.push('[Use] ' + sourceTargetArray[1]);
		pushlog.apply(null, startResult);
	} else if (len1 == 0) {
		// len2多，所以要删除多余的部分
		var startResult = [];
		startResult.push('⁉ Remove');
		ret = sourceTargetArray[1];
		for (var i = 0; i < len2; i++) {
			d2Value = '';
			if (regexp.test(d2[i])) {
				ret = ret.replace(d2[i], '');
			} else {
				dict.array.some(function (e) {
					if (e && (typeof e[0] === 'string') && e[0] && (typeof e[1] === 'string') && e[1]) {
						if (e[0].trim() === d2[i].trim()) {
							d2Value = e[1];
							return true;
						}
					}
				});
				if (d2Value) {
					ret = ret.replace(d2Value, '');
					startResult.push('[x] ' + d2Value);
				} else {
					startResult.push('[*] ' + d2[i]);
				}
			}
		}
		startResult.push('[Use] ' + sourceTargetArray[1]);
		pushlog.apply(null, startResult);
	} else if (len2 == 0) {
		// len1多，所以要找到内容，添加进去
		var startResult = [];
		ret = sourceTargetArray[1];
		startResult.push('‼ Add');
		for (var i = 0; i < len1; i++) {
			d1Value = '';
			if (regexp.test(d1[i])) {
				startResult.push('[*]' + d1[i]);
			} else {
				dict.array.some(function (e) {
					if (e && (typeof e[0] === 'string') && e[0] && (typeof e[1] === 'string') && e[1]) {
						if (e[0].trim() === d1[i].trim()) {
							d1Value = e[1];
							return true;
						}
					}
				});
				if (d1Value) {
					startResult.push('[*] ' + d1Value);
				} else {
					startResult.push('[*] ' + d1[i]);
				}
			}
		}
		startResult.push('[Use] ' + sourceTargetArray[1]);
		pushlog.apply(null, startResult);
	} else {
		ret = sourceTargetArray[1];
		var startResult = [];
		startResult.push('❌ No smart');
		startResult.push('[*]' + d1.join('|') + ' <- ' + d2.join('|'));
		pushlog.apply(null, startResult);
		// ❌💯‼️⁉️
	}
	return ret;
}

function strDiff(str1, str2, separator) {
	str1 = str1 || "";
	str2 = str2 || "";
	// separator = separator || /\b|[\s,\.\!_\-\+]+|\{\\r\\n\}|\\n/;// 原来的
	separator = separator || /[\s,\.\!_\-\+]+|\{\\r\\n\}|\\n/;
	// arr中有ele元素
	function hasElement(arr, ele) {
		// 内存循环
		var hasItem1 = false;
		for (var i2 = 0; i2 < arr.length; i2++) {
			//
			var item2 = arr[i2] || "";
			if (!item2) {
				continue;
			}
			//
			if (ele == item2) {
				hasItem1 = true;
				break;
			}
		}
		return hasItem1;
	};
	function inAnotB(a, b) { // 在A中，不在B中
		var res = [];
		for (var i1 = 0; i1 < a.length; i1++) {
			var item1 = a[i1] || "";
			if (!item1) {
				continue;
			}
			var hasItem1 = hasElement(b, item1);
			if (!hasItem1) {
				res.push(item1);
			}
		}
		return res;
	};
	//
	var list1 = str1.split(separator);
	var list2 = str2.split(separator);
	//
	var diff1 = inAnotB(list1, list2);
	var diff2 = inAnotB(list2, list1);
	// 返回结果
	var result = {
		diff1: diff1,
		diff2: diff2,
		separator: separator
	};
	return result;
};

smartMatch('aa', [['aa','AA'], ['a','A']])