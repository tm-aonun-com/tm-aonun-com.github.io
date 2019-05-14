function tmstringToTable(s) {
	let table = $('<table />'), tr, td;
	s.split('\n').forEach(function (e, i) {
		if (i < 10) {
			var line = e.trim();
			if (/^TextKey\tText\tComment/.test(line) || /^\[.+?\]$/.test(line)) {
				// console.warn('ignore',line);
				return;
			}
		}
		let row = e.split('\t');
		if (row.length >= 3) {
			let [textKey, target, targetComment, season, revision, source, sourceComment] = row
			tr = $('<tr>').appendTo(table);
			if (!source) source = ''
			if (!sourceComment) sourceComment = ''
			$('<td>').text(i).appendTo(tr).addClass('no');
			$('<td>').text(source).appendTo(tr).addClass('source');
			$('<td>').text(target).appendTo(tr).addClass('target modify');
			$('<td>').text(textKey).appendTo(tr).addClass('textKey');
			$('<td>').text(sourceComment).appendTo(tr).addClass('sourceComment');
			$('<td>').text(targetComment).appendTo(tr).addClass('targetComment');
			$('<td>').text(season).appendTo(tr).addClass('season');
		}
	});
	return table.get(0)
}


function tableToTmstring(table, head) {
	let s = ''
	if(head) s = head + s
	table.querySelectorAll('tr').forEach(tr=>{
		let textKey = text(tr, '.textKey')
		if(textKey) {
			let target = text(tr, '.target')
			if(target) s += `${textKey}\t${target}\n`
		}
	})

	// 方案A
	// 编辑时，尾部有时会冒出个BR，而且无法删除。通常会多个#Text数据为'\n'，同样无法删除。除非全选删除。
	// function text(tr, s) {
	// 	let e = tr.querySelector(s), r = ''
	// 	if(e) {
	// 		r = e.innerText
	// 		let { lastChild:c } = e
	// 		if(c) {
	// 			if ((c.nodeType === 3 && c.data === '\n') || (c.nodeType===1 && c.nodeName==='BR'))
	// 				r = r.slice(0, -1)
	// 		}
	// 		r = r.replace(/\n/g, '\\n')
	// 	}
	// 	return r
	// }

	// 方案B
	// 简单使用jQuery实现。不愧是jQuery大神。
	function text(tr, s) {
		return $(tr).find(s).text().replace(/\n/g, '\\n')
	}

	return s
}