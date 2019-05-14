let w_collector, dict
let lwsd
let lwsd2
let { log, warn, info } = console
let themaReady = [false, false]
document.body.style.display = 'none'

// 纯文字全部替换
let textRE = {}
textRE.marks = {
	search: new RegExp('\\/^[-](|)*+?!{}.$'.split('').map(e => '\\' + e).join('|'), 'g'),
	replace: /\$|\&/g,
}
textRE.search = function search(str) {
	return str.replace(textRE.marks.search, '\\$&')
}
textRE.replace = function (str, a, b) {
	a = new RegExp(textRE.search(a), 'g')
	b = b.replace(/\$/g, '$$$$')
	return str.replace(a, b)
}
Object.freeze(textRE)


let SM = SelectionManager = {
	get s() { return window.getSelection() },
	get range() { return this.s.getRangeAt(0); },
	set range(v) {
		if (v instanceof Range) {
			this.s.removeAllRanges();
			this.s.addRange(v);
		}
	},
	get text() { return this.range.toString(); },
	set text(v) {
		this.range.deleteContents();
		this.range.insertNode(document.createTextNode(v));
		this.range.collapse();
	}
};


$(function () {
	setTimeout(() => $('#autoSizeDictWindow').click(), 1000)

	let code_similar = `(function(g){if(typeof g.ao==='undefined'){g.ao={};}var r=g.ao.similar=function similar(t,s,u){if(null===t||null===s||void 0===t||void 0===s)return 0;var n,o,e,l,f=0,i=0,b=0,c=(t+="").length,h=(s+="").length;for(n=0;n<c;n++)for(o=0;o<h;o++){for(e=0;n+e<c&&o+e<h&&t.charAt(n+e)===s.charAt(o+e);e++);e>b&&(b=e,f=n,i=o)}return(l=b)&&(f&&i&&(l+=r(t.substr(0,f),s.substr(0,i))),f+b<c&&i+b<h&&(l+=r(t.substr(f+b,c-f-b),s.substr(i+b,h-i-b)))),u?200*l/(c+h):l};})(this);`;
	let code_Reference = `class Reference{
	constructor(arr){if(!(arr instanceof Array)) arr=[]; this.from(arr); }
	from(arr) {this.array=Reference.unique(arr); }
 	add(source,target){this.array.push([source,target]); this.from(this.array); }
	static enlistKey(arr){return arr.filter(function(e){return e[0] && e.toString().trim().length>0; }); }
	unique(arr){
		return arr;
	}
	static unique(arr){
		return arr;
	}
	// [ ['source','target','other', ...], ... ]
	concat(arr) {
		this.from(this.array.concat(arr));
	}

	search(s,p=0,i=0){
		var r=this.result=[];
		if(typeof s==='undefined' || typeof s!=='string') return r;
		this.array.forEach(function(e,index){
			var _s=e[i], sv=similar(s, e[i], true);
			if(sv >= p) {
				r.push(([]).concat(e,sv,index));
			}
		});

		r.sort(function(a,b){
			// 0:source, 1:target, 2:similar, 3:index
			var a_similar=parseFloat(a[2]);
			var b_similar=parseFloat(b[2]);
			if(a_similar===b_similar) {
				var a_index=parseFloat(a[3]);
				var b_index=parseFloat(b[3]);
				return a_index>b_index? -1: (a_index===b_index? 0 : 1)
			}else{
				return a_similar>b_similar?-1:(a_similar===b_similar?0:1);
			}
		});
		// console.log(s,r,this.array);
		// r.reverse();
		return r;
	}
	searchAll(s,p=0){
		var r=this.result=[];
		if(typeof s==='undefined' || typeof s!=='string') {
			return r;
		}
		this.array.forEach(function(e){
			var sv;
			var b = e.some(function(ee){
				sv = similar(s, ee, true);
				return sv >= p;
			});
			if(b) {
				r.push([sv].concat(e));
			}
		});
		return r;
	}
};

function similar(a,b,c=true) {
	return Number(ao.similar(a,b,c).toFixed(2));
};`;
	let code_Search_min = `class Search {
	static _getRegExp(v) {
		v=v.replace(Search.REGEXP_SPACES,'')
		if(v==='') return '';
		var s=Search.SPACES;
		return s+v.split('').map(function(e){return e.replace(Search.REGEXP_TOKENS,'\\\\$&');}).join(s)+s;
	}
	static getRegExp(v,options,noFormat) {
		if(!v) return ;
		if(noFormat) {
			try{
				v=new RegExp(v,'g');
				return v;
			}catch(err){
				console.warn('Invalid argument - new RegExp('+v+',"g")');
			}
		}
		v=v.split('\\\\');
		v=new RegExp(v.map(Search._getRegExp).join('\\\\\\\\'),options);
		v= v.source==='(?:)' ? Search.VIRTUAL_REGEXP : v;
		return v;
	}
}
Object.defineProperties(Search, {
	REGEXP_TOKENS : {value:/[\\/\\?\\*\\+\\-\\^\\$\\(\\)\\<\\>\\[\\]\\{\\}\\.\\,\\:\\&\\|]/g},
	REGEXP_SPACES : {value:/\\s+/g},
	SPACES        : {value:'\\\\s*'},
	VIRTUAL_REGEXP: {value:{test:function(){return false;},match:function(){return null;}}}
});
`;


	// statusDict tip
	lwsd2 = new LocaleWorker('searchDictionary2',
		(e) => {
			let data = e.data, status = data[0], res;
			if (status === 200) {
				lwsd2.done = true;
				// 显示到#statusDict中
				res = data[1];
				$('#statusDict').empty();
				res.sort(function (a, b) {
					return a[0].length === 1 ? 1 : 0;
				});
				res.forEach((kv, i) => {
					$('<tr>').appendTo('#statusDict')
						.append($('<td class="no">').text(i + 1))
						.append($('<td class="source">').text(kv[0]))
						.append($('<td class="target" contenteditable="plaintext-only">').text(kv[1]))
						.append($('<td class="similar">').text('Auto'))
						.append($('<td class="index">').text(kv[2]))
				});
			}
		}, code_Search_min + `
function stringNormalize(s){
    // return typeof s!=='undefined' ? String(s).replace(/[\\x00-\\xff]/g,'') : s;
    return s;
}

addEventListener('message',(e)=>{
	let a=e.data, status=a[0], source, res, array;
	if(status===100){
		// send(100,source,dict.array);
		// a[1] text
		// a[2] dict
		source=a[1];
		array=a[2];

		// source=stringNormalize(source);
		res=[];

		array.forEach(function(kv,index){
		    // let k=kv[0], v=kv[1], _k=stringNormalize(k);
		    let k=kv[0], v=kv[1], _k=k;
		    let re= Search.getRegExp(_k.length>0 ? _k : k);
		    if(re.test(source)) {
		        res.push([k,v,index]);
		    }
		});

		res.sort((a,b)=>String(a[0]).length<String(b[0]).length)
		res.reverse();
		send(200,res);
	}
});
`);
	lwsd2.done = true;


	// tips
	lwsd = new LocaleWorker('searchDictionary',
		(e) => {
			/* e.data
			[ statusCode, resultArray ]
			*/
			let data = e.data;
			if (data[0] === 200) {// statusCode
				lwsd.done = true;
				let a = data[1];// resultArray
				let table = ao.arrayToTable(a);
				// 显示到#tips中
				$('td:nth-child(4)', table).addClass('index');
				$('td:nth-child(3)', table).addClass('similar').each((i, e) => e.textContent = parseInt(e.textContent) + '%');
				$('td:nth-child(2)', table).attr({ 'contenteditable': 'plaintext-only' }).addClass('target');
				$('td:nth-child(1)', table).attr({ 'contenteditable': 'plaintext-only' }).addClass('source');
				$('tr', table).each(function (i, tr) {
					$(tr).prepend($('<td class="no"></td>').text(i + 1));
				});
				$('#tips').html(table.innerHTML).prop('scrollTop', 0);
				// console.log($('#auto100').prop('checked') && a && a[0] &&a[0][2]==100)
				// 规则A：对于如果最后一个编辑的内容，不要采取自动插入。
				if ($('#auto100').prop('checked') && a && a[0] && a[0][2] == 100 && lwsd.target.textContent !== a[0][1]) {
					$(lwsd.target).text(a[0][1])
						.addClass('doneAuto')
					// .css({background:$('#ctrlEnterColor').val()})
				}

				// checktm1
				if ($('#checktm1').prop('checked') && a.length && $('.currentEditRow').length) {
					let t = a[0]
					if (t) {
						let t1 = t[0];
						let t2 = $('.currentEditRow .source').text().trim();
						let dmp = new diff_match_patch();
						let dmpHTML = dmp.diff_prettyHtml(dmp.diff_main(t1, t2));
						pushloghtml(dmpHTML);

						let { x, y, height } = $('.currentEditRow .target').get(0).getBoundingClientRect();
						showTip({ html: dmpHTML, x, y, delay: 5000, css: { transform: 'translate(0,-100%)' } });
					}
				}
			}
		}, code_similar + code_Reference + `addEventListener('message',(e)=>{
	let a=e.data;
	if(a[0]===100){
		// send(100,t,similarPercent,dict.array);
		// a[1] text
		// a[2] similarPercent
		// a[3] dict

		let arr=new Reference(a[3]).search(a[1],a[2]);
		// let table=a[4](arr);
		send(200,arr);
	}
});
`);
	lwsd.done = true;



	$(window).on('beforeunload', function (e) {
		e.preventDefault();
		$('.qa').remove();
		saveDatas();
	});
	// $(window).on('unload',function(e){
	// 	e.preventDefault();
	// 	var msg='[Warning] Close the page?';
	// 	return msg;
	// });

	// 词典查找大法。长度截断渐进法。
	function lenSearch(str, dictArray) {
		let startTime = Date.now();
		let timeout = false;
		let rs = [];
		if (!dictArray) return rs;
		let i = 0, len = str.length, start = i, end = len, chunk, index = 0, re, b = false;

		while (true) {
			if ((Date.now() - startTime) > 2000) {
				timeout = true;
				break;
			}
			if (end === start) break;
			chunk = str.slice(start, end);

			// 寻找这个内容
			b = dictArray.some((e, i, a) => {
				if ((Date.now() - startTime) > 2000) {
					timeout = true;
					return true;
				}
				re = new RegExp('^' + Search._getRegExp(chunk) + '$', 'gi');
				if (re.test(e[0])) {
					index = i;
					start = end;
					end = len;
					return true;
				}
				return false;
			})

			if (timeout) {
				return [];
			} else if (b) {
				// 找到
				rs.push(dictArray[index]);
				// console.log('[has]',dict[index]);
				continue;
			}
			end--;
		}
		if (timeout) {
			return [];
		}
		return rs;
	}

	dict = new Reference([]);
	function addDict(a) {
		a = a || [];
		if (typeof dict === 'undefined') { dict = new Reference(a); pushlog('create dict') } else { dict.concat(a); pushlog('add dict'); }
		$('#dictArrayLengthUI').text(dict.array.length);
	}

	var lastEditTarget;

	var targetLang;
	// var asciiNospace=/[\x00-\x08\x0e-\x1f\x21-\x2b\x2d\x2f\x3a-\x9f\xa1-\xff]+|(\d[\x2c\x2e]?)+/g; //  ASCII范围内的 [^ \f\n\r\t\v,\.\d]  ,\x2c .\x2e
	var asciiNospace = /(\d[\x2c\x2e]?)+|[\x00-\x08\x0e-\x1f\x21-\x2b\x2d\x2f-\x9f\xa1-\xff]+/g; //  ASCII范围内的 [^ \f\n\r\t\v,\.\d]  ,\x2c .\x2e


	{
		//begin
		let f = $('#TMToolFile');
		let input = f.get(0);// <input>
		f.on('change', (e) => {
			let files, length, E, onloadCount = 0;
			files = input.files;
			length = files.length;// 文件数量
			E = new Event('loaddropfiles');// 创建事件实例
			E.files = files;// 加入文件
			E.datas = [];// 加入数据
			for (var i = 0; i < length; i++) {// 遍历文件
				let file = files.item(i);// 文件
				let filename = file.name;
				console.log('Loading...', filename);
				pushlog('Loading...', filename);
				if (!(/\.txt$/.test(filename))) {// 是否扩展名为.txt
					pushlog('No support the file type. ' + file.name + '(' + file.size + ')');// 不支持非.txt文件
					continue;
				}

				var fr = new FileReader();// 读文件数据
				fr.file = file;
				fr.name = filename;
				console.log('read', fr.name);
				fr.onload = function (e) {
					onloadCount++;
					let t = e.target;
					// E.datas['tmtoolfile_'+t.file.name] = t.result;
					// E.datas['tmtoolfile_'+t.file.name] = t.result;
					// E.datas['type'] = 'tmtool';
					// E.datas['filename'] = t.file.name;
					// console.log(t)
					E.datas.push({
						type: 'tmtool',
						name: t.name,
						data: t.result,
						file: t.file
					});
					if (onloadCount === length) f.value = '', window.dispatchEvent(E);// 读完后触发事件
				};
				fr.readAsText(file);
			}
		});
		$('#importTMToolFile').on('click', () => {
			f.click();
		});
		// end
	}


	{
		$(window).on('dragover', function (e) {
			e.preventDefault();
		});
		$(window).on('drop', function (e) {// drop file
			e.preventDefault();
			let files, length, E, onloadCount = 0;
			files = e.originalEvent.dataTransfer.files;// 被拖进的文件
			length = files.length;// 文件数量
			E = new Event('loaddropfiles');// 创建事件实例
			E.files = files;// 加入文件
			E.datas = [];// 加入数据
			for (var i = 0; i < length; i++) {// 遍历文件
				let file = files.item(i);// 文件
				let filename = file.name;
				console.log('Loading...', filename);
				pushlog('Loading...', filename);
				if (!(/\.txt$/.test(filename))) {// 是否扩展名为.txt
					pushlog('No support the file type. ' + file.name + '(' + file.size + ')');// 不支持非.txt文件
					continue;
				}

				var fr = new FileReader();// 读文件数据
				fr.file = file;
				fr.name = filename;
				console.log('read', fr.name);
				fr.onload = function (e) {
					console.log('load', fr.name)
					onloadCount++;
					let t = e.target;
					// E.datas['tmtoolfile_'+t.file.name] = t.result;
					// E.datas['tmtoolfile_'+t.file.name] = t.result;
					// E.datas['type'] = 'tmtool';
					// E.datas['filename'] = t.file.name;
					// console.log(t)
					E.datas.push({
						type: 'tmtool',
						name: t.name,
						data: t.result,
						file: t.file
					});
					if (onloadCount === length) window.dispatchEvent(E);// 读完后触发事件
				};
				fr.readAsText(file);
			}
		});

		// $('#dictDrop').on('drop');

		$('#dictPaste').on('paste', function (e) {
			e.preventDefault();

			var t = e.originalEvent.clipboardData.getData('text/plain').trim();
			var a = ao.stringToArray(t);
			a = a.filter(function (e) {
				return (e instanceof Array) && e[0] && e[1] && e[0].length && e[1].length;
			});
			addDict(a);
			console.log(dict)
			var oldDictArrayLength = dict.array ? dict.array.length : 0;
		});

		// let workPasting=false;
		$('#workPaste').on('paste', function (e) {
			e.preventDefault();
			pushlog('문서를 분석하고 있습니다');
			// if(workPasting) return ;
			// workPasting=true;
			let h = e.originalEvent.clipboardData.getData('text/html');
			if (h) {
				let _h = new DOMParser().parseFromString(h, 'application/xml');
				h = Array.from(_h.firstChild.querySelectorAll('tr')).map(tr => {
					return Array.from(tr.querySelectorAll('td')).map(td => {
						console.log(td.textContent)
						return td.textContent;
						return td.textContent.replace(/[\r\n]/gm, '\\n').repleace(/\t/gm, ' ');
					}).join('\t')
				}).join('\n');

				if (!h) {
					h = Array.from(_h.firstChild.querySelectorAll('p')).map(p => {
						return p.textContent.replace(/[\r\n]/gm, '\\n').repleace(/\t/gm, ' ');
					}).join('\n');

					if (!h) {
						h = Array.from(_h.firstChild.querySelectorAll('span')).map(span => {
							return span.textContent.replace(/[\r\n]/gm, '\\n').replace(/\t/gm, ' ');
						}).join('\n');
					} else {
						pushlog('WORD구조 감지');
					}
				} else {
					pushlog('HTML구조 감지');
				}
				pushlog('HTML구조 감지');
			}
			if (!h) h = e.originalEvent.clipboardData.getData('text/plain');
			if (h) {
				let a = ao.stringToArray(h);
				// console.log(a);
				a.forEach((e, i, a) => a[i] = e.filter(e => e));
				let maxLength = a.reduce((r, e) => Math.max(r, e.length), 0);
				a.forEach(e => {
					let l = maxLength - e.length;
					while (l > 0) {
						e.push('');
						l--;
					}
				});
				if (maxLength > 0) {
					// 粘贴1列的情况, 明显只有原文
					{
						let f = document.createDocumentFragment();
						let table = document.createElement('tbody');// tbody中无法再加入table
						table.style.border = 'none'
						table.style.outline = 'none'
						// let table = document.createElement('table');
						table.setAttribute('dataname', 'clipboard-' + new ObjectID().toString())
						f.appendChild(table);

						a.forEach((e, i) => {
							let tr = table.appendChild(document.createElement('tr'));
							let no = tr.appendChild(document.createElement('td'));
							no.classList.add('no');
							no.textContent = i + 1;
							let source = tr.appendChild(document.createElement('td'));
							source.classList.add('source');
							source.textContent = e[0];
							let target = tr.appendChild(document.createElement('td'));
							target.classList.add('target');
							target.contentEditable = 'plaintext-only';
							if (maxLength > 1) target.textContent = e[1];
							if (maxLength > 2) {
								let comment = tr.appendChild(document.createElement('td'));
								comment.classList.add('comment');
								comment.textContent = e.slice(2).join('\n');
							}
							if (e[0].trim().length === 0) tr.classList.add('emptyRow');
						});
						// console.log(table)
						document.getElementById('works').appendChild(f);
						delete f;
					}
					pushlog('번역내용 추가');


					let offset = $('#workPaste').offset();
					showTip({ text: '번역내용 추가', css: Object.assign({ background: '#ff0c' }, offset), animate: { top: Math.max(0, offset.top - 10) + 'px' }, delay: 1000 });
				}
			}
			// let p=new Promise((y,n)=>{
			// 	setTimeout(()=>{
			// 		if(t.length>0){
			// 			var a=ao.stringToArray(t);
			// 			if(a.length>0) {
			// 				// 粘贴1列的情况, 明显只有原文
			// 				if(a[0].length===1){
			// 					let time=Date.now();
			// 					a.forEach((e,i)=>{
			// 						let tr=$('<tr>')
			// 							.appendTo('#works')
			// 							.append($('<td>').addClass('no').text(i+1))
			// 							.append($('<td>').addClass('source').text(e[0]))
			// 							.append($('<td>').addClass('target').attr({'contenteditable':'plaintext-only'}))
			// 							.append($('<td>').addClass('comment').text(time))
			// 						if(e[0].trim().length===0) tr.addClass('emptyRow');
			// 					});

			// 					// a.forEach(function(e){
			// 					// 	return e.push('');
			// 					// });
			// 					// var table=ao.arrayToTable(a);

			// 					// $(table).attr({dataname:'wordpaste',datatype:'clipboard'});
			// 					// $('td:nth-child(1)',table).addClass('source');
			// 					// $('td:nth-child(2)',table).addClass('target').attr({'contenteditable':'plaintext-only'});
			// 					// $('tr',table).each(function(i,tr){
			// 					// 	$(tr).prepend($('<td class="no"></td>').text(i+1));
			// 					// });
			// 					// $('#works').append(table);
			// 				}else{
			// 					// 粘贴2列开始, 需要选择原文和译文列
			// 					let ms=maskScreen()
			// 					let ok=$('<button>').text('추가').click((e)=>{
			// 						let opt=[];
			// 						let control=$('#mask tr.control:first()').find('td').each((i,td)=>{
			// 							let o={}
			// 							$(td).find('input').each((_,input)=>{
			// 								o[input.name]=input.checked
			// 							})
			// 							opt[i]=o
			// 						});

			// 						let hasSource=opt.some(e=>e.source);
			// 						if(hasSource===false) return alert('소스 지정!');

			// 						let hasTarget=opt.some(e=>e.target);

			// 						$('#mask tr.control').remove();
			// 						opt.forEach((option,index)=>{
			// 							$('#mask tr').each((_,tr)=>{
			// 								let td=$(tr).find('td').eq(index);
			// 								if(option.source) {
			// 									td.addClass('source');
			// 									if(td.text().trim().length===0) tr.classList.add('emptyRow');
			// 								}
			// 								if(option.target) td.addClass('target').attr('contenteditable','plaintext-only');
			// 								if(option.edit) td.attr('contenteditable','plaintext-only')
			// 							});

			// 						})
			// 						if(!hasTarget) {
			// 							$('#mask td.source').after('<td class="target" contenteditable="plaintext-only">');
			// 						}

			// 						$('#mask tr').each((i,tr)=>{

			// 							$(tr).find('.target').detach().prependTo(tr)
			// 							$(tr).find('.source').detach().prependTo(tr)
			// 							$('<td class="no">').prependTo(tr).text(i+1)
			// 						})

			// 						$('#mask table').appendTo('#works');
			// 						$('#mask').empty().remove();
			// 					}).appendTo(ms).css({background:'#6fa',color:'030',width:'40%'})
			// 					let cancel=$('<button>').text('취소').click(()=>{
			// 						ms.empty().detach()
			// 					}).appendTo(ms).css({background:'#666',color:'#fff',width:'40%'})
			// 					let table=ao.arrayToTable(a);
			// 					let maxLength=get2DArrayMaxLength(a);
			// 					let tr=createControlTr(maxLength);
			// 					tr.prependTo(table);
			// 					ms.append(table)

			// 					// $(table).attr({dataname:'wordpaste',datatype:'clipboard'});
			// 					// $('td:nth-child(1)',table).addClass('source');
			// 					// $('td:nth-child(2)',table).addClass('target').attr({'contenteditable':'plaintext-only'});
			// 					// $('tr',table).each(function(i,tr){
			// 					// 	$(tr).prepend($('<td class="no"></td>').text(i+1));
			// 					// });
			// 					// $('#works').append(table);
			// 				}
			// 			}
			// 		}
			// 		console.log(a)
			// 		y();
			// 	});
			// });
			// p.then(()=>{
			// 	workPasting=false;
			// 	pushlog('[Finish] Pasted Missions!');
			// });
		});
		// $('#workPaste').on('keydown',function(e){
		// 	// ctrl+v
		// 	if(e.ctrlKey&&e.keyCode===86&& !e.altKey && !e.shiftKey && !e.metaKey) return true;
		// 	e.preventDefault();
		// });
		// $('#dictPaste').on('keydown',function(e){
		// 	// ctrl+v
		// 	if(e.ctrlKey&&e.keyCode===86&& !e.altKey && !e.shiftKey && !e.metaKey) return true;
		// 	e.preventDefault();
		// });


		$('#worksFontSize').on('keydown change input', changeWorksFontSize);

		// 查找内容
		let prevFocusTarget;
		$(document).on('focus', '#works .target', function (e) {
			clacWorksStatus()
			// 焦点太卡了。记录上一次的焦点吧。
			if (prevFocusTarget === e.target && $('#works td.target').length > 1) return false;
			prevFocusTarget = e.target;

			// 词典提示
			if ($('#useDictTip').prop('checked')) {
				// t: target text
				// a: dict search result
				// 

				let t = $(e.target).prev('.source').text().trim();
				let similarPercent = Number($('#similarPercent').val());


				{
					// 转移给worker执行
					// var a=dict.search(t,similarPercent);
					$('#tips').html('<strong style="color:blue;font-size:12px">검색 중입니다...</strong>');
					if (lwsd.done !== true) {
						lwsd.connect();
					}
					lwsd.target = e.target;
					lwsd.send(100, t, similarPercent, dict.array);
					lwsd.done = false;


				}



				{
					// 焦点,上方自动显示
					// var a=dict.search(t,similarPercent);
					$('#statusDict').html('<strong style="color:blue;font-size:12px">검색 중입니다...</strong>');
					if (lwsd2.done !== true) {
						lwsd2.connect();
					}
					lwsd2.target = $(e.target).parent().find('td.source').get(0);
					let text = lwsd2.target.textContent;

					// 搜索规则
					// 将内容中的标签去掉后搜索(1来自tmtool文件，2和3来自memoQ文件)
					// 1)	[99FFFF]...[-]   [99FFFF99]...[-]
					// 2)	{1>...<1}
					// 3)	<1>
					text = text.replace(/\[([a-z0-9]{6}|[a-z0-9]{8})\]([\s\S]+?)(\[-\])/gim, '$2');
					text = text.replace(/\{(\d+)>([\s\S]+?)<\1\}/gim, '$2');
					text = text.replace(/<\d+>/gim, '');

					// console.log(text);

					lwsd2.send(100, text, dict.array);
					lwsd2.done = false;
				}

				// 获取最后一个格子的大小尺寸位置
				// var last=$(e.target).parent().find('td:last()');
				// var offset = last.offset();
				// offset.width=last.width();
				// offset.height=last.height();
				// console.warn(offset)


				// 转移到localeWorker中
				// 提示内容
				// var table=ao.arrayToTable(a);
				// $('td:nth-child(4)',table).addClass('index');
				// $('td:nth-child(3)',table).addClass('similar');
				// $('td:nth-child(2)',table).attr({'contenteditable':'plaintext-only'}).addClass('target');
				// $('td:nth-child(1)',table).attr({'contenteditable':'plaintext-only'}).addClass('source');
				// $('tr',table).each(function(i,tr){
				// 	$(tr).prepend($('<td class="no"></td>').text(i+1));
				// });
				// $('#tips').html(table.innerHTML).prop('scrollTop',0);
				// // .css({position:'absolute',
				// // 	top:offset.top+offset.height+60+document.body.scrollTop,left:8});	
				// 	// left:offset.left+offset.width+document.body.scrollLeft});	
				// // 规则A：对于如果最后一个编辑的内容，不要采取自动插入。
				// if($('#auto100').prop('checked') && a && a[0] &&a[0][2]==100) {
				// 	$(this).text(a[0][1]).css({background:$('#ctrlEnterColor').val()});
				// }



				// 新型算法。长度渐进法 lenSearch()
				// let p=new Promise((y,n)=>{
				// 	setTimeout(n,2000);
				// 	let lenSearchRes=lenSearch(t, dict.array);
				// 	y(lenSearchRes);
				// });
				// p.then((v)=>{
				// 	if(v.length>0){
				// 		let res=v.map((e,i)=>{
				// 			let tr=$('<tr>');
				// 			$('<td class="no"></td>').text(i+1).appendTo(tr);
				// 			$('<td class="source"></td>').text(e[0]).appendTo(tr);
				// 			$('<td class="target"></td>').text(e[1]).appendTo(tr);
				// 			return tr;
				// 		})
				// 		console.log(res)
				// 		$('#statusDict').empty().append(res);
				// 	}
				// }).catch(()=>{console.warn('[timeout] lenSearch');})


			}

			// 显示谷歌等
			var g = $('#useNet').prop('checked'), n = $('#useNaver').prop('checked'), d = $('#useDaum').prop('checked');
			if (g) {
				let s = $(e.target).parent('tr').find('.source').text().trim();
				let t = $('#netTarget').val();
				if (s)
					gSearch(s, t);
			}

			// 当前行高亮显示
			$('#works tr').removeClass('currentEditRow');
			$(e.target).parent().addClass('currentEditRow');
		});


		// autoSizeDictWindow
		let uiTips = document.querySelector('#tips');
		$('#autoSizeDictWindow').click(e => {
			uiTips.style.height = uiTips.style.height ? '' : '20em';
		});


		// 全局按键侦听
		$(window).on('keydown', function (e) {
			if (e.keyCode === 19) {
				match100($('#works tr.currentEditRow'))
				return false
			}
			if (e.keyCode === 87 && e.ctrlKey) return e.preventDefault();

			if ($(e.target).is('.currentEditRow .target')) SM.lastTargetRange = undefined;
			if (e.keyCode === 87 && e.ctrlKey) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			} else if (e.keyCode === 113) {// 113:F2
				// 移动到未翻译内容td上
				e.preventDefault();
				// $('#gotoUntranslationTarget').trigger('click');
				{
					$('#works tr')
						.find('.target')
						.not('.hide')
						.not('.hide2')
						.not('.hide3')
						.not('.emptyRow')
						.not('.splitTarget')
						.not('.done')
						.not('.doneAutoNumber')
						.not('.doneAuto')
						.not('.doneSmart')
						.not('.doneAutoSpace')
						.eq(0)
						.focus()
				}
			} else if (e.keyCode === 114 && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {// 114:F3
				// 移动到未翻译内容td上
				e.preventDefault();
				$('#downloadWorkT').trigger('click');
			} else if (e.keyCode === 112) {// 112:F1
				// 自动匹配100%内容
				e.preventDefault();
				var event = {
					type: 'click',
					ctrlKey: e.ctrlKey,
					altKey: e.altKey,
					shiftKey: e.shiftKey,
					metaKey: e.metaKey
				};
				$('#MatchWork100').trigger(event);
				pushlog('Automatically enter to translate content.');
			} else if (e.code === 'ControlRight' && !e.repeat) {// 
				console.log(e.code)
				let t = $(e.target)
				let s = t.prev('.source')
				if (t.is('#works .target')) {
					e.preventDefault()
					let rs = cnEncode(s.text(), getTips())
					if (rs.t) return t.text(rs.t)

					let _red = red()
					collector(_red)
					rs = cnEncode(s.text(), collector.r)
					if (rs.t) return t.text(rs.t)

					rs = undefined
					let dmp = new diff_match_patch()
					_red.filter(e => e.similar > 80).map(e => {
						let diff = dmp.diff_main(e.source, s.text()).filter(diff => diff[0] !== 0)
						if (diff.length === 2) {
							let search, replace
							diff.forEach(e => {
								if (e[0] === -1) search = e[1]
								if (e[0] === 1) replace = e[1]
							})
							console.log(e.target, e.search, replace)
							collector.r.forEach(e2 => {
								if (e2[0] === search) {
									let v = e.target.replace(search, replace)
									if (!rs) rs = v
									else if (rs === v) return rs
								}
							})
							if (rs) {
								pushlog('^ ^')
								return t.text(rs)
							}
						}
					})
				}
			} else if (e.keyCode === 192 && e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {// Alt＋`  逐个词典匹配
				e.preventDefault();
				var v = '';
				var t = $(e.target);
				t = $(t);
				if (t.is('#works td.source')) {
					var source = t;
					var target = t.next('td.target');
					var sourceText = source.text();
					var arr = sourceText.split(/\s+/g)
					arr.forEach(function (text) {
						v = dict.search(text, 100)[0];
						v = (v === undefined ? text : v[1]);
						target.text(target.text() + v);
						pushlog(v);
					});
				} else if (t.is('#works td.target')) {
					var target = t;
					var source = target.prev('td.source');
					var sourceText = source.text();
					var arr = sourceText.split(/\s+/g);
					arr.forEach(function (text) {
						v = dict.search(text, 100)[0];
						v = (v === undefined ? text : v[1]);
						target.text(target.text() + v);
						pushlog(v);
					});
				}
			} else if (e.keyCode === 117) {
				// 117:F6
				e.preventDefault();
				mergeSplits()
			} else if (e.keyCode === 119) {
				// 119:F8
				e.preventDefault();
				// 改变功能为切割长文章
				let tar = $(e.target);
				if (tar.is('#works .currentEditRow .target') && !tar.is('.split')) {
					if (e.ctrlKey) {
						// 合并
						mergeSplits()
					} else if (e.altKey) {
						$('#works .target').each((i, e) => {
							splitLong(e)
						})
					} else {
						// 分解长文
						splitLong(tar)
					}
				}

				// {
				// 			let tar=$('#works .currentEditRow .target')
				// 				let p=tar.parent();
				// 				let s=p.find('.source');
				// 				let st=s.text();
				// 				let t=tar;
				// 				let tt=t.text();

				// 				let re=/(?=(?!\d)\.)|\{\\r\\n\}|\\n/g;
				// let arr=[];
				// let i=0;
				// let r=st.replace(re,function(...a){
				//   //console.log(a);
				//   let aLastIndex=a.length-1;
				//   let aIndex=aLastIndex-1;
				//   let index=a[aIndex];
				//   let str=a[aLastIndex];
				//   i=index+a[0].length;
				//   let c=str.slice(i,index);
				//   console.log(index,i, c,str);
				//   return str.slice(i,index);
				// });

				// //console.log(r);

				// }
				// e.preventDefault();
				// var s=window.getSelection().toString();
				// if(!s.trim()) return $('#googleResult').text('No selected content.');
				// var g=$('#useNet').prop('checked'),n=$('#useNaver').prop('checked'),d=$('#useDaum').prop('checked');
				// // if(g||n||d){
				// 	var s=lastSourceSelectionText;
				// 	if(s && s.trim()){
				// 		var t=$('#netTarget').val();
				// 		function net(n,s,t){
				// 			if(net.count===undefined) net.count=0;
				// 			net.count++;
				// 			$('#'+n+'Result').text('Loading...('+net.count+')');
				// 			this[n](s,t,function(o){
				// 				$('#'+n+'Result').text(o.error||o.result.join('\n'));
				// 			});
				// 		}
				// 		net('google', s,t);
				// 		// net('naver',  s,t);
				// 		// net('daum',   s,t);
				// 	}
				// // }
			} else if (e.ctrlKey && e.keyCode === 81 && !e.shiftKey && !e.altKey && !e.metaKey) {
				// Enter，ctrl+Q，ctrl+S 来保存到词库
				e.preventDefault();
				let lsst = $('#lsst');
				let stst = $('#ltst');
				let lsstt = lsst.text().trim();
				let ststt = stst.text().trim();

				if (lsstt && ststt) {
					// 保存
					var l = dict.array.length;
					dict.add(lsstt, ststt);
					let rect, rect2;

					rect = lsst.offset();
					rect2 = $('#dictArrayLengthUI').offset();
					showTip({
						text: lsstt,
						css: { background: '#f00', color: '#fff' },
						x: rect.left, y: rect.top,
						animate: [{ left: rect.left - 10 }, { left: rect2.left, top: rect2.top, opacity: 0 }]
					});

					rect = stst.offset();
					showTip({
						text: ststt,
						css: { background: '#f00', color: '#fff' },
						x: rect.left, y: rect.top,
						animate: [{ left: rect.left - 10 }, { left: rect2.left, top: rect2.top, opacity: 0 }]
					});
				} else {
					pushlog('[Warning] Need content.');
				}
			} else if (e.keyCode === 68 && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
				//ctrl+shift+d  复制上面.target的内容
				e.preventDefault();
				var c = $(document.activeElement);
				s = c.parent().prevAll().not('.hide,.hide2').first().find(Array.prototype.map.call(document.activeElement.classList, function (e) { return '.' + e; }).join(' '));
				if (s.length) {
					c.text(c.text() + s.text());
					pushlog('Copy: ' + s.text());
				} else {
					pushlog('No copy.');
				}
			} else if (e.keyCode === 83 && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
				//ctrl+s 保存内容
				e.preventDefault();
				saveDatas();

				try {
					pushlog('[Save]', dict.array.length);
				} catch (err) {
					pushlog('[Error]', err.message);
				}
			}
		});

		$(document).on('keydown', '.target', function (e) {

			// 忽略Ctrl键自身反复触发，有什么用？下面又没有Ctrl自身的命令
			// if (e.ctrlKey && (e.keyCode === 17) && e.repeat) return ;

			// 在译文格子中按下回车键时的处理。
			if (e.keyCode === 13) {
				e.preventDefault();

				// Enter 提交数据，并跳转下一行。
				let current;
				let tar = $(e.target);
				let p = tar.parent();

				// 当译文格子中没有有效文字内容时，不做任何处理。
				if (tar.text().trim().length === 0) {
					return pushlog('번역내용을 입력해 주세요!');
				}

				// 译文格子分为工作区和记忆区两大类。
				// 先从记忆区看起。记忆区有蓝色记忆和红色记忆。蓝色statusDict，红色tips
				if ($(tar).is('#statusDict td.target, #tips td.target')) {
					// 由于旧版本的记忆没有唯一识别ID，修改删除操作不会实时反应到用户界面中。
					// 编辑红蓝记忆区时,将相反的区域清除,以免记忆残留处理不当
					if ($(tar).is('#tips td.target')) {
						$('#statusDict').empty();
					} else if ($(tar).is('#statusDict td.target')) {
						$('#tips').empty();
					}

					// var no=$('.no',p);
					// no.animate({backgroundColor:$('#ctrlEnterColor').val()});
					tar.addClass('done');
					let s = $('.source', p);
					let t = $('.target', p);
					s = s.text().trim();
					t = t.text().trim();
					// s或t的值为空，则跳到下一个。
					if (s.length === 0 || t.length === 0) {
						// return p.next().find('.target').focus();
						// console.log('next')
						current = p.nextAll().not('.hide,.hide1,.hide2,.emptyRow').find('td.target');
						if (e.ctrlKey) {
							current = current.not('.done,.doneAuto,.doneAutoSpace,.doneAutoNumber');
						}
						current = current.eq(0);
						if (current.length > 0) {
							current.focus();
						} else {
							current = current.parent();
							if (current.is('#works table')) {
								current = current.next();
								if (current.is('#works table')) {
									console.log('穿越了下一个table');
									current.find('.target').not('.hide,.hide1,.hide2,.emptyRow');
									if (e.ctrlKey) {
										current = current.not('.done,.doneAuto,.doneAutoSpace,.doneAutoNumber');
									}
									current = current.eq(0);
									current.focus();
								} else {
									console.log('没有找到下一个格子');
								}
							}
						}
						return;
					}
					let i = $('td:last()', p).text().trim();
					if (dict.array[i]) {
						var l = dict.array.length;
						dict.array[i][0] = s;
						dict.array[i][1] = t;
						dict.from(dict.array);
						pushloghtml($('<p>').append($('<h6>').text('[+]')).append($('<span>').text(s)).append($('<br>')).append($('<p>').text(t)));
					}

					// ctrl+enter 换色
					// var t=$(e.target);
					// if($('#ctrlEnter').prop('checked')){
					// 	t.animate({background:$('#ctrlEnterColor').val()});
					// }
				} else {
					// var no=$('.no',p);
					// no.animate({backgroundColor:$('#ctrlEnterColor').val()},function(){no.removeAttr('style');});
					var s = $('.source', p);
					var t = $('.target', p);
					t = t.text().trim().replace(/\{\\r\\n\}/g, '\\n');
					s = s.text().trim().replace(/\{\\r\\n\}/g, '\\n');
					var l = dict.array.length;
					dict.array.push([s, t]);
					dict.from(dict.array);
					pushloghtml($('<p>').append($('<h6>').text('[+]')).append($('<span>').text(s)).append($('<br>')).append($('<p>').text(t)));
					// ctrl+enter 换色
					// var t=$(e.target);
					// if($('#ctrlEnter').prop('checked')){
					// 	t.css({background:$('#ctrlEnterColor').val()})
					// }
					// 改变状态为已完成
					tar.removeClass('done doneAuto doneAutoSpace doneAutoNumber doneSmart').addClass('done');

					{// 检查数值是否正确
						let b = numCheck(s, t);
						if (!b.done) {
							if (b.sa.length !== 0 || b.ta.length !== 0) {
								// console.log(b);
								p.addClass('error');
								let tip = p.find('.tip');
								if (tip.length === 0) tip = $('<td class="tip"><span class="sd"></span><span class="td"></span></td>').appendTo(p).css({
									color: '#ff0',
									display: 'grid',
									'grid-template-columns': '1fr 1fr',
								});
								setTimeout(() => {
									tip.remove();
									p.removeClass('error');
								}, 5000);
								let sd = tip.find('.sd').empty().css({ minWidth: '10px' });
								let td = tip.find('.td').empty().css({ minWidth: '10px' });
								b.sa.forEach(e => $('<span>').css({ background: '#f00', margin: '1px' }).text(e).appendTo(sd));
								b.ta.forEach(e => $('<span>').css({ background: '#00f', margin: '1px' }).text(e).appendTo(td));
							}
						}
					}
				}

				// 按下Enter键时，跳转到下一个格子。如果同时按下Ctrl键，则略过各种完成状态的格子。
				// current = p.nextAll().not('.hide,.hide1,.hide2,.emptyRow').find('td.target');
				current = p.nextAll().not('.hide,.hide1,.hide2,.emptyRow').filter((i, e) => e.style.display !== 'none').find('td.target').not('.splitTarget');
				if (e.ctrlKey) {
					current = current.not('.done,.doneAuto,.doneAutoSpace,.doneAutoNumber');// 略过各种完成状态
				}
				current.eq(0).focus();


				// saveDatas();// 直接保存太卡，需要缓一缓了。问题很严重。
				// 延迟时间保存
				if (typeof window.privateTimeout === 'number') {
					clearTimeout(window.privateTimeout);
					window.privateTimeout = setTimeout(() => {
						saveDatas();
					}, 1000);
				}

			} else if (e.ctrlKey) {
				// Ctrl + Ins 键，将原文复制到译文格子中。
				if (e.keyCode === 45) {// <insert>
					var t = $(e.target);
					if (t.is('#works .target')) {
						SM.text = t.parent().find('.source').text();
					}
				}
			}
			// else if(e.shiftKey){
			// 	e.preventDefault();
			// 		// shift键 
			// 		let key=parseInt(e.key);
			// 		switch(e.key) {
			// 			case '1':
			// 			case '2':
			// 			case '3':
			// 			case '4':
			// 			case '5':
			// 			case '6':
			// 			case '7':
			// 			case '8':
			// 			case '9':{
			// 				key=parseInt(e.key)-1;
			// 			}
			// 			case '0':{
			// 				key=9;
			// 			}
			// 			case '`':{
			// 				key=0;
			// 			}
			// 			default:{
			// 				e.preventDefault();
			// 				var target=$(e.target);
			// 				var sourceText=target.prev('.source').text().trim();
			// 				var tr=$('#tips').find('tr').eq(key);
			// 				var s=tr.find('.source').text().trim();
			// 				var t=tr.find('.target').text().trim();
			// 				var v=smartMatch(sourceText, [s,t]);
			// 				target.append(v);// ctrl+num
			// 				console.log(key)
			// 				// console.log(v)
			// 				// console.log(target,v)
			// 				// replaceTD(t);
			// 				return ;
			// 			}
			// 		}
			// }
			else if (e.keyCode === 27) {
				//esc
				$('#tips').empty();
				$('#statusDict').empty();
				$('.tipSelect').remove();
			}
		});


		// 锁定未翻译目标
		$('#gotoUntranslationTarget').click(function (e) {
			nextEmptyTarget(e.ctrlKey);
			// let ts=$('#works .target:empty()');
			// let t=ts.eq(0).trigger('focus');
			// if(ts.length){
			// 	var w=$('#works');
			// 	w.prop('scrollTop', t.prop('offsetTop')-w.prop('offsetTop')-10);

			// 	let countChar=0;
			// 	let countRow=ts.each((_,e)=>{
			// 		countChar+=$(e).prev('td.source').text().length;
			// 	}).length;
			// 	pushlog('No translated item is '+countRow+'ea('+countChar+'byte).');

			// }else{
			// 	pushlog('No target... ^ ^');
			// }
			// delete ts,t;
		});

		// 下载词库
		$('#downloadDict').click(function () {
			try {
				dict.array.forEach(function (e) {
					e.forEach(function (v, i, a) {
						a[i] = String(v).trim().replace(/\r|\n|\{\\r\\n\}/g, '\\n');
					});
				});
			} catch (_) {
				dict = new Reference(ao.ls.get('dict') || []);
				dict.array.forEach(function (e) {
					e.forEach(function (v, i, a) {
						a[i] = String(v).trim().replace(/\r|\n|\{\\r\\n\}/g, '\\n');
					});
				});
			}
			dict.from(dict.array);
			downloadFile('dict', ao.arrayToString(dict.array));
		});
		$('#downloadDictXLS').click(function () {
			let fn = formatName(location.search) + '_dict_' + Date.now() + '.xls';
			let sheet = XLSX.utils.aoa_to_sheet(dict.array);
			let html = XLSX.utils.sheet_to_html(sheet);
			let table = $(html).filter('table').get(0)
			let wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
			XLSX.writeFile(wb, fn);
		});

		// 提交所有翻译内容
		$('#mergeDict').on('click', function (e) {
			if (confirm('[Warning] Are you sure you want to overwrite your work with dict?')) {
				// $('#useDictTip').add('#useNet').add('#useNaver').add('#useDaum').prop('checked',false);
				// $('#works td.target:not(:empty())').trigger({type:'keydown',keyCode:13,ctrlKey:true});
				// $('#useDictTip').prop('checked',true);
				$('#works tr').each((i, e) => {
					let source = $(e).find('.source').text().trim();
					let target = $(e).find('.target').text().trim();
					if (source && target) {
						// 保存
						dict.add(source, target);

						pushloghtml($('<p>').append($('<h6>').text('[+]')).append($('<p>').text(source)).append($('<p>').text(target)))
					}
				});
			}
		});

		// 下载任务
		$('#downloadWorksExcel').on('click', function (e) {
			showTip('잠시만 기다려 주십시오.(최대 30초 대기)');
			var fn = formatName(location.search) + '_works_' + Date.now() + '.xls';
			doit($('#works').get(0), fn, 'xls');
		});
		$('#downloadWork').click(function (e) {
			showTip('잠시만 기다려 주십시오.(최대 30초 대기)');
			let
				ctrl = e.ctrlKey,
				shift = e.shiftKey,
				alt = e.altKey,
				meta = e.metaKey;

			$('#works tbody[dataname]').each(function (_, tbody) {
				let r = [], hasTextKey = false;
				if ($('td.textKey').length) r.push('[FieldNames]\nTextKey\tText\tComment\n[Table]');

				$('tr', tbody).clone().find('td.no').remove().end().each(function (i, tr) {
					var k = $('td.textKey', tr);
					var c = $('td.targetComment', tr).text().trim();
					var row = [];
					if (k.length) {
						hasTextKey = true;
						var t = $('td.target', tr);
						row.push(k.get(0).textContent.trim());
						row.push(t.get(0).textContent.trim());
						if (ctrl) {
							// empty comment add datetime
							if (!Boolean(c)) c = new Date().toISOString();
						} else if (shift) {
							// all comment replace datetime
							c = new Date().toISOString();
						}
						row.push(c);
						r.push(row.join('\t'));
					} else {
						var row = [];
						$('td', tr).each(function (i, td) {
							row.push(td.textContent.trim());
						});
						r.push(row.join('\t'));
					}
				});

				let name = tbody.getAttribute('dataname')
				var data = r.join('\n')

				// 直接下载，以前不会下载
				if (hasTextKey) {
					// downloadFileUcs2(name + 'work', data);
					downloadFileUcs2(name, data);
				} else {
					downloadFile(name, data);
				}
			});
		});


		$('#downloadWorkT').click(function (e) {
			let rs = $('#works td.target').toArray().map(td => td.textContent).join('\n')
			console.log(rs)

			let data;
			var r = [], ctrl = e.ctrlKey, shift = e.shiftKey, alt = e.altKey, meta = e.metaKey;
			dict.array.forEach(function (e) {
				e.forEach(function (v, i, a) {
					a[i] = String(v).trim();
				});
			});
			$('#works td.target').each(function (i, td) {
				r.push(td.textContent.trim());
			});
			// var table=$('<table>').append($('#works').find('tr').clone()).get(0);
			// console.log(table);

			if (ctrl || shift || meta) {
				downloadFile('work-t', data);
				return;
			}

			if (alt) {
				r = r.filter(function (e) { return e.length > 0; });
			}
			data = r.join('\n');
			copyToTempResult(data);
		});

		// 清空任务
		$('#clearWork').click(function (e) {
			$('#works').empty();
			$('#tips').empty();

			let { x, y, height } = e.target.getBoundingClientRect();
			y = Math.max(y - height, 0);
			showTip({ text: '삭제완료', x, y, animate: { top: Math.max(y - 10, 0) }, delay: 1000 });
		});
		// 清空任务
		$('#clearDict').click(function () {
			if (confirm('Warning! Delete the dictionary?')) {
				$('#tips').empty();
				$('#downloadDict').trigger('click');
				setTimeout(function () {
					window.dictarray0 = dict.array;
					pushlog('번역기록이 전부 삭제 되었습니다.');
					dict.array.length = 0;
					$('#works tr .target').removeAttr('style').removeClass('done');
					$('#dictArrayLengthUI').text(dict.array.length);
					saveDatas();
				}, 100);
			}
		});


		// 选择任务
		$('#selectWorks').click(function () {
			var s = window.getSelection();
			s.removeAllRanges();
			s.selectAllChildren($('#works').get(0));
			document.execCommand('copy', true);
		})

		// 过滤词典
		function myFilter(id, cls) {
			var _cls = cls.slice(0, 1).toUpperCase() + cls.slice(1).toLowerCase();
			$('#' + id + _cls + 'Filter').on('input', function (e) {
				var tar = e.target, v = tar.value;
				if (v.length > 0) {
					$('#' + id).find('.' + cls).each(function (i, e) {
						var regexp = Search.getRegExp(v, 'gim', $('#' + id + _cls + 'RegExp').prop('checked'));
						if (regexp.test(e.textContent)) {
							$(e).parent().removeClass('hide');
						} else {
							$(e).parent().addClass('hide')
						}
					});
				} else {
					$('#' + id).find('.' + cls).parent().removeClass('hide hide2');
				}
			});
		}

		myFilter('statusDict', 'source');
		myFilter('statusDict', 'target');
		myFilter('works', 'source');
		myFilter('works', 'target');
		myFilter('tips', 'source');
		myFilter('tips', 'target');

		function mySearch(id, cls) {
			var _cls = cls.slice(0, 1).toUpperCase() + cls.slice(1).toLowerCase();
			$('#' + id + _cls + 'Search').on('input', function (e) {
				var t = e.target, v = t.value;
				if (v.length > 0) {
					$('#' + id).find('.' + cls).each(function (i, e) {
						if (e.textContent.indexOf(v) > -1) {
							$(e).parent().removeClass('hide2');
						} else {
							$(e).parent().addClass('hide2')
						}
					});
				} else {
					$('#' + id).find('tr').removeClass('hide2');
				}
			});
		}

		mySearch('statusDict', 'source');
		mySearch('statusDict', 'target');
		mySearch('works', 'source');
		mySearch('works', 'target');
		mySearch('tips', 'source');
		mySearch('tips', 'target');

		function myReplace(id, cls) {
			let _cls = cls.slice(0, 1).toUpperCase() + cls.slice(1).toLowerCase();
			$('#' + id + _cls + 'Replace').on('keydown', function (e) {
				if (e.keyCode === 13 && confirm('검색내용을 바꿈내용으로 전환합니다. 전환 후, 하나씩 <Enter>키로 저장해야 합니다!')) {
					e.preventDefault();
					let s = $('#' + id + _cls + 'Search').val();
					let r = $('#' + id + _cls + 'Replace').val();

					// 过滤替换
					$('#' + id + ' tr:not(.hide,.hide2) td.' + cls).each(function (i, e) {
						e.textContent = textRE.replace(e.textContent, s, r);
						$(e).addClass('')
					});
					setTimeout(function () {
						$('#useDictTip').prop('checked', false)
						$('#' + id + _cls + 'Search,#' + id + _cls + 'Replace').val('');

					});
				}
			});
		}

		myReplace('statusDict', 'source');
		myReplace('statusDict', 'target');
		myReplace('works', 'source');
		myReplace('works', 'target');
		myReplace('tips', 'source');
		myReplace('tips', 'target');


		$('#tipsSourceFilterAll').on('change', function (e) {
			var id = '#tips';
			$(id).empty();
			var v = e.target.value;
			if (v.length > 0) {
				var regexp = Search.getRegExp(v, 'gim', $(id + 'SourceRegExp').prop('checked'));
				console.log(regexp);
				var a = dict.array, i = a.length, e, tr, s, t, m, count = 1;
				while (true) {
					if (--i === -1) break;
					regexp.lastIndex = undefined;
					e = a[i];
					if (e) {
						s = e[0];
						t = e[1];
						if (s && t) {
							m = regexp.test(s);
							if (m) {
								regexp.lastIndex = undefined;
								no = $('<td class="no"></td>').text(count++);
								m = $('<td class="match"></td>').text(Array.from(s.match(regexp)).join('\n'));
								s = $('<td class="source" contenteditable="plaintext-only"></td>').text(s);
								t = $('<td class="target" contenteditable="plaintext-only"></td>').text(t);
								$('<tr>')
									.append(no)
									.append(s)
									.append(t)
									.append(m)
									.append($('<td class="index"></td>').text(i))
									.appendTo(id);
								regexp.lastIndex = undefined;
								console.log()
							}
						} else {
							a.splice(i, 1);
						}
					} else {
						a.splice(i, 1);
					}
				}
			} else {
				$(id).empty();
			}
		});

		$('#tipsTargetFilterAll').on('change', function (e) {
			var id = '#tips';
			$(id).empty();
			var v = e.target.value;
			if (v.length > 0) {
				var regexp = Search.getRegExp(v, 'gim', $(id + 'TargetRegExp').prop('checked'));
				console.log(regexp);
				var a = dict.array, i = a.length, e, tr, s, t, m, count = 0;
				while (true) {
					if (--i === -1) break;
					regexp.lastIndex = undefined;
					e = a[i];
					if (e) {
						s = e[0];
						t = e[1];
						if (s && t) {
							m = regexp.test(t);
							if (m) {
								regexp.lastIndex = undefined;
								no = $('<td class="no"></td>').text(count++);
								m = $('<td class="match"></td>').text(Array.from(t.match(regexp)).join('\n'));
								s = $('<td class="source" contenteditable="plaintext-only"></td>').text(s);
								t = $('<td class="target" contenteditable="plaintext-only"></td>').text(t);
								$('<tr>')
									.append(no)
									.append(s)
									.append(t)
									.append(m)
									.append($('<td class="index"></td>').text(i))
									.appendTo(id);
								regexp.lastIndex = undefined;
								console.log()
							}
						} else {
							a.splice(i, 1);
						}
					} else {
						a.splice(i, 1);
					}
				}
			} else {
				$(id).empty();
			}
		});

		// if(dict && dict.array) pushlog('Update Dictionary: '+dict.array+length+'ea');

		$('#useDictTip').on('click', function (e) {
			if (e.target.checked === false) {
				$('#tips').empty();
				$('#statusDict').empty();
			}
		});


		// 需要从记录中全文匹配，如果没有则智能匹配。auto100
		$('#MatchWork100').click(function (clickEvent) {
			clickEvent.preventDefault();
			match100()
		});
		$('#hideDone').click(function (clickEvent) {
			clickEvent.preventDefault();
			hideDone()
		});

		// ____________________________________________________


		let isNumQA = false;
		$('#numQA').click(function (e) {
			if (isNumQA) {
				$('#works tr').not('.emptyRow').removeClass('hide hide2 hide3').find('td.qa').remove();
				isNumQA = false;
				return;
			}
			isNumQA = true;

			// Number QA 核心算法 --start
			function numberQA(s, t) {
				let r = /[-+]?\d{1,3}((,?)\d{3})?(\.\d+)?[%]?/gmi

				s = s.match(r) || [];
				t = t.match(r) || [];

				return arrayDiff(s, t);
			}
			function arrayDiff(a, b) {
				let _a = [], _b = [];
				a.forEach((e, i) => {
					if (b.indexOf(e) === -1) {
						_a.push({ value: e, index: i });
					}
				});
				b.forEach((e, i) => {
					if (a.indexOf(e) === -1) {
						_b.push({ value: e, index: i });
					}
				});

				let ok = true, _al = _a.length, _bl = _b.length;
				if (_al === _bl) {
					if (a.join('\x02') !== b.join('\x02')) {
						ok = false;
					}
				} else {
					ok = false;
				}
				return { arr1: a, arr2: b, diff1: _a, diff2: _b, ok };
			}
			// Number QA 核心算法 --start

			$('#works td.qa').remove();
			$('#numQA').prop('running', !$('#numQA').prop('running'))
			if (!$('#numQA').prop('running')) {
				$('#worksTargetFilter').val('').trigger('input');
				$('#useDictTip').prop('checked', true);
				$('#numQA').css('boxShadow', '');
				return;
			}

			$('#numQA').css('boxShadow', '0 0 4px #F0F');
			$('#useDictTip').prop('checked', false);

			$('#worksTargetFilter').val('숫자QA');
			var count = 0;
			$('#works tr').removeClass('hide,hide1,hide2');
			$('#works tr').not('.emptyRow').each(function (i, tr) {
				var qa = $(tr).find('.qa');
				if (qa.length === 0) {
					qa = $('<td class="qa">').appendTo(tr);
				}

				var source = $(tr).find('td.source').eq(0).text() || '';
				var target = $(tr).find('td.target').eq(0).text() || '';

				let result = numberQA(source, target);
				if (result.ok) {
					$(tr).addClass('hide');
				} else {
					let table = $('<table>').appendTo(qa);
					for (let i = 0, len = Math.max(result.arr1.length, result.arr2.length); i < len; i++) {
						let tr = $('<tr>').appendTo(table);
						let s = result.arr1[i];
						let t = result.arr2[i];
						tr.append($('<td>').text(s || '').css({ textAlign: 'right' }).addClass('qa-index-' + i));
						tr.append($('<td>').text(t || '').addClass('qa-index-' + i));
						if (s !== t) tr.css({ color: '#f00', fontWeight: 'bold' });
					}
					result.diff1.forEach(e => {
						table.find('td.qa-index-' + e.index).eq(0).css({ background: '#ff0' });
					});
					result.diff2.forEach(e => {
						table.find('td.qa-index-' + e.index).eq(1).css({ background: '#ff0' });
					});
				}

				// var s,t,sm,tm;
				// sm=source.match(asciiNospace);
				// s=sm ? Array.from(sm) : [];


				// tm=target.match(asciiNospace);
				// t=tm ? Array.from(tm) : [];
				// if(s.join('').split('').sort().join('')===t.join('').split('').sort().join('')) return ;

				// if(s.length!==t.length){

				// 	// $(tr).find('td.target').css('background','#f96');
				// 	count++;
				// 	if(s) {
				// 		let _s=$('<p>').css({borderBottom:'1px solid #900',paddingBottom:2}).appendTo(qa);
				// 		for(let i=0, len=s.length, v; i<len; i++){
				// 			$('<span>').css({borderBottom:'1px solid #900',paddingBottom:2}).text(s[i]).appendTo(_s);
				// 		}
				// 	}
				// 	if(t) {
				// 		let _t=$('<p>').css({borderBottom:'1px solid #900',paddingBottom:2}).appendTo(qa);
				// 		for(let i=0, len=t.length, v; i<len; i++){
				// 			$('<span>').css({borderBottom:'1px solid #900',paddingBottom:2}).text(t[i]).appendTo(_t);
				// 		}
				// 	}
				// 	qa.css('background','#fdd');
				// }else{
				// 	var resplan='B';
				// 	s.sort();
				// 	t.sort();
				// 	// $(tr).find('td.target').css('background','#f69');
				// 	if(s) {
				// 		let _s=$('<p>').css({borderBottom:'1px solid #900',paddingBottom:2}).appendTo(qa);
				// 		for(let i=0, len=s.length, v; i<len; i++){
				// 			$('<span>').css({borderBottom:'1px solid #900',paddingBottom:2}).text(s[i]).appendTo(_s);
				// 		}
				// 	}
				// 	if(t) {
				// 		let _t=$('<p>').css({borderBottom:'1px solid #900',paddingBottom:2}).appendTo(qa);
				// 		for(let i=0, len=t.length, v; i<len; i++){
				// 			$('<span>').css({borderBottom:'1px solid #900',paddingBottom:2}).text(t[i]).appendTo(_t);
				// 		}
				// 	}
				// 	if(s.join('').split('').sort().join('')===t.join('').split('').sort().join('')) {
				// 		resplan='C';
				// 		// $(tr).find('td.target').css('background','#ff9');
				// 		return qa.css('background','#ffd');
				// 	}
				// 	qa.css('background','#fee');
				// 	count++;

				// }
			});
			$('#works td.qa:empty()').parent().addClass('hide');
			if (count) pushlog('🍀', 'Found numeric mismatchs, ' + count + 'ea, Good luck!');
			else pushlog('☘', 'Did not find numeric mismatchs.');
		});

		$('#dictQA').on('click', function () {
			$('#worksTargetFilter').val('dictQA');
			var tmpDict = filterDict();

			$('#works tr').each(function (_, tr) {
				var qa = $(tr).find('.qa');
				if (qa.length === 0) {
					qa = $('<td class="qa">').appendTo(tr);
				}
				var qars = [];
				var s = $(tr).find('.source');
				var t = $(tr).find('.target');

				tmpDict.forEach(function (e, i) {
					// **** qa ddb
					var ds = e[0], dt = e[1];
					if (Search.getRegExp(ds).test(s.text())) {
						if (!Search.getRegExp(dt).test(t.text())) {
							qars.push($('<li>').text(ds + '👁' + dt).get(0).outerHTML);
						}
					}
				});
				qa.html('<ol>' + qars.join('') + '</ol>');
			});
		});


		// import text lines
		$('#ImportTextLines').click(function (e) {
			var str;
			var arr;
			var target;
			var div = $("<div>").css({
				position: "fixed",
				top: 0,
				width: "40%",
				right: 10,
				bottom: 10,
				border: "2px solid blue",
				padding: 24,
				background: "rgba(0,0,0,0.5)",
				zIndex: 99999999999
			}).appendTo("body");
			var msg = $("<h5>").text("use lines...").css({
				"background": "rgba(255,255,255,0.9)",
				"font-weight": "bold"
			}).appendTo(div);
			var ok = $("<button>").text("done").on("click",
				function () {
					str = ta.val().trim();
					arr = str.split("\n");
					ta.remove();
					ok.remove();
					msg.text("Please thouch <down> key").appendTo(div);
					$(document).on("keydown", ".target", doWork);
					div.css({
						width: 200,
						height: 200,
						top: 0,
						right: 10
					})
				}).appendTo(div);
			var ng = $("<button>").text("cancel").on("click",
				function () {
					div.remove();
					$(document).off("keydown", doWork)
				}).appendTo(div);
			div.append("<br>");
			var ta = $("<textarea>").appendTo(div).css({
				width: "100%",
				height: window.innerHeight / 2
			});
			function doWork(e) {
				if (e.keyCode !== 40) {
					return
				}
				var v = arr.shift();
				if (v) {
					e.preventDefault();
					e.target.textContent = v;
					$(e.target).parent().nextAll().not('.hide,hide1,.hide2,.hide3,.hide4').eq(0).find('.target').focus();
					msg.text(arr.length + "ea");
					if (arr.length === 0) {
						msg.text("complete.").appendTo(div).css({
							background: "rgba(0,255,0,0.2)"
						});
						$(document).off("keydown", doWork);
						div.remove();
					}
				}
			}
		});


		// 查找替换按钮
		function activeSRButton(id) {
			$('#' + id).on('click', function (e) {
				if (!confirm('Are you sure you want to replace?')) return false;

				var id = e.target.getAttribute('id').replace('Button', '');
				if (id) {
					$('#' + id).trigger({ type: 'keydown', keyCode: 13 });
					console.log(id)
				}
			});
		}

		activeSRButton('statusDictSourceReplaceButton');
		activeSRButton('statusDictTargetReplaceButton');
		activeSRButton('worksSourceReplaceButton');
		activeSRButton('worksTargetReplaceButton');
		activeSRButton('tipsSourceReplaceButton');
		activeSRButton('tipsTargetReplaceButton');




		setTimeout(function () {
			if (dict && dict.array && dict.array.length) {
				pushlog('Dictionary have ' + dict.array.length + 'ea.', { 'background': '#00F', color: '#FFF' });
			}
		}, 1000);

	}

	var lastSourceSelectionText, lastTargetSelectionText;
	window.addEventListener('loaddropfiles', function (e) {
		// e.datas  [ {type, name, data} ,...]
		// return console.log(e.datas);
		let ls = ao.ls, table, datas = e.datas, name, type, data
		for (let i = 0, len = datas.length; i < len; i++) {
			name = datas[i].name
			type = datas[i].type
			data = datas[i].data
			table = function () {
				let table = ao.tmstringToTable(data)
				let tbody = document.createElement('tbody')
				tbody.setAttribute('datatype', table.getAttribute('datatype'))
				tbody.setAttribute('dataname', table.getAttribute('dataname'))
				tbody.setAttribute('class', table.getAttribute('class'))
				tbody.innerHTML = table.innerHTML
				return tbody
			}()

			// log('-'.repeat(32))
			// log(name)
			// log(type)
			log(data)
			log(table)

			$(table).find('.target').end().attr({ dataType: type, dataName: name })

			$(table).find('.source').each(function (i, e) {
				$(e).text($(e).text().replace(/\{\\r\\n\}/g, '\\n'))
			})

			if (type === 'tmtool') table.classList.add('tmtoolfile')
			$('#works').append(table)
		}
	}, true);



	// loadDatas
	{
		// var ls=ao.ls;
		// try{
		// 	$('#works').html(ls.get('works'));
		// 	setTimeout(function(){
		// 		$('#works tr').removeClass('hide hide2');
		// 	},1000);
		// }catch(err){
		// 	$('#works').html('');
		// }

		// try{
		// 	dict=new Reference(ls.get('dict'));
		// }catch(err){
		// 	dict=new Reference([]);
		// }

		// var t;
		// t=ls.get('ctrlEnterColor');
		// if(t){
		// 	$('#ctrlEnterColor').val(t)
		// }

		// t=ls.get('useNet');	if(t){$('#useNet').prop('checked',t); };
		// t=ls.get('useNaver');	if(t){$('#useNaver').prop('checked',t); };
		// t=ls.get('useDaum');	if(t){$('#useDaum').prop('checked',t); };
		// t=ls.get('netTarget');	if(t){$('#netTarget').val(t); };
		let prefix = location.search;
		// console.info('loadDatas:', JSON.stringify(prefix), prefix.length);

		let tm = localforage.createInstance({ name: 'tm' });
		tm.getItem(formatName(prefix) + 'works', (j, v) => {
			if (j) {
				console.warn('[Error] No read works. ' + j.message)
			} else if (v) {
				// $('#works').html(v)
				$('#works').html(v).find('tr')
				$('#works .tip').remove();
				// 自动移动光标
				$('#works .currentEditRow td.target').focus();
			}
		});
		tm.getItem(formatName(prefix) + 'dict', (j, v) => {
			// console.log(j, v)
			if (j) {
				console.warn('[Error] No read dict . ' + j.message);
				addDict()
			} else if (v) {
				addDict(v)
			}
		});
		// tm.getItem(formatName(prefix)+'ctrlEnterColor', (j,v)=>{ if(j){ console.warn('[Error] No read ctrlEnterColor . '+j.message); }else if(v){ $('#ctrlEnterColor').val(v); } });
		tm.getItem(formatName(prefix) + 'netTarget', (j, v) => { $('#netTarget').val(v); });
		tm.getItem(formatName(prefix) + 'useNet', (j, v) => { if (j) { console.warn('[Error] No read useNet . ' + j.message); } else if (v) { $('#useNet').prop('checked', v); } });
		tm.getItem(formatName(prefix) + 'useNaver', (j, v) => { if (j) { console.warn('[Error] No read useNaver . ' + j.message); } else if (v) { $('#useNaver').prop('checked', v); /* console.log('naver', v); */ } });
		tm.getItem(formatName(prefix) + 'useDaum', (j, v) => { if (j) { console.warn('[Error] No read useDaum . ' + j.message); } else if (v) { $('#useDaum').prop('checked', v); /* console.log('daum', v); */ } });
		tm.getItem(formatName(prefix) + 'useDictTip', (j, v) => { if (j) { console.warn('[Error] No read useDictTip . ' + j.message); } else if (v) { $('#useDictTip').prop('checked', v); /* console.log('useDictTip', v); */ } });
		tm.getItem(formatName(prefix) + 'worksFontSize', (j, v) => { if (j) { console.warn('[Error] No read fontSize . ' + j.message); } else if (v) { $('#worksFontSize').val(v); /* console.log('font-size', v); */ changeWorksFontSize(); } });
		tm.getItem('pinkthema', (j, v) => {
			if (v) {
				$('#pinkthema').trigger('click')
			}
			themaReady[1] = true
			showBody()
		});
	}


	function backup() {
		let bd = localforage.createInstance({ name: 'backup' }), date = new Date(), dictArrayLength, length;
		if (typeof dict !== 'undefined' && dict.array && (dictArrayLength = dict.array.length)) {

			bd.getItem(formatName(location.search) + 'dict', (j, v) => {
				if (v && Array.isArray(v) && (length = v.length) > dictArrayLength) {
					if (!confirm('[Warning] Do you replace? ' + length + '(old)--->(new)' + dictArrayLength)) return console.error('Failed to back up.');
				}
				bd
					.setItem(formatName(location.search) + 'dict', dict.array)
					.catch((e) => { if (e) { alert('[Error] no save dict. ' + e.message); } })

				bd.setItem(formatName(location.search) + 'backuptime', date.getTime())
					.catch(e => { if (e) { alert('[Error] no save time. ' + e.message); } })

				bd.setItem(formatName(location.search) + 'backuptimestring', date.toLocaleString())
					.catch(e => { if (e) { alert('[Error] no save time. ' + e.message); } })
			});
		}
	}


	function restore() {
		let bd = localforage.createInstance({ name: 'backup' });
		if (typeof dict === 'undefined') window.dict = new Reference();
		bd.getItem(formatName(location.search) + 'dict',
			(j, v) => {
				if (j) {
					console.warn('[Error] No read dict . ' + j.message);
					addDict();
				} else if (v) {
					addDict(v);
				}
			});
	}

	// setTimeout(() => {
	// 	let message = '[Auto backup]';
	// 	backup();
	// 	pushlog(message);
	// 	console.info(message);
	// }, 60000 * 30);




	function saveDatas() {
		let length;
		let tm = localforage.createInstance({ name: 'tm' });

		tm.setItem(formatName(location.search) + 'works', $('#works').html()).catch((e) => { if (e) { alert('[Error] no save works. ' + e.message); } });

		if (dict && dict.array && (length = dict.array.length)) {
			dict.array = uniqueDictionaryArray(dict.array);
			tm.setItem(formatName(location.search) + 'dict', dict.array)
				.catch((e) => { if (e) { alert('[Error] no save dict. ' + e.message); } });

			$('#dictArrayLengthUI').text(length);
		}
		tm.setItem(formatName(location.search) + 'netTarget', $('#netTarget').val());
		tm.setItem(formatName(location.search) + 'useNet').catch((e) => { if (e) { alert('[Error] no save useNet. ' + e.message); } });
		tm.setItem(formatName(location.search) + 'useNaver', $('#useNaver').prop('checked')).catch((e) => { if (e) { alert('[Error] no save useNaver. ' + e.message); } });
		tm.setItem(formatName(location.search) + 'useDaum', $('#useDaum').prop('checked')).catch((e) => { if (e) { alert('[Error] no save useDaum. ' + e.message); } });
		tm.setItem(formatName(location.search) + 'useDictTip', $('#useDictTip').prop('checked')).catch((e) => { if (e) { alert('[Error] no save useDictTip. ' + e.message); } });
		tm.setItem(formatName(location.search) + 'worksFontSize', $('#worksFontSize').val()).catch((e) => { if (e) { alert('[Error] no save worksFontSize. ' + e.message); } });
		tm.setItem('pinkthema', $('#pinkthema').prop('checked'));
	}


	let lastAutoSaveTimeStamp;
	// autoSaveData
	$(window).on('blur', (e) => {
		e.preventDefault();

		// 保存间隔不至少 30s
		lastAutoSaveTimeStamp = lastAutoSaveTimeStamp || 0;
		if ((Date.now() - lastAutoSaveTimeStamp) > 30000) {
			saveDatas();
			lastAutoSaveTimeStamp = Date.now();
		}
	});

	/*
	1	11
	2	22
	3	33
	*/







	var t;
	// function replaceTD(t){
	// 	var w=window.getSelection();
	// 	var bn=w.baseNode;
	// 	var b=w.baseOffset;
	// 	var en=w.extentNode;
	// 	var e=w.extentOffset;
	// 	if(bn===en){
	// 		window.bn=bn;
	// 		console.log(bn);
	// 	}
	// }

	// ddb-move





	// function uniqueDict(){
	// 	var o = {}, a=[];
	// 	dict.array.forEach(function(e){
	// 		o[e[0]]=e[1];
	// 	});
	// 	for(var k in o) {
	// 		a.push([k,o[k]]);
	// 	}
	// 	return a;
	// }

	// 问题：在翻译时，mission中的相似文章，没有像Dictionary一样同时被显示出来，所以很难统一语句。
	// 问题：需要在某个范围内，大量替换某个关键字、关键词的功能。
	// 问题：自动提示本文中的词语，越长的开始匹配，有可能有2个原文词合并的情况，但有可能又是别的译文。


	$(document).on('keydown', function (e) {
		let oe = e.originalEvent;
		let code
		try {
			code = oe.code;
		} catch (err) {
			console.error(err, e, oe)

		}

		// let repeat=oe.repeat;
		// if(repeat) return oe.preventDefault();
		switch (code) {
			case 'Digit0':
			case 'Digit1':
			case 'Digit2':
			case 'Digit3':
			case 'Digit4':
			case 'Digit5':
			case 'Digit6':
			case 'Digit7':
			case 'Digit8':
			case 'Digit9':
			case 'Numpad0':
			case 'Numpad1':
			case 'Numpad2':
			case 'Numpad3':
			case 'Numpad4':
			case 'Numpad5':
			case 'Numpad6':
			case 'Numpad7':
			case 'Numpad8':
			case 'Numpad9': {

				// alt+num
				let tipName
				if (e.ctrlKey) {// ctrl+num
					e.preventDefault()
					tipName = '#tips'
				} else if (e.altKey) {// alt+num
					e.preventDefault()
					tipName = '#statusDict'
				}
				if (tipName && $(tipName).find('tr').length) {
					let tar = $(e.target)
					oe.preventDefault()
					let key = parseInt(code.match(/\d/))
					if (key === 0) key = 10
					key--
					let t = $(tipName).find('tr').eq(key).find('.target').text().trim()

					// $('.currentEditRow .target').focus();
					if (SM.lastTargetRange) SM.range = SM.lastTargetRange;
					if (
						(SM.range.endContainer.nodeType === 3
							&& $(SM.range.endContainer.parentNode).is('#works .target')
							&& SM.range.startContainer.nodeType === 3
							&& $(SM.range.startContainer.parentNode).is('#works .target'))
						||
						(SM.range.endContainer.nodeType === 1
							&& $(SM.range.endContainer).is('#works .target')
							&& SM.range.startContainer.nodeType === 1
							&& $(SM.range.startContainer).is('#works .target'))
					) {
						SM.text = t;// 替换 selection.range 所选中的内容为 t。
						if (e.ctrlKey) {// show diff  -- dmp
							if (t.length) {
								let t1 = $(tipName).find('tr').eq(key).find('.source').text().trim();
								let t2 = $(e.target).parent().find('.source').text().trim();
								let dmp = new diff_match_patch();
								let dmpHTML = dmp.diff_prettyHtml(dmp.diff_main(t1, t2));
								pushloghtml(dmpHTML);

								let { x, y, height } = tar.get(0).getBoundingClientRect();
								// showTip({html:dmpHTML, x, y:Math.max(y-height,0)});
								showTip({ html: dmpHTML, x, y, delay: 5000, css: { transform: 'translate(0,-100%)' } });
							}
						}

					}
					break;
				}
			}
		}
	});


	$(document).on('mousedown', '#tips td, #statusDict td', function (e) {
		if (e.which === 3) {// e.which===3  rightclick contextmenu
			let tar = $(e.target);

			$('#statusDict,#tips').empty();// 删除一个就得隐藏，否则序号全部会错乱。

			e.preventDefault();
			let p, s, t;
			p = $(e.target).parent('tr')
			n = p.find('td.no').text()
			s = p.find('td.source').text()
			t = p.find('td.target').text()
			i = parseInt(p.find('td.index').text())

			if ((s !== dict.array[i][0]) && (t !== dict.array[i][1])) {
				// 字典中没有找到原文译文匹配的记录时，不进行删除，以免误删该索引上的记录。
				pushlog('Failed to delete! Unable to find the corresponding record.');
				return false;
			}

			if (confirm(`< Warning > Do you want to delete?
No: - ${n} -
source: ${s}
target: ${t}
index: - ${i} -`)) {
				var l = dict.array.length;
				var item = dict.array.splice(i, 1);
				$(e.target).parent('tr').remove();
				console.info(`[ Deleted ] ${i} ${item.join('\n')}`);
				pushlog(`[ Deleted ] ${i} ${item.join('\n')}`);
			}
		}
	});


	$(document).on('contextmenu', '#works td.no', function (e) {
		e.preventDefault();
		if (confirm('[Warning] Delete row ' + e.target.textContent + '?!')) {
			e.target.parentElement.remove();
		}
	});


	/*
	智能匹配任务
	源：검성 라시드의 비밀
	
	已知：
		검성 라시드	剑圣拉希德
		라시드의 비밀	拉希德的秘密
	
	推荐翻译：
	검성 라시드의 비밀	剑圣拉希德的秘密
	
	推荐词库收录：
	검성	剑圣
	라시드	拉希德
	비밀	秘密
	
	
	
	
	Inconsistency in Source
	原文一样，译文不同。(空格敏感)
	原文不同，译文一样。(空格敏感)
	
	Tag Mismatch
	原文中的某些<[()]>标签，在译文中有所不同。
	
	Numeric Mismatch
	原文中的数字，与译文中的内容有所不同。
	
	
	Alphanumeric Mismatch Source(AD2DB57FF) Target(ADD625FF)
	原文多进制数字，与译文中的内容有所不同。
	
	Unpaired Symbol
	不成对的符号
	()[]{}<>没有开或关，就是没有配套出现。
	
	Unpaired Quotes
	各种开始或结束的没有匹配到的" ' 中文的全角‘’
	
	
	*/

	function maskScreen() {
		let mask = $('#mask')
		if (mask.length === 0) {
			mask = $('<div id="mask">').css({
				width: '100%', height: '100%',
				position: 'fixed', left: 0, top: 0,
				background: 'rgba(255,255,255,.8)'
			})
			// .on('contextmenu',(e)=>{ e.preventDefault() mask.detach() })
		}
		mask.appendTo('body')
		return mask;
	}

	function get2DArrayMaxLength(arr) {
		let maxLength = 0;
		arr.forEach(row => {
			maxLength = Math.max(row.length, maxLength);
		});
		return maxLength;
	}

	function createControlTr(maxLength) {
		let tr = $('<tr class="control">');
		while (maxLength-- > 0) {
			$('<td>').appendTo(tr)
				.append(createRadioButton('source'))
				.append(createRadioButton('target'))
				.append(createCheckButton('edit'))
		}
		return tr;
	}

	function createRadioButton(name, checked) {
		let
			label = $('<label class="button">').text(name),
			radio = $('<input type="radio">').attr({ name, checked }).prependTo(label)
		radio.after('<br>')
		return label
	}
	function createCheckButton(name, checked) {
		let
			label = $('<label class="button">').text(name),
			radio = $('<input type="checkbox">').attr({ name, checked }).prependTo(label)
		radio.after('<br>')
		return label
	}


	{
		$('#flipDict').click(function (e) {
			let array = dict.array;

			array.forEach(function (e) {
				let temp;
				if (Array.isArray(e)) {
					temp = e[0];
					e[0] = e[1];
					e[1] = temp;
				} else if (typeof e === 'object' && e.source && e.target) {
					temp = e.source;
					e.source = e.target;
					e.target = temp;
				}
			});
			pushlog('소스와 타겟이 바뀌어졌습니다.');

			let mask = maskScreen();
			let table = ao.arrayToTable(dict.array.slice(0, 10));
			mask.append(table).one('click', function () {
				mask.remove();
			});
			mask.find('table').css({ maxWidth: '60em', margin: 'auto auto', opacity: .7, userSelect: 'none' });
		})
	}

	function changeWorksFontSize() {
		let size = Math.max(parseInt($('#worksFontSize').val()), 8);
		$('#activeStyle').text(`#works td.source,#works td.target{
		font-size:${size}pt;
	}`);
	}


	// $(() => {
	// 	$(window).on('keydown', e => {
	// 		if (e.keyCode === 121 && e.ctrlKey) {// F10 backup
	// 			e.preventDefault();
	// 			backup();
	// 			pushlog('[Manual backup]');
	// 			console.info('[Manual backup]');
	// 		}
	// 	});
	// });


	{
		let visible = false;
		$('#helpHeader').click(() => {
			visible = !visible;
			ui = $('#helpContent')[visible ? 'fadeIn' : 'fadeOut']();
		})
	}

	{
		$('#restoreButton').click(() => {
			let bd = localforage.createInstance({ name: 'backup' });
			bd.getItem(formatName(location.search) + 'backuptime',
				(j, v) => {
					if (j) {
						console.warn('[Error] No backup.');
					} else if (v) {
						if (confirm('Last backup time is:  ' + (new Date(v)).toLocaleString())) {
							restore();
						}
					}
				});
		});

		$('#toggleComments').click(() => $('#works td').not('.no,.source,.target').toggle());
	}


	function uniqueDictionaryArray(a) {
		a.reverse();
		a = a.map(e => e.join('\x00'))
		a = Array.from(new Set(a))
		a = a.map(e => e.split('\x00'))
		a.reverse();
		return a;
	}



	{
		let projectName = location.search.slice(1);
		$('#projectName').text(projectName);
	}


	function addTip(text, dom) {
		let t = $('<div>').appendTo('body').one('click', (e) => e.target.remove());
		let rect;
		if (dom && dom.getBoundingClientRect) {
			rect = dom.getBoundingClientRect();
		} else {
			let s = window.getSelection();
			if (s.type !== 'None') {
				let r = s.getRangeAt(0);
				rect = r.getBoundingClientRect();
			} else {
				return;
			}
		}
		let { top, left } = rect;
		t.css({ background: 'rgba(255,255,0,0.5)', position: 'fixed', left }).text(text)
		t.css({ top: top + Math.max(t.height(), 20) })

	}

	{// 插入特殊符号
		let chars = '\\{\\r\\n\\}|\\n|[' + '`~!@#$%^&*()_+-=[]{}\\|:;\'"/<>?'.split('').map(e => '\\' + e).join('') + ']+';
		// let chars='['+'`~!@#$%^&*()_+-=[]{}\\|:;\'",./<>?'.split('').map(e=>'\\'+e).join('')+']+';
		let _customChars = '[\\x00-\\x19\\x21-\\xff→♥♣◆★※≪≫▶◀ⅠⅡⅢⅣ]+';
		$(window).on('keydown', e => {
			if (e.keyCode === 120) {// 120:F9

				// ctrl+shift+alt+f9 配置
				if (e.ctrlKey && e.shiftKey && e.altKey) {
					return _customChars = prompt('매칭 할 내용을 넣어 주세요', _customChars) || _customChars;
				}
				e.preventDefault();
				insertTips(e);// 插入找到的内容
			}
		});
		function insertTips(e) {// 插入找到的内容
			let t = $(e.target);
			if (t.is('#works .target')) {
				let s = t.parent().find('.source');

				let regExp = new RegExp((e.ctrlKey || e.altKey) ? _customChars : chars, 'gm');
				let r = s.text().match(regExp).join('').replace('：', ':');
				// console.debug(regExp,r);
				if (e.altKey) {
					r = r.replace(/'([\s\S]*?)'/g, '「$1」');
					r = r.replace(/"([\s\S]*?)"/g, '『$1』');
					// r=r.replace(/:/g,'：');
				}

				// 由于Ctrl+F9错误插入到source中，解决此BUG。
				if (r) {
					// let range = window.range = SM.range
					// if(range)
					// SM.range.deleteContents()
					// SM.range.insertNode(new Text(r))
					// SM.s.removeAllRanges()
					// if(SM.focusNode && SM.focusNode.nodeType
					if (SM.s.focusNode && SM.s.focusNode.nodeType === Document.TEXT_NODE && SM.s.anchorNode && SM.s.anchorNode.nodeType === Document.TEXT_NODE) {

						if (parentNodeIsTargetClasses(SM.s.focusNode) && parentNodeIsTargetClasses(SM.s.anchorNode)) {
							SM.text = r
						}
					} else if (SM.s.focusNode && SM.s.focusNode === SM.s.anchorNode && SM.s.anchorNode.classList.contains('target')) {
						SM.text = r
					} else {
						warn(r)
						warn(SM.s)
					}
				}
			}
		}
	}


	{
		$('#main .utilsource').on('contextmenu', e => {
			if (e.originalEvent.target === e.originalEvent.currentTarget) {
				e.preventDefault();
				$('#worksSourceFilter').val('').trigger('input');
			}
		});
	}


	{
		let t = true;
		$('#sort').on('click', e => {
			$('#works tr').sort((a, b) => {
				if (t) {
					a = $(a).find('.source').text().length;
					b = $(b).find('.source').text().length;
				} else {
					a = parseInt($(a).find('.no').text());
					b = parseInt($(b).find('.no').text());
				}
				return a > b ? 1 : (a < b ? -1 : 0);
			}).detach().appendTo('#works');
			t = !t;
			$('#sort').find('span').last().text((t ? '길이' : '순서') + '배열');
		});
	}


	// 编辑下一个空格子
	function nextEmptyTarget(ctrlKey = false) {
		let e = $('#works tr').not('.hide,.hide2,.hide3,.emptyRow,.splitTarget')
		if (!ctrlKey) {
			e = e.filter((i, e) => $(e).find('.target').is(':empty()'));
		} else {
			e = e.filter((i, e) => !$(e).find('.target').is('.done'));
		}
		let t = e.eq(0).find('.target')
		if (t.length) {
			t.focus()
		} else {
			let p = $('.currentEditRow').parent()
			if (p.is('.tmtoolfile')) {
				p = p.next()
				p.find('.target').eq(0).focus()
			}
		}
	}



	// function WorksRange(){
	// 	this.ranges = {};
	// 	this.parents = {};
	// 	this.selection;
	// }
	// Object.defineProperty(WorksRange.prototype,'selection',{
	// 	get(){
	// 		if(!this._selection) Object.defineProperty(this,'_selection',{value:window.getSelection()});
	// 		return this._selection;
	// 	}
	// });
	// Object.defineProperty(WorksRange.prototype,'range',{
	// 	get(){
	// 		return this.selection.rangeCount ? this.selection.getRangeAt(0) : null;
	// 	}
	// });
	// WorksRange.prototype.flush = function (){
	// 	let r=this.range;
	// 	if(!r) return;
	// 	let n = r.endContainer;
	// 	while(true)	{
	// 		if(!n) break;
	// 		if($(n).is('#works .target')) {
	// 			this.ranges.target=r;
	// 			this.parents.target=n.parentElement;
	// 			break;
	// 		}
	// 		if($(n).is('#works .source')) {
	// 			this.ranges.source=r;
	// 			this.parents.source=n.parentElement;
	// 			break;
	// 		}
	// 		n=n.parentElement;
	// 	}
	// 	// console.log(JSON.stringify(this.ranges,function(k,v){
	// 	// 	if(k==='target' || k==='source') {
	// 	// 		return v.toString();
	// 	// 	}
	// 	// 	return v;
	// 	// }))
	// 	// console.log(this.parents)
	// }
	// Object.defineProperty(WorksRange.prototype, 'isSameParent', {
	// 	get(){
	// 		return this.parents.source === this.parents.target;
	// 	}
	// });
	// WorksRange.prototype.start = function(){
	// 	$(window).on('mouseup keyup', this.defaultHandle.bind(this));
	// }
	// WorksRange.prototype.stop = function(){
	// 	$(window).off('mouseup keyup', this.defaultHandle.bind(this));
	// }
	// WorksRange.prototype.defaultHandle = function(e){
	// 	e.preventDefault();
	// 	this.flush();
	// }
	// let wr=new WorksRange()
	// wr.start()


	$(document).on('blur', '#works .target', function (e) {
		let r = SM.range;
		SM.lastTargetRange = r;
	});




	function numCheck(s, t) {
		let numRE = /[\+\-]?\d+(,\d{3})*(\.\d+)?(?:[Ee][\+\-]?\d+)?%?/g;
		// let s='1,001291 asfas  0.12  100,1000,00.0'
		// let t='asfas  0.12  100,1000,00.0  1,00129'

		let sa = s.match(numRE)
		let ta = t.match(numRE)

		// console.log(sa);
		// console.log(ta);

		function clac(sa, ta) {
			sa = sa || [];
			ta = ta || [];
			let r = {}
			if (sa.length === ta.length) {
				if (sa.join('\u200c') === ta.join('\u2000c')) {
					r.done = true;
					return r;
				} else {
					r.done = false;
				}
			}
			sa.forEach((e, i) => {
				let index = ta.indexOf(e);
				if (index !== -1) {
					delete ta[index];
					delete sa[i];
				}
			});
			sa = sa.filter(e => e !== undefined);
			ta = ta.filter(e => e !== undefined);
			return { sa, ta }
		}

		// console.log(clac(sa,ta))
		return clac(sa, ta);
	}

	// function splitLongSource(s) {
	// 	let r = /(?!\d)\s*(?:\.|\?|\!)\s*(?!\d)|{\\r\\n}|\\n/g;
	// 	let a1 = s.split(r);
	// 	let l1 = a1.length;
	// 	if (l1 < 2) return false;
	// 	let a2 = s.match(r);
	// 	let l2 = a2.length;
	// 	console.warn(a1, a2)
	// 	let a = [];
	// 	let len = Math.max(l1, l2);
	// 	let i = 0;
	// 	while (i < len) {
	// 		let v1 = a1[i], v2 = a2[i] || '', chunk;
	// 		if (v2.indexOf('.') === -1 || v2.indexOf('!')===-1 || v2.indexOf('?')===-1) {
	// 			chunk = [v1, v2];
	// 		} else {
	// 			chunk = [v1 + v2];
	// 		}
	// 		a = a.concat(chunk);
	// 		i++;
	// 	}
	// 	a = a.filter(e => e.length > 0);
	// 	return a;
	// }


	{
		// 让.source可以编辑
		$(window).on('contextmenu', e => {
			let t = e.target, k = 'contenteditable', v = 'plaintext-only';
			if ($(t).is('.source')) {
				e.originalEvent.preventDefault();
				if (t.hasAttribute(k)) {
					t.removeAttribute(k);
				} else {
					t.setAttribute(k, v);
				}
			}
		});

		// 下方格子向上合并(Ctrl+E)
		$(window).on('keydown', e => {
			/* 
			t  当前译文
			p  当前译文的父级
			pn 下一个父级
			 */
			let t = $(e.target), p = $(t).parent(), pn = p.next();
			if (e.keyCode === 69 && e.ctrlKey) {
				e.originalEvent.preventDefault();
				if (t.is('.target') && p.is('.split') && pn.is('.split')) {
					let s = p.find('.source');
					let sn = pn.find('.source');
					s.text(s.text() + sn.text());

					let tn = pn.find('.target');
					t.text(t.text() + tn.text());
					t.focus()
					pn.remove();
				}
				t.trigger({ type: 'keydown', keyCode: 19, code: 'Pause' })
				// match100($('.currentEditRow .target'))
			}
		});
	}



	{
		// 让单按Alt键失效（否则总会失真）
		$(window).on('keyup', e => {
			disableAlt.call(e);
		});

		function disableAlt() {
			// this === KeyboardEvent
			if (this.keyCode) this.preventDefault();
		}
	}


	// function parseComment() {
	// 	let comments = $('#works .comment').filter((i, e) => $(e).text().length);

	// 	comments.each((i, e) => {
	// 		let comment = $(e);
	// 		let parent = comment.parent();
	// 		let source = parent.find('.source');
	// 		let s = source.text();

	// 		comment.text().split(',').forEach(e => {
	// 			let [k, v] = e.split(':', 2);
	// 			s = s.replace(k, v);
	// 		});

	// 		source.text(s).css('background', '#ffc');
	// 	});
	// }


	// {
	// 	setTimeout(() => {
	// 		let db = localforage.createInstance({name:'test'});
	// 		dict.array.forEach(function(st){
	// 			let source = st[0];
	// 			let target = st[1];
	// 			let key;

	// 			key = sha256(source);
	// 			db.setItem(key, source);
	// 			console.log(key)

	// 			key = sha256(target);
	// 			db.setItem(key, target);
	// 			console.log(key)
	// 		});

	// 		db.getItem()

	// 		console.log('ok');
	// 	}, 2000);

	// }


	// {
	// 	// test speed
	// 	let isDebug = localStorage.getItem('isDebug');
	// 	if(isDebug){
	// 		let tm = localforage.createInstance({name:'tm'});
	// 		tm.getItem(location.search+'dict', function(err,e){
	// 			console.log(e);
	// 		});

	// 		// store
	// 		let s = localforage.createInstance({name:'tim', storeName:'test'});





	// 		s.keys().then(v=>console.log(v));

	// 		// s.dropInstance()

	// 	}
	// }



	// 点击关闭原来的窗口
	{
		$('#useNet').click(e => {
			gSearch.google && gSearch.google.close();
			gSearch.papago && gSearch.papago.close();
			gSearch.googleAll && gSearch.googleAll.close();
		});
	}


	let w;
	{
		!function () {
			// debug flag
			let debug = localStorage.getItem('debug');
			if (!debug) return;
			// console.warn(debug);

			w = new Worker('./dict-worker.js');
			w.addEventListener('message', function (e) {
				// console.log(e.data);
				// console.timeEnd(e.data.type);
			});

			function remove(source) {
				// console.time('remove');
				w.postMessage({ type: 'remove', source });
			}
			function get(source) {
				// console.time('get');
				w.postMessage({ type: 'get', source });
			}
			function set(source, target) {
				// console.time('set');
				w.postMessage({ type: 'set', source, target });
			}
			function similar(source, cv) {
				// console.time('similar');
				w.postMessage({ type: 'similar', source, cv });
			}
			function size() {
				// console.time('size');
				w.postMessage({ type: 'size' });
			}
			w.remove = remove;
			w.get = get;
			w.set = set;
			w.similar = similar;
			w.size = size;
		}();
	}

	let d;
	{
		!function () {
			d = {};
			function sml(source, cv = 1) {
				let result = [];
				dict.array.forEach(function (e) {
					let [k, v] = e;
					let _cv = similar(source, k, true);
					if (_cv >= cv) {
						let o = Object.create(null);
						Object.assign(o, { cv: _cv, source: k, target: v });
						result.push(o);
					}
				});
				return result;
			}
			d.similar = function (source, cv = 1) {
				// console.time('d silimar');
				let res = sml(source, cv);
				// console.timeEnd('d silimar');
				return res;
			};
		}();
	}

});

function cnEncode(s, tips) {
	let ts = {}, source = s, space = s, t;

	tips.forEach(function (e, i) {
		while (space.indexOf(e[0]) > -1) {
			space = space.replace(e[0], '')
			source = source.replace(e[0], `\uffff${i}\uffff`)
			ts[i] = e[1]
		}
	})
	space = space.replace(/\\n|\\t|[\~\!\@\#\$\%\^\&\*\(\)\_\+\`\-\=\[\]\\\;\'\,\.\/\{\}\|\:\"\<\>\?]/g, '').replace(/\p{Number}|\p{Mark}/gu, '').replace(/\s/g, '')
	if (space.length == 0) {
		t = source
		for (let i in ts) {
			while (t.indexOf(`\uffff${i}\uffff`) > -1) {
				t = t.replace(`\uffff${i}\uffff`, ts[i])
			}
		}
		t = t.replace(/ +/g, '')
	}
	return { ts, space, source, s, tips, t }
}
function getTips() {
	return $('#statusDict tr')
		.toArray()
		.map(e => [$(e).find('.source').text(), $(e).find('.target').text()])
		.sort((a, b) => {
			let al, bl;
			al = a[0].length
			bl = b[0].length
			if (al > bl) {
				return -1
			} else if (al < bl) {
				return 1
			} else {
				return a[0] > b[0] ? -1 : (a[0] < b[0] ? 1 : 0)
			}
		})
}


function dmpMatch() {
	// statusDict, tips
	let red = $('#tips tr').toArray().map(tr => [$(tr).find('.source').text(), $(tr).find('.target').text()])
	// let curr = $('#works .currentEditRow')
	// let s = curr.find('.source')
	// let st = s.text()
	let st = $('#works .currentEditRow').find('.source').text()
	let dmp = new diff_match_patch()
	return red.map(e => e.concat(dmp.diff_main(e[0], st)))
}
function red() {
	return $('#tips tr').toArray().map(function (tr) {
		tr = $(tr)
		return {
			source: tr.find('.source').text(),
			target: tr.find('.target').text(),
			similar: parseFloat(tr.find('.similar').text())
		}
	})
}

function blue() {
	return $('#statusDict tr').toArray().map(function (tr) {
		tr = $(tr)
		return {
			source: tr.find('.source').text(),
			target: tr.find('.target').text(),
			similar: parseFloat(tr.find('.similar').text())
		}
	})
}

function collector(dicts) {
	let dmp = new diff_match_patch()
	let s = collector.s = {}
	dicts.forEach(function (dict, index) {
		let { source, target, similar } = dict
		dicts.forEach((e, i, a) => {
			if (index === i) return;
			let sd = dmp.diff_main(source, e.source)
			let td = dmp.diff_main(target, e.target)

			let sa = { '-1': new Set(), '1': new Set(), '0': new Set() }
			let ta = { '-1': new Set(), '1': new Set(), '0': new Set() }
			sd.forEach(e => sa[e[0]].add(e[1]))
			td.forEach(e => ta[e[0]].add(e[1]))
			let f = function (k) {
				if (sa[k].size === 1 && ta[k].size === 1) {
					let st = Array.from(sa[k])[0]
					let tt = Array.from(ta[k])[0]
					if (!s[st]) s[st] = {}
					if (!s[st][tt]) s[st][tt] = 0
					s[st][tt] += 1
				}
			}
			f('-1')
			f('0')
			f('1')
		})
	})
	collector.r = collectorTips()
	return s
}
function collectorTips() {
	let s = collector.s, r = []
	if (s) {
		for (let k in s) {
			let v, count = 0
			Object.keys(s[k]).forEach(t => {
				if (s[k][t] > count) v = t
			})
			r.push([k, v])
		}
	}
	return r
}


// $(()=>{
// 	let dmp = new diff_match_patch()
// 	let a = {source:'영웅 장비 제조시 엘드 자원 10% 감소',target:'制作英雄装备时，减少10%金币资源消耗'}
// 	let b = {source:'영웅 장비 제조시 에딜륨 자원 10% 감소', target:'制作英雄装备时，减少10%紫水晶资源消耗'}

// 	function kkv(k,kv){
// 		let r = dmp.diff_main(kv.source||kv[0],k).filter(e=>e[0]!==0)
// 		let l = r.length
// 		if(l===2 && r[0][0]===-1 && r[1][0]===1){
// 			let search = dict.search(r[0][1],100)[1]
// 			if(search) {
// 				let replace = dict.search(r[1][1],100)[1]
// 				if(replace) {
// 					let v = kv.target||kv[1]
// 					if(v) return v.replace(search,replace)
// 				}
// 				return false
// 			}
// 		}else{
// 			return false
// 		}
// 	}

// 	console.log(auto(a,b))
// })

function kkv(k, kv) {
	let dmp = new diff_match_patch()
	let r = dmp.diff_main(kv.source || kv[0], k).filter(e => e[0] !== 0)
	let l = r.length
	if (l === 2 && r[0][0] === -1 && r[1][0] === 1) {
		// console.log(r[0][1])
		let search = dict.search(r[0][1], 100)[0]
		// console.log(search)
		if (search) {
			let replace = dict.search(r[1][1], 100)[0]
			// console.log(replace)
			if (replace) {
				let v = kv.target || kv[1]
				// console.log(v, search[1],replace[1], v.replace(search[1],replace[1]))
				if (v) return v.replace(search[1], replace[1])
			}
		}
	}
	return false
}

function mergeSplits() {
	let t, p, name
	$('#works .splitTarget').text('')
	$('#works tr.split').each((i, tr) => {
		t = $(tr).find('.target')
		name = $(tr).find('.name').attr('originalname')
		p = $(`#works .splitTarget[name="${name}"]`)
		p.text(p.text() + t.text())

		tr.remove()
	})
	$('.splitTarget').removeClass('splitTarget').removeAttr('name').removeAttr('style')
	// .parent().removeClass('hide')// 20190306
	if (p) p.focus()

	// 优化：阻止合并时自动插入旧100%记录
	lwsd.close()
	lwsd2.close()
	$('#statusDict,#tips').empty()
}
function splitLong(tar) {
	tar = $(tar)
	if (tar.is('.splitTarget')) return;
	let p = tar.parent();
	let s = p.find('.source');
	let st = s.text();
	let t = tar;
	t.text('')

	let res = splitLongSource(st);

	if (res.length > 1) {
		let name = ObjectID().toString()
		tar.addClass('splitTarget').empty();
		tar.attr({ name })
		// tar.parent().addClass('hide')// 20190306
		let first;
		res.forEach((e, i) => {
			let tr = $(`<tr class="split">`).appendTo('#works');
			let no = $('<td class="no">').text(i + 1).appendTo(tr);
			let s = $('<td class="source">').text(e).appendTo(tr)
			let t = $('<td class="target" contenteditable="plaintext-only">').appendTo(tr);
			$('<td class="name">').appendTo(tr).attr({ originalname: name })
			if (i === 0) first = t;
			if (e.trim() === '') tr.addClass('hide2');
			else if (e.indexOf('\\n') > -1) {
				t.text(e);
				tr.addClass('hide2');
			}
		});
		let w = document.getElementById('works');
		w.scrollTo(0, w.scrollHeight);
		first.focus();
		first.get(0).scrollIntoView()
	} else {
		let rect = tar.offset();
		showTip({ text: '분해할 수 없습니다', x: rect.left, y: rect.top, css: { transform: 'translate(0,-100%)' } });
	}
}
// F8 分隔长文段
function splitLongSource(str) {
	// return longSegmentSplit(str)
	let ss = new StringSplitter(str)
	ss.split(/\{\\r\\n\}+|\\r\\n+|\\n+/)
	ss.split(/\(.+\)/u)
	// ss.split(/(?=(?!\d)\.)/)
	ss.split(/.+?(\!\?|\?\!|\?|\!|\.)+(\s*)/)


	return ss.s.map(e => (e instanceof StringSplitterDelimiter) ? e.value : e)
}

function showTip(opt) {
	if (opt === undefined || opt === null) return;
	let type = typeof opt;
	if (type !== 'object') {
		opt = { text: opt };
	}
	let ui;
	ui = $('<div></div>').appendTo('body').fadeIn().css({
		position: 'fixed',
		left: opt.x || 0,
		top: opt.y || 0,
		zIndex: 999
	}).css(Object.assign({
		margin: 0,
		padding: 6,
		border: '2px solid #000',
		background: '#fffe',
		color: '#000',
		borderRadius: 6,
		fontWeight: 'bold'
	}, opt.css));
	if (opt.html) ui.html(opt.html);
	else if (opt.text) ui.text(opt.text);
	if (opt.animate) {
		if (Array.isArray(opt.animate)) {
			opt.animate.forEach(e => {
				ui = ui.animate(e);
			});
		} else {
			ui = ui.animate(opt.animate);
		}
	}
	ui.delay(opt.delay || 3000).fadeOut(() => ui.remove());
	return ui;
}


function chars(start, end) {
	function charCode(o) {
		let type = typeof o
		if (type === 'number') return o
		if (type === 'string') return o.charCodeAt(0)
		o = 0
		return o
	}
	start = charCode(start)
	end = charCode(end)

	let code = Math.min(start, end)
	end = Math.max(start, end)

	let res = []
	while (code <= end) {
		res.push({ code, char: String.fromCharCode(code++) })
	}
	return res;
}


let searchRE = '^\\/<>()[-]?*+{,}.:=!|$'.split('').map(c => '\\' + c)


// F1 卡顿的 match100()
/* 

function match100(range) {
	var o = {};
	dict.array.forEach(function (e) {
		// 去掉左右空白后，再整理出键值对。
		e[0] = String(e[0]).trim();
		e[1] = String(e[1]).trim();
		if (e[0] && e[1]) {
			o[e[0]] = e[1];
		}
	});

	let b = Boolean(range)
	if (!b) {
		range = $('#works').find('tr').not('.hide').not('.hide2').not('.emptyRow').filter((_, e) => !$(e).find('.target').is('.splitTarget'))
	}
	range.find('.target').removeClass('done doneAuto doneAutoSpace doneAutoNumber doneAutoSmart').empty()

	// if (clickEvent.shiftKey) {
	// 	range = range.filter('.split')
	// }
	// if (clickEvent.ctrlKey) {
	// 	range = range.find('.target').not('.done').not('.doneAuto').not('.doneAutoSpace').not('.doneAutoNumber').not('.doneSmart').not('.splitTarget').parent()
	// }
	range.each(function (i, tr) {
		let s, t, st;

		if (!b) {
			s = $(tr).find('.source');
			t = $(tr).find('.target');

		} else {
			t = range
			s = range.parent().find('.source')

		}
		st = s.text().replace(/\{\\r\\n\}/g, '\\n').trim();
		// console.log(s, t, st)
		pushlog('[채우기] ' + st)

		// 直接找到一致内容。
		if (st in o) {
			// t  需要填充的该target单元格
			// ot t单元格的当前内容
			// tt 需要填充的100%匹配的最新内容
			let ot, tt;
			ot = t.text();
			tt = o[st];
			// 已经填好的内容与100%内容一致时，直接退出操作。
			if (ot === tt) return t.removeClass('done doneAuto doneAutoSpace doneAutoNumber doneSmart').addClass('done');
			// if (clickEvent.altKey) return t.parent().remove();
			return t.text(tt).removeClass('done doneAuto doneAutoSpace doneAutoNumber doneSmart').addClass('doneAuto');
		}

		// 如果没有直接找到一致内容，则需要只能匹配了。
		// 智能忽略空格匹配
		if (st.length === 0) { return; }
		var regexp = new RegExp('^' + Search.getRegExp(st).source + '$');
		for (var k in o) {
			if (regexp.test(k)) {
				// 找到一致内容
				// if (clickEvent.altKey) return t.parent().remove();
				return t.text(o[k]).removeClass('done doneAuto doneAutoSpace doneAutoNumber doneSmart').addClass('doneAutoSpace');// 淡灰色
			}
		}

		// 数值匹配
		{
			let result = '', accepted, p;
			let regExp = ArgText.numberRegExp;
			let stNoNumber = st.replace(regExp, '');
			if (regExp.test(st)) {
				let arr = dict.array;
				arr.forEach(e => {
					let s = e[0], t = e[1];
					if (regExp.test(s)) {
						let sNoNumber = s.replace(regExp, '');
						if (sNoNumber === stNoNumber) {
							p = ArgText.makeTextPair(s, t);
							let stMade = ArgText.makeText(st);
							accepted = p.a.args.length === stMade.args.length
							if (accepted) {
								result = p.make(stMade.args);
							}
							return accepted;
						}
					}
				});

				if (accepted) {
					t.text(result).removeClass('done doneAuto doneAutoSpace doneAutoNumber doneSmart');
					if (p.accepted) {
						t.addClass('doneAutoNumber');
					} else {
						t.addClass('doneSmart');
					}
					return;// 不要继续往下执行。
				}
			}
		}

		// 一个词的替换
		{
			if (dict.search(st, 80).some(kv => {
				let tt = kkv(st, kv)
				if (tt) {
					t.text(tt).addClass('doneAutoNumber')
					return true
				}
			})) {
				return;
			}
			// let s = $(tr).find('.source');
			// let t = $(tr).find('.target');
			// let st = s.text().replace(/\{\\r\\n\}/g, '\\n').trim();
		}



		// 只能忽略数字英文符号等的匹配。
		var filterRegExp = /[\x00-\xff]/g, _k, _v;
		for (var k in o) {
			_k = k.replace(filterRegExp, '');
			if (_k == st.replace(filterRegExp, '')) {
				let v = smartMatch(st, [k, o[k]]);
				t.text(v).addClass('doneSmart');// 红色
				return;
			}
		}

		// 实在是没有找到，需要做最后的处理。
		// 按下ctrl时，保留原来内容。按下alt时，删除找到的内容。找到内容时，自动替换背景颜色为灰色。
		// if (!clickEvent.ctrlKey) {
		// 	t.text('').removeAttr('style');
		// }
	});
}

 */



let match100workers = {}
let match100fns = []

function match100chain(fns, callback) {
	match100fns = match100fns.concat(fns)
	match100run()
}
async function match100run() {
	let fn
	while (fn = match100fns.shift()) {
		await fn()
	}
}

function match100(range) {
	let _;
	// let trimRegExp = /^\s+|\s+$/
	// _ = array.filter(([source, target])=>{
	// 	return trimRegExp.test(source) || trimRegExp.test(target)
	// })

	// close workers
	for (let objectId in match100workers) {
		let worker = match100workers[objectId]
		worker.terminate()
		delete match100workers[objectId]
	}
	// make unique o
	let o = {};
	let { array } = dict
	array.forEach((row) => {
		let [source, target] = row
		// 去掉左右空白后，再整理出键值对。
		if (source !== String(source).trim()) row[0] = String(source).trim()
		if (target !== String(target).trim()) row[1] = String(target).trim()
		if (source && target) o[source] = target
	});



	// 测试

	let b = Boolean(range && range.length)
	if (!b) {
		range = $('#works').find('tr').not('.hide').not('.hide2').not('.emptyRow').filter((_, e) => !$(e).find('.target').is('.splitTarget'))
	}
	range.find('.target').removeClass('done doneAuto doneAutoSpace doneAutoNumber doneAutoSmart').empty()

	match100fns = []
	let fns = range.toArray().filter(tr => $(tr).find('.source').text().trim()).map(tr => clac.bind(this, tr))
	if (fns.length) match100chain(fns)

	function clac(tr) {
		return new Promise((resolve) => {
			let s, t, st, worker, objectId = ObjectID().str;

			if (!b) {
				s = $(tr).find('.source');
				t = $(tr).find('.target');

			} else {
				s = range.find('.source')
				t = range.find('.target')

			}
			st = s.text().replace(/\{\\r\\n\}/g, '\\n').trim();
			t.addClass('wait')

			worker = cacheWorker('match100', function () {
				// ArgText
				{ let e = this; e = "object" == typeof window ? window : "object" == typeof global ? global : this; let t = /\d{1,3}(,?\d{3})*(\.\d+(e(-?)\d+)?)?/g; function makeTextPair(e, t, r = "{") { let n, a, o; n = makeText(e), a = makeText(t); let d = reIndexs(n.args, a.args), c = 0; return o = a.tagText.replace(/((\{\{)*\{)(\d+)(\})/g, function (e, t, r, n, o) { return n = void 0 === (n = d[c]) ? void 0 === a.args[c] ? "" : a.args[c] : `${t}${n}${o}`, c++ , n }), { a: n, b: a, tagText: o, accepted: d.accepted, make: function (e, t = !0) { return makeArgs(t ? this.tagText : this.b.tagText, e) } } } function reIndexs(e, t) { let r, n, a, o; for (t = Array.from(t), r = 0, (n = e.length) ? (o = []).accepted = !0 : o.accepted = !1; r < n; r++)-1 == (a = t.indexOf(e[r])) ? o.accepted = !1 : (t[a] = null, o.push(a)); return o } function encodeReady(e, t = "{") { let r = new RegExp(t.split("").map(e => "\\" + e).join(""), "g"); return e.replace(r, "$&$&") } function decodeReady(e, t = "{") { let r = new RegExp("(" + t.split("").map(e => "\\" + e).join("") + ")\\1", "g"); return e.replace(r, t) } function makeText(e, r = "{") { let n, a = 0, o = []; return { text: e, tagText: n = (n = encodeReady(e, r)).replace(t, function (e) { return o.push(e), `{${a++}}` }), args: o } } function makeArgs(e, t) { if ("string" != typeof e) return ""; let r, n; return n = /\{([^\}]+?)\}/g, (r = (r = e.split("{{")).map(function (e) { return e.replace(n, function (e, r) { let n = t[r]; return null == n && (n = e), n }) })).join("{{") } e.ArgText = { numberRegExp: t, makeArgs: makeArgs, makeText: makeText, makeTextPair: makeTextPair, encodeReady: encodeReady, decodeReady: decodeReady, reIndexs: reIndexs }, "object" == typeof module ? module.exports = ArgText : this.ArgText = ArgText }
				// Search
				class Search { constructor(e) { this.input = e } test(e) { var t = Search.getRegExp(e); return this.response = t.test(this.input) } replace(e, t) { var r = this.regExp = Search.getRegExp(e, "g"); return this.response = this.input.replace(r, t) } static getRegExp(e, t, r) { if (e) { if (r) try { return e = new RegExp(e, "g") } catch (t) { console.warn("Invalid argument - new RegExp(" + e + ',"g")') } return e = e.split("\\"), e = "(?:)" === (e = new RegExp(e.map(Search._getRegExp).join("\\\\"), t)).source ? Search.VIRTUAL_REGEXP : e } } static _getRegExp(e) { if ("" === (e = e.replace(Search.REGEXP_SPACES, ""))) return ""; var t = Search.SPACES; return t + e.split("").map(function (e) { return e.replace(Search.REGEXP_TOKENS, "\\$&") }).join(t) + t } static lenSearch(e, t) { if (!t) return []; let r, n, a = e.length, c = 0, s = a, i = 0, E = !1; for (; s !== c;)r = e.slice(c, s), (E = dict.some((e, t, E) => !!(n = new RegExp("^" + Search._getRegExp(r) + "$", "gi")).test(e[0]) && (i = t, c = s, s = a, !0))) ? console.log("[has]", dict[i]) : s-- } } Object.defineProperties(Search, { REGEXP_TOKENS: { value: /[\/\?\*\+\-\^\$\(\)\<\>\[\]\{\}\.\,\:\&\|]/g }, REGEXP_SPACES: { value: /\s+/g }, SPACES: { value: "\\s*" }, VIRTUAL_REGEXP: { value: { test: function () { return !1 }, match: function () { return null } } } });
				// similar
				(function (g) { if (typeof g.ao === 'undefined') { g.ao = {}; } var r = g.ao.similar = function similar(t, s, u) { if (null === t || null === s || void 0 === t || void 0 === s) return 0; var n, o, e, l, f = 0, i = 0, b = 0, c = (t += "").length, h = (s += "").length; for (n = 0; n < c; n++)for (o = 0; o < h; o++) { for (e = 0; n + e < c && o + e < h && t.charAt(n + e) === s.charAt(o + e); e++); e > b && (b = e, f = n, i = o) } return (l = b) && (f && i && (l += r(t.substr(0, f), s.substr(0, i))), f + b < c && i + b < h && (l += r(t.substr(f + b, c - f - b), s.substr(i + b, h - i - b)))), u ? 200 * l / (c + h) : l }; })(this);
				// Reference
				class Reference { constructor(r) { r instanceof Array || (r = []), this.from(r) } from(r) { this.array = Reference.unique(r) } add(r, t) { this.array.push([r, t]), this.from(this.array) } static enlistKey(r) { return r.filter(function (r) { return r[0] && r.toString().trim().length > 0 }) } unique(r) { return r } static unique(r) { return r } concat(r) { this.from(this.array.concat(r)) } search(r, t = 0, a = 0) { var i = this.result = []; return void 0 === r || "string" != typeof r ? i : (this.array.forEach(function (e, n) { e[a]; var s = similar(r, e[a], !0); s >= t && i.push([].concat(e, s, n)) }), i.sort(function (r, t) { var a = parseFloat(r[2]), i = parseFloat(t[2]); if (a === i) { var e = parseFloat(r[3]), n = parseFloat(t[3]); return e > n ? -1 : e === n ? 0 : 1 } return a > i ? -1 : a === i ? 0 : 1 }), i) } searchAll(r, t = 0) { var a = this.result = []; return void 0 === r || "string" != typeof r ? a : (this.array.forEach(function (i) { var e; i.some(function (a) { return (e = similar(r, a, !0)) >= t }) && a.push([e].concat(i)) }), a) } } function similar(r, t, a = !0) { return Number(ao.similar(r, t, a).toFixed(2)) }
				// dmp
				let diff_match_patch = function () { this.Diff_Timeout = 1; this.Diff_EditCost = 4; this.Match_Threshold = .5; this.Match_Distance = 1E3; this.Patch_DeleteThreshold = .5; this.Patch_Margin = 4; this.Match_MaxBits = 32 }, DIFF_DELETE = -1, DIFF_INSERT = 1, DIFF_EQUAL = 0; diff_match_patch.Diff = function (a, b) { this[0] = a; this[1] = b }; diff_match_patch.Diff.prototype.length = 2; diff_match_patch.Diff.prototype.toString = function () { return this[0] + "," + this[1] };
				diff_match_patch.prototype.diff_main = function (a, b, c, d) {
					"undefined" == typeof d && (d = 0 >= this.Diff_Timeout ? Number.MAX_VALUE : (new Date).getTime() + 1E3 * this.Diff_Timeout); if (null == a || null == b) throw Error("Null input. (diff_main)"); if (a == b) return a ? [new diff_match_patch.Diff(DIFF_EQUAL, a)] : []; "undefined" == typeof c && (c = !0); var e = c, f = this.diff_commonPrefix(a, b); c = a.substring(0, f); a = a.substring(f); b = b.substring(f); f = this.diff_commonSuffix(a, b); var g = a.substring(a.length - f); a = a.substring(0, a.length - f); b = b.substring(0,
						b.length - f); a = this.diff_compute_(a, b, e, d); c && a.unshift(new diff_match_patch.Diff(DIFF_EQUAL, c)); g && a.push(new diff_match_patch.Diff(DIFF_EQUAL, g)); this.diff_cleanupMerge(a); return a
				};
				diff_match_patch.prototype.diff_compute_ = function (a, b, c, d) {
					if (!a) return [new diff_match_patch.Diff(DIFF_INSERT, b)]; if (!b) return [new diff_match_patch.Diff(DIFF_DELETE, a)]; var e = a.length > b.length ? a : b, f = a.length > b.length ? b : a, g = e.indexOf(f); return -1 != g ? (c = [new diff_match_patch.Diff(DIFF_INSERT, e.substring(0, g)), new diff_match_patch.Diff(DIFF_EQUAL, f), new diff_match_patch.Diff(DIFF_INSERT, e.substring(g + f.length))], a.length > b.length && (c[0][0] = c[2][0] = DIFF_DELETE), c) : 1 == f.length ? [new diff_match_patch.Diff(DIFF_DELETE,
						a), new diff_match_patch.Diff(DIFF_INSERT, b)] : (e = this.diff_halfMatch_(a, b)) ? (b = e[1], f = e[3], a = e[4], e = this.diff_main(e[0], e[2], c, d), c = this.diff_main(b, f, c, d), e.concat([new diff_match_patch.Diff(DIFF_EQUAL, a)], c)) : c && 100 < a.length && 100 < b.length ? this.diff_lineMode_(a, b, d) : this.diff_bisect_(a, b, d)
				};
				diff_match_patch.prototype.diff_lineMode_ = function (a, b, c) {
					var d = this.diff_linesToChars_(a, b); a = d.chars1; b = d.chars2; d = d.lineArray; a = this.diff_main(a, b, !1, c); this.diff_charsToLines_(a, d); this.diff_cleanupSemantic(a); a.push(new diff_match_patch.Diff(DIFF_EQUAL, "")); for (var e = d = b = 0, f = "", g = ""; b < a.length;) {
						switch (a[b][0]) {
							case DIFF_INSERT: e++; g += a[b][1]; break; case DIFF_DELETE: d++; f += a[b][1]; break; case DIFF_EQUAL: if (1 <= d && 1 <= e) {
								a.splice(b - d - e, d + e); b = b - d - e; d = this.diff_main(f, g, !1, c); for (e = d.length - 1; 0 <= e; e--)a.splice(b,
									0, d[e]); b += d.length
							} d = e = 0; g = f = ""
						}b++
					} a.pop(); return a
				};
				diff_match_patch.prototype.diff_bisect_ = function (a, b, c) {
					for (var d = a.length, e = b.length, f = Math.ceil((d + e) / 2), g = 2 * f, h = Array(g), l = Array(g), k = 0; k < g; k++)h[k] = -1, l[k] = -1; h[f + 1] = 0; l[f + 1] = 0; k = d - e; for (var m = 0 != k % 2, p = 0, x = 0, w = 0, q = 0, t = 0; t < f && !((new Date).getTime() > c); t++) {
						for (var v = -t + p; v <= t - x; v += 2) {
							var n = f + v; var r = v == -t || v != t && h[n - 1] < h[n + 1] ? h[n + 1] : h[n - 1] + 1; for (var y = r - v; r < d && y < e && a.charAt(r) == b.charAt(y);)r++ , y++; h[n] = r; if (r > d) x += 2; else if (y > e) p += 2; else if (m && (n = f + k - v, 0 <= n && n < g && -1 != l[n])) {
								var u = d - l[n]; if (r >=
									u) return this.diff_bisectSplit_(a, b, r, y, c)
							}
						} for (v = -t + w; v <= t - q; v += 2) { n = f + v; u = v == -t || v != t && l[n - 1] < l[n + 1] ? l[n + 1] : l[n - 1] + 1; for (r = u - v; u < d && r < e && a.charAt(d - u - 1) == b.charAt(e - r - 1);)u++ , r++; l[n] = u; if (u > d) q += 2; else if (r > e) w += 2; else if (!m && (n = f + k - v, 0 <= n && n < g && -1 != h[n] && (r = h[n], y = f + r - n, u = d - u, r >= u))) return this.diff_bisectSplit_(a, b, r, y, c) }
					} return [new diff_match_patch.Diff(DIFF_DELETE, a), new diff_match_patch.Diff(DIFF_INSERT, b)]
				};
				diff_match_patch.prototype.diff_bisectSplit_ = function (a, b, c, d, e) { var f = a.substring(0, c), g = b.substring(0, d); a = a.substring(c); b = b.substring(d); f = this.diff_main(f, g, !1, e); e = this.diff_main(a, b, !1, e); return f.concat(e) };
				diff_match_patch.prototype.diff_linesToChars_ = function (a, b) { function c(a) { for (var b = "", c = 0, g = -1, h = d.length; g < a.length - 1;) { g = a.indexOf("\n", c); -1 == g && (g = a.length - 1); var l = a.substring(c, g + 1); (e.hasOwnProperty ? e.hasOwnProperty(l) : void 0 !== e[l]) ? b += String.fromCharCode(e[l]) : (h == f && (l = a.substring(c), g = a.length), b += String.fromCharCode(h), e[l] = h, d[h++] = l); c = g + 1 } return b } var d = [], e = {}; d[0] = ""; var f = 4E4, g = c(a); f = 65535; var h = c(b); return { chars1: g, chars2: h, lineArray: d } };
				diff_match_patch.prototype.diff_charsToLines_ = function (a, b) { for (var c = 0; c < a.length; c++) { for (var d = a[c][1], e = [], f = 0; f < d.length; f++)e[f] = b[d.charCodeAt(f)]; a[c][1] = e.join("") } }; diff_match_patch.prototype.diff_commonPrefix = function (a, b) { if (!a || !b || a.charAt(0) != b.charAt(0)) return 0; for (var c = 0, d = Math.min(a.length, b.length), e = d, f = 0; c < e;)a.substring(f, e) == b.substring(f, e) ? f = c = e : d = e, e = Math.floor((d - c) / 2 + c); return e };
				diff_match_patch.prototype.diff_commonSuffix = function (a, b) { if (!a || !b || a.charAt(a.length - 1) != b.charAt(b.length - 1)) return 0; for (var c = 0, d = Math.min(a.length, b.length), e = d, f = 0; c < e;)a.substring(a.length - e, a.length - f) == b.substring(b.length - e, b.length - f) ? f = c = e : d = e, e = Math.floor((d - c) / 2 + c); return e };
				diff_match_patch.prototype.diff_commonOverlap_ = function (a, b) { var c = a.length, d = b.length; if (0 == c || 0 == d) return 0; c > d ? a = a.substring(c - d) : c < d && (b = b.substring(0, c)); c = Math.min(c, d); if (a == b) return c; d = 0; for (var e = 1; ;) { var f = a.substring(c - e); f = b.indexOf(f); if (-1 == f) return d; e += f; if (0 == f || a.substring(c - e) == b.substring(0, e)) d = e, e++ } };
				diff_match_patch.prototype.diff_halfMatch_ = function (a, b) {
					function c(a, b, c) { for (var d = a.substring(c, c + Math.floor(a.length / 4)), e = -1, g = "", h, k, l, m; -1 != (e = b.indexOf(d, e + 1));) { var p = f.diff_commonPrefix(a.substring(c), b.substring(e)), u = f.diff_commonSuffix(a.substring(0, c), b.substring(0, e)); g.length < u + p && (g = b.substring(e - u, e) + b.substring(e, e + p), h = a.substring(0, c - u), k = a.substring(c + p), l = b.substring(0, e - u), m = b.substring(e + p)) } return 2 * g.length >= a.length ? [h, k, l, m, g] : null } if (0 >= this.Diff_Timeout) return null;
					var d = a.length > b.length ? a : b, e = a.length > b.length ? b : a; if (4 > d.length || 2 * e.length < d.length) return null; var f = this, g = c(d, e, Math.ceil(d.length / 4)); d = c(d, e, Math.ceil(d.length / 2)); if (g || d) g = d ? g ? g[4].length > d[4].length ? g : d : d : g; else return null; if (a.length > b.length) { d = g[0]; e = g[1]; var h = g[2]; var l = g[3] } else h = g[0], l = g[1], d = g[2], e = g[3]; return [d, e, h, l, g[4]]
				};
				diff_match_patch.prototype.diff_cleanupSemantic = function (a) {
					for (var b = !1, c = [], d = 0, e = null, f = 0, g = 0, h = 0, l = 0, k = 0; f < a.length;)a[f][0] == DIFF_EQUAL ? (c[d++] = f, g = l, h = k, k = l = 0, e = a[f][1]) : (a[f][0] == DIFF_INSERT ? l += a[f][1].length : k += a[f][1].length, e && e.length <= Math.max(g, h) && e.length <= Math.max(l, k) && (a.splice(c[d - 1], 0, new diff_match_patch.Diff(DIFF_DELETE, e)), a[c[d - 1] + 1][0] = DIFF_INSERT, d-- , d-- , f = 0 < d ? c[d - 1] : -1, k = l = h = g = 0, e = null, b = !0)), f++; b && this.diff_cleanupMerge(a); this.diff_cleanupSemanticLossless(a); for (f = 1; f <
						a.length;) {
						if (a[f - 1][0] == DIFF_DELETE && a[f][0] == DIFF_INSERT) {
							b = a[f - 1][1]; c = a[f][1]; d = this.diff_commonOverlap_(b, c); e = this.diff_commonOverlap_(c, b); if (d >= e) { if (d >= b.length / 2 || d >= c.length / 2) a.splice(f, 0, new diff_match_patch.Diff(DIFF_EQUAL, c.substring(0, d))), a[f - 1][1] = b.substring(0, b.length - d), a[f + 1][1] = c.substring(d), f++ } else if (e >= b.length / 2 || e >= c.length / 2) a.splice(f, 0, new diff_match_patch.Diff(DIFF_EQUAL, b.substring(0, e))), a[f - 1][0] = DIFF_INSERT, a[f - 1][1] = c.substring(0, c.length - e), a[f + 1][0] = DIFF_DELETE,
								a[f + 1][1] = b.substring(e), f++; f++
						} f++
					}
				};
				diff_match_patch.prototype.diff_cleanupSemanticLossless = function (a) {
					function b(a, b) {
						if (!a || !b) return 6; var c = a.charAt(a.length - 1), d = b.charAt(0), e = c.match(diff_match_patch.nonAlphaNumericRegex_), f = d.match(diff_match_patch.nonAlphaNumericRegex_), g = e && c.match(diff_match_patch.whitespaceRegex_), h = f && d.match(diff_match_patch.whitespaceRegex_); c = g && c.match(diff_match_patch.linebreakRegex_); d = h && d.match(diff_match_patch.linebreakRegex_); var k = c && a.match(diff_match_patch.blanklineEndRegex_), l = d && b.match(diff_match_patch.blanklineStartRegex_);
						return k || l ? 5 : c || d ? 4 : e && !g && h ? 3 : g || h ? 2 : e || f ? 1 : 0
					} for (var c = 1; c < a.length - 1;) {
						if (a[c - 1][0] == DIFF_EQUAL && a[c + 1][0] == DIFF_EQUAL) {
							var d = a[c - 1][1], e = a[c][1], f = a[c + 1][1], g = this.diff_commonSuffix(d, e); if (g) { var h = e.substring(e.length - g); d = d.substring(0, d.length - g); e = h + e.substring(0, e.length - g); f = h + f } g = d; h = e; for (var l = f, k = b(d, e) + b(e, f); e.charAt(0) === f.charAt(0);) { d += e.charAt(0); e = e.substring(1) + f.charAt(0); f = f.substring(1); var m = b(d, e) + b(e, f); m >= k && (k = m, g = d, h = e, l = f) } a[c - 1][1] != g && (g ? a[c - 1][1] = g : (a.splice(c -
								1, 1), c--), a[c][1] = h, l ? a[c + 1][1] = l : (a.splice(c + 1, 1), c--))
						} c++
					}
				}; diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/; diff_match_patch.whitespaceRegex_ = /\s/; diff_match_patch.linebreakRegex_ = /[\r\n]/; diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/; diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;
				diff_match_patch.prototype.diff_cleanupEfficiency = function (a) { for (var b = !1, c = [], d = 0, e = null, f = 0, g = !1, h = !1, l = !1, k = !1; f < a.length;)a[f][0] == DIFF_EQUAL ? (a[f][1].length < this.Diff_EditCost && (l || k) ? (c[d++] = f, g = l, h = k, e = a[f][1]) : (d = 0, e = null), l = k = !1) : (a[f][0] == DIFF_DELETE ? k = !0 : l = !0, e && (g && h && l && k || e.length < this.Diff_EditCost / 2 && 3 == g + h + l + k) && (a.splice(c[d - 1], 0, new diff_match_patch.Diff(DIFF_DELETE, e)), a[c[d - 1] + 1][0] = DIFF_INSERT, d-- , e = null, g && h ? (l = k = !0, d = 0) : (d-- , f = 0 < d ? c[d - 1] : -1, l = k = !1), b = !0)), f++; b && this.diff_cleanupMerge(a) };
				diff_match_patch.prototype.diff_cleanupMerge = function (a) {
					a.push(new diff_match_patch.Diff(DIFF_EQUAL, "")); for (var b = 0, c = 0, d = 0, e = "", f = "", g; b < a.length;)switch (a[b][0]) {
						case DIFF_INSERT: d++; f += a[b][1]; b++; break; case DIFF_DELETE: c++; e += a[b][1]; b++; break; case DIFF_EQUAL: 1 < c + d ? (0 !== c && 0 !== d && (g = this.diff_commonPrefix(f, e), 0 !== g && (0 < b - c - d && a[b - c - d - 1][0] == DIFF_EQUAL ? a[b - c - d - 1][1] += f.substring(0, g) : (a.splice(0, 0, new diff_match_patch.Diff(DIFF_EQUAL, f.substring(0, g))), b++), f = f.substring(g), e = e.substring(g)),
							g = this.diff_commonSuffix(f, e), 0 !== g && (a[b][1] = f.substring(f.length - g) + a[b][1], f = f.substring(0, f.length - g), e = e.substring(0, e.length - g))), b -= c + d, a.splice(b, c + d), e.length && (a.splice(b, 0, new diff_match_patch.Diff(DIFF_DELETE, e)), b++), f.length && (a.splice(b, 0, new diff_match_patch.Diff(DIFF_INSERT, f)), b++), b++) : 0 !== b && a[b - 1][0] == DIFF_EQUAL ? (a[b - 1][1] += a[b][1], a.splice(b, 1)) : b++ , c = d = 0, f = e = ""
					}"" === a[a.length - 1][1] && a.pop(); c = !1; for (b = 1; b < a.length - 1;)a[b - 1][0] == DIFF_EQUAL && a[b + 1][0] == DIFF_EQUAL && (a[b][1].substring(a[b][1].length -
						a[b - 1][1].length) == a[b - 1][1] ? (a[b][1] = a[b - 1][1] + a[b][1].substring(0, a[b][1].length - a[b - 1][1].length), a[b + 1][1] = a[b - 1][1] + a[b + 1][1], a.splice(b - 1, 1), c = !0) : a[b][1].substring(0, a[b + 1][1].length) == a[b + 1][1] && (a[b - 1][1] += a[b + 1][1], a[b][1] = a[b][1].substring(a[b + 1][1].length) + a[b + 1][1], a.splice(b + 1, 1), c = !0)), b++; c && this.diff_cleanupMerge(a)
				};
				diff_match_patch.prototype.diff_xIndex = function (a, b) { var c = 0, d = 0, e = 0, f = 0, g; for (g = 0; g < a.length; g++) { a[g][0] !== DIFF_INSERT && (c += a[g][1].length); a[g][0] !== DIFF_DELETE && (d += a[g][1].length); if (c > b) break; e = c; f = d } return a.length != g && a[g][0] === DIFF_DELETE ? f : f + (b - e) };
				diff_match_patch.prototype.diff_prettyHtml = function (a) { for (var b = [], c = /&/g, d = /</g, e = />/g, f = /\n/g, g = 0; g < a.length; g++) { var h = a[g][0], l = a[g][1].replace(c, "&amp;").replace(d, "&lt;").replace(e, "&gt;").replace(f, "&#8629;<br>"); switch (h) { case DIFF_INSERT: b[g] = '<ins>' + l + '</ins>'; break; case DIFF_DELETE: b[g] = '<del>' + l + '</del>'; break; case DIFF_EQUAL: b[g] = '<span>' + l + '</span>' } } return b.join("") };
				diff_match_patch.prototype.diff_text1 = function (a) { for (var b = [], c = 0; c < a.length; c++)a[c][0] !== DIFF_INSERT && (b[c] = a[c][1]); return b.join("") }; diff_match_patch.prototype.diff_text2 = function (a) { for (var b = [], c = 0; c < a.length; c++)a[c][0] !== DIFF_DELETE && (b[c] = a[c][1]); return b.join("") };
				diff_match_patch.prototype.diff_levenshtein = function (a) { for (var b = 0, c = 0, d = 0, e = 0; e < a.length; e++) { var f = a[e][1]; switch (a[e][0]) { case DIFF_INSERT: c += f.length; break; case DIFF_DELETE: d += f.length; break; case DIFF_EQUAL: b += Math.max(c, d), d = c = 0 } } return b += Math.max(c, d) };
				diff_match_patch.prototype.diff_toDelta = function (a) { for (var b = [], c = 0; c < a.length; c++)switch (a[c][0]) { case DIFF_INSERT: b[c] = "+" + encodeURI(a[c][1]); break; case DIFF_DELETE: b[c] = "-" + a[c][1].length; break; case DIFF_EQUAL: b[c] = "=" + a[c][1].length }return b.join("\t").replace(/%20/g, " ") };
				diff_match_patch.prototype.diff_fromDelta = function (a, b) {
					for (var c = [], d = 0, e = 0, f = b.split(/\t/g), g = 0; g < f.length; g++) {
						var h = f[g].substring(1); switch (f[g].charAt(0)) {
							case "+": try { c[d++] = new diff_match_patch.Diff(DIFF_INSERT, decodeURI(h)) } catch (k) { throw Error("Illegal escape in diff_fromDelta: " + h); } break; case "-": case "=": var l = parseInt(h, 10); if (isNaN(l) || 0 > l) throw Error("Invalid number in diff_fromDelta: " + h); h = a.substring(e, e += l); "=" == f[g].charAt(0) ? c[d++] = new diff_match_patch.Diff(DIFF_EQUAL, h) : c[d++] =
								new diff_match_patch.Diff(DIFF_DELETE, h); break; default: if (f[g]) throw Error("Invalid diff operation in diff_fromDelta: " + f[g]);
						}
					} if (e != a.length) throw Error("Delta length (" + e + ") does not equal source text length (" + a.length + ")."); return c
				}; diff_match_patch.prototype.match_main = function (a, b, c) { if (null == a || null == b || null == c) throw Error("Null input. (match_main)"); c = Math.max(0, Math.min(c, a.length)); return a == b ? 0 : a.length ? a.substring(c, c + b.length) == b ? c : this.match_bitap_(a, b, c) : -1 };
				diff_match_patch.prototype.match_bitap_ = function (a, b, c) {
					function d(a, d) { var e = a / b.length, g = Math.abs(c - d); return f.Match_Distance ? e + g / f.Match_Distance : g ? 1 : e } if (b.length > this.Match_MaxBits) throw Error("Pattern too long for this browser."); var e = this.match_alphabet_(b), f = this, g = this.Match_Threshold, h = a.indexOf(b, c); -1 != h && (g = Math.min(d(0, h), g), h = a.lastIndexOf(b, c + b.length), -1 != h && (g = Math.min(d(0, h), g))); var l = 1 << b.length - 1; h = -1; for (var k, m, p = b.length + a.length, x, w = 0; w < b.length; w++) {
						k = 0; for (m = p; k < m;)d(w,
							c + m) <= g ? k = m : p = m, m = Math.floor((p - k) / 2 + k); p = m; k = Math.max(1, c - m + 1); var q = Math.min(c + m, a.length) + b.length; m = Array(q + 2); for (m[q + 1] = (1 << w) - 1; q >= k; q--) { var t = e[a.charAt(q - 1)]; m[q] = 0 === w ? (m[q + 1] << 1 | 1) & t : (m[q + 1] << 1 | 1) & t | (x[q + 1] | x[q]) << 1 | 1 | x[q + 1]; if (m[q] & l && (t = d(w, q - 1), t <= g)) if (g = t, h = q - 1, h > c) k = Math.max(1, 2 * c - h); else break } if (d(w + 1, c) > g) break; x = m
					} return h
				};
				diff_match_patch.prototype.match_alphabet_ = function (a) { for (var b = {}, c = 0; c < a.length; c++)b[a.charAt(c)] = 0; for (c = 0; c < a.length; c++)b[a.charAt(c)] |= 1 << a.length - c - 1; return b };
				diff_match_patch.prototype.patch_addContext_ = function (a, b) {
					if (0 != b.length) {
						if (null === a.start2) throw Error("patch not initialized"); for (var c = b.substring(a.start2, a.start2 + a.length1), d = 0; b.indexOf(c) != b.lastIndexOf(c) && c.length < this.Match_MaxBits - this.Patch_Margin - this.Patch_Margin;)d += this.Patch_Margin, c = b.substring(a.start2 - d, a.start2 + a.length1 + d); d += this.Patch_Margin; (c = b.substring(a.start2 - d, a.start2)) && a.diffs.unshift(new diff_match_patch.Diff(DIFF_EQUAL, c)); (d = b.substring(a.start2 + a.length1,
							a.start2 + a.length1 + d)) && a.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, d)); a.start1 -= c.length; a.start2 -= c.length; a.length1 += c.length + d.length; a.length2 += c.length + d.length
					}
				};
				diff_match_patch.prototype.patch_make = function (a, b, c) {
					if ("string" == typeof a && "string" == typeof b && "undefined" == typeof c) { var d = a; b = this.diff_main(d, b, !0); 2 < b.length && (this.diff_cleanupSemantic(b), this.diff_cleanupEfficiency(b)) } else if (a && "object" == typeof a && "undefined" == typeof b && "undefined" == typeof c) b = a, d = this.diff_text1(b); else if ("string" == typeof a && b && "object" == typeof b && "undefined" == typeof c) d = a; else if ("string" == typeof a && "string" == typeof b && c && "object" == typeof c) d = a, b = c; else throw Error("Unknown call format to patch_make.");
					if (0 === b.length) return []; c = []; a = new diff_match_patch.patch_obj; for (var e = 0, f = 0, g = 0, h = d, l = 0; l < b.length; l++) {
						var k = b[l][0], m = b[l][1]; e || k === DIFF_EQUAL || (a.start1 = f, a.start2 = g); switch (k) {
							case DIFF_INSERT: a.diffs[e++] = b[l]; a.length2 += m.length; d = d.substring(0, g) + m + d.substring(g); break; case DIFF_DELETE: a.length1 += m.length; a.diffs[e++] = b[l]; d = d.substring(0, g) + d.substring(g + m.length); break; case DIFF_EQUAL: m.length <= 2 * this.Patch_Margin && e && b.length != l + 1 ? (a.diffs[e++] = b[l], a.length1 += m.length, a.length2 += m.length) :
								m.length >= 2 * this.Patch_Margin && e && (this.patch_addContext_(a, h), c.push(a), a = new diff_match_patch.patch_obj, e = 0, h = d, f = g)
						}k !== DIFF_INSERT && (f += m.length); k !== DIFF_DELETE && (g += m.length)
					} e && (this.patch_addContext_(a, h), c.push(a)); return c
				};
				diff_match_patch.prototype.patch_deepCopy = function (a) { for (var b = [], c = 0; c < a.length; c++) { var d = a[c], e = new diff_match_patch.patch_obj; e.diffs = []; for (var f = 0; f < d.diffs.length; f++)e.diffs[f] = new diff_match_patch.Diff(d.diffs[f][0], d.diffs[f][1]); e.start1 = d.start1; e.start2 = d.start2; e.length1 = d.length1; e.length2 = d.length2; b[c] = e } return b };
				diff_match_patch.prototype.patch_apply = function (a, b) {
					if (0 == a.length) return [b, []]; a = this.patch_deepCopy(a); var c = this.patch_addPadding(a); b = c + b + c; this.patch_splitMax(a); for (var d = 0, e = [], f = 0; f < a.length; f++) {
						var g = a[f].start2 + d, h = this.diff_text1(a[f].diffs), l = -1; if (h.length > this.Match_MaxBits) { var k = this.match_main(b, h.substring(0, this.Match_MaxBits), g); -1 != k && (l = this.match_main(b, h.substring(h.length - this.Match_MaxBits), g + h.length - this.Match_MaxBits), -1 == l || k >= l) && (k = -1) } else k = this.match_main(b, h,
							g); if (-1 == k) e[f] = !1, d -= a[f].length2 - a[f].length1; else if (e[f] = !0, d = k - g, g = -1 == l ? b.substring(k, k + h.length) : b.substring(k, l + this.Match_MaxBits), h == g) b = b.substring(0, k) + this.diff_text2(a[f].diffs) + b.substring(k + h.length); else if (g = this.diff_main(h, g, !1), h.length > this.Match_MaxBits && this.diff_levenshtein(g) / h.length > this.Patch_DeleteThreshold) e[f] = !1; else {
								this.diff_cleanupSemanticLossless(g); h = 0; var m; for (l = 0; l < a[f].diffs.length; l++) {
									var p = a[f].diffs[l]; p[0] !== DIFF_EQUAL && (m = this.diff_xIndex(g, h)); p[0] ===
										DIFF_INSERT ? b = b.substring(0, k + m) + p[1] + b.substring(k + m) : p[0] === DIFF_DELETE && (b = b.substring(0, k + m) + b.substring(k + this.diff_xIndex(g, h + p[1].length))); p[0] !== DIFF_DELETE && (h += p[1].length)
								}
							}
					} b = b.substring(c.length, b.length - c.length); return [b, e]
				};
				diff_match_patch.prototype.patch_addPadding = function (a) {
					for (var b = this.Patch_Margin, c = "", d = 1; d <= b; d++)c += String.fromCharCode(d); for (d = 0; d < a.length; d++)a[d].start1 += b, a[d].start2 += b; d = a[0]; var e = d.diffs; if (0 == e.length || e[0][0] != DIFF_EQUAL) e.unshift(new diff_match_patch.Diff(DIFF_EQUAL, c)), d.start1 -= b, d.start2 -= b, d.length1 += b, d.length2 += b; else if (b > e[0][1].length) { var f = b - e[0][1].length; e[0][1] = c.substring(e[0][1].length) + e[0][1]; d.start1 -= f; d.start2 -= f; d.length1 += f; d.length2 += f } d = a[a.length - 1]; e = d.diffs;
					0 == e.length || e[e.length - 1][0] != DIFF_EQUAL ? (e.push(new diff_match_patch.Diff(DIFF_EQUAL, c)), d.length1 += b, d.length2 += b) : b > e[e.length - 1][1].length && (f = b - e[e.length - 1][1].length, e[e.length - 1][1] += c.substring(0, f), d.length1 += f, d.length2 += f); return c
				};
				diff_match_patch.prototype.patch_splitMax = function (a) {
					for (var b = this.Match_MaxBits, c = 0; c < a.length; c++)if (!(a[c].length1 <= b)) {
						var d = a[c]; a.splice(c--, 1); for (var e = d.start1, f = d.start2, g = ""; 0 !== d.diffs.length;) {
							var h = new diff_match_patch.patch_obj, l = !0; h.start1 = e - g.length; h.start2 = f - g.length; "" !== g && (h.length1 = h.length2 = g.length, h.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, g))); for (; 0 !== d.diffs.length && h.length1 < b - this.Patch_Margin;) {
								g = d.diffs[0][0]; var k = d.diffs[0][1]; g === DIFF_INSERT ? (h.length2 +=
									k.length, f += k.length, h.diffs.push(d.diffs.shift()), l = !1) : g === DIFF_DELETE && 1 == h.diffs.length && h.diffs[0][0] == DIFF_EQUAL && k.length > 2 * b ? (h.length1 += k.length, e += k.length, l = !1, h.diffs.push(new diff_match_patch.Diff(g, k)), d.diffs.shift()) : (k = k.substring(0, b - h.length1 - this.Patch_Margin), h.length1 += k.length, e += k.length, g === DIFF_EQUAL ? (h.length2 += k.length, f += k.length) : l = !1, h.diffs.push(new diff_match_patch.Diff(g, k)), k == d.diffs[0][1] ? d.diffs.shift() : d.diffs[0][1] = d.diffs[0][1].substring(k.length))
							} g = this.diff_text2(h.diffs);
							g = g.substring(g.length - this.Patch_Margin); k = this.diff_text1(d.diffs).substring(0, this.Patch_Margin); "" !== k && (h.length1 += k.length, h.length2 += k.length, 0 !== h.diffs.length && h.diffs[h.diffs.length - 1][0] === DIFF_EQUAL ? h.diffs[h.diffs.length - 1][1] += k : h.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, k))); l || a.splice(++c, 0, h)
						}
					}
				}; diff_match_patch.prototype.patch_toText = function (a) { for (var b = [], c = 0; c < a.length; c++)b[c] = a[c]; return b.join("") };
				diff_match_patch.prototype.patch_fromText = function (a) {
					var b = []; if (!a) return b; a = a.split("\n"); for (var c = 0, d = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/; c < a.length;) {
						var e = a[c].match(d); if (!e) throw Error("Invalid patch string: " + a[c]); var f = new diff_match_patch.patch_obj; b.push(f); f.start1 = parseInt(e[1], 10); "" === e[2] ? (f.start1-- , f.length1 = 1) : "0" == e[2] ? f.length1 = 0 : (f.start1-- , f.length1 = parseInt(e[2], 10)); f.start2 = parseInt(e[3], 10); "" === e[4] ? (f.start2-- , f.length2 = 1) : "0" == e[4] ? f.length2 = 0 : (f.start2-- , f.length2 =
							parseInt(e[4], 10)); for (c++; c < a.length;) { e = a[c].charAt(0); try { var g = decodeURI(a[c].substring(1)) } catch (h) { throw Error("Illegal escape in patch_fromText: " + g); } if ("-" == e) f.diffs.push(new diff_match_patch.Diff(DIFF_DELETE, g)); else if ("+" == e) f.diffs.push(new diff_match_patch.Diff(DIFF_INSERT, g)); else if (" " == e) f.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL, g)); else if ("@" == e) break; else if ("" !== e) throw Error('Invalid patch mode "' + e + '" in: ' + g); c++ }
					} return b
				};
				diff_match_patch.patch_obj = function () { this.diffs = []; this.start2 = this.start1 = null; this.length2 = this.length1 = 0 };
				diff_match_patch.patch_obj.prototype.toString = function () { for (var a = ["@@ -" + (0 === this.length1 ? this.start1 + ",0" : 1 == this.length1 ? this.start1 + 1 : this.start1 + 1 + "," + this.length1) + " +" + (0 === this.length2 ? this.start2 + ",0" : 1 == this.length2 ? this.start2 + 1 : this.start2 + 1 + "," + this.length2) + " @@\n"], b, c = 0; c < this.diffs.length; c++) { switch (this.diffs[c][0]) { case DIFF_INSERT: b = "+"; break; case DIFF_DELETE: b = "-"; break; case DIFF_EQUAL: b = " " }a[c + 1] = b + encodeURI(this.diffs[c][1]) + "\n" } return a.join("").replace(/%20/g, " ") };
				this.diff_match_patch = diff_match_patch; this.DIFF_DELETE = DIFF_DELETE; this.DIFF_INSERT = DIFF_INSERT; this.DIFF_EQUAL = DIFF_EQUAL;

				// kkv
				function kkv(e, t, arr) { let dict = new Reference(arr); let i = (new diff_match_patch).diff_main(t.source || t[0], e).filter(e => 0 !== e[0]); if (2 === i.length && -1 === i[0][0] && 1 === i[1][0]) { let e = dict.search(i[0][1], 100)[0]; if (e) { let f = dict.search(i[1][1], 100)[0]; if (f) { let i = t.target || t[1]; if (i) return i.replace(e[1], f[1]) } } } return !1 }

				const { log } = console
				onmessage = function ({ data: { array, st, o } }) {
					let result = run(new Reference(array), st, o)
					// 直接找到一致内容。
					if (result) postMessage(result)
					close()
				}

				// smartMath
				function smartMatch(source, sourceTargetArray, dict) {
					log(sourceTargetArray)
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
					} else {
						ret = sourceTargetArray[1];
						var startResult = [];
						startResult.push('❌ No smart');
						startResult.push('[*]' + d1.join('|') + ' <- ' + d2.join('|'));
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

				function run(dict, st, o) {
					if (st in o) {
						// t  需要填充的该target单元格
						// st t单元格的当前内容
						// tt 需要填充的100%匹配的最新内容
						let tt = o[st]
						// 已经填好的内容与100%内容一致时，直接退出操作。
						if (st === tt) return { removeClass: 'done doneAuto doneAutoSpace doneAutoNumber doneSmart', addClass: 'done' };
						// if (clickEvent.altKey) return t.parent().remove();
						return { text: tt, removeClass: 'done doneAuto doneAutoSpace doneAutoNumber doneSmart', addClass: 'doneAuto' };
					}

					// 如果没有直接找到一致内容，则需要只能匹配了。
					// 智能忽略空格匹配
					if (st.length === 0) { return; }
					var regexp = new RegExp('^' + Search.getRegExp(st).source + '$');
					for (var k in o) {
						if (regexp.test(k)) {
							// 找到一致内容
							// if (clickEvent.altKey) return t.parent().remove();
							return { text: o[k], removeClass: 'done doneAuto doneAutoSpace doneAutoNumber doneSmart', addClass: 'doneAutoSpace' };// 淡灰色
						}
					}

					// 数值匹配
					{
						let result = '', accepted, p;
						let regExp = ArgText.numberRegExp;
						let stNoNumber = st.replace(regExp, '');
						if (regExp.test(st)) {
							let arr = dict.array;
							arr.some(e => {
								let s = e[0], t = e[1];
								if (regExp.test(s)) {
									let sNoNumber = s.replace(regExp, '');
									if (sNoNumber === stNoNumber) {
										p = ArgText.makeTextPair(s, t);
										let stMade = ArgText.makeText(st);
										accepted = p.a.args.length === stMade.args.length
										if (accepted) {
											result = p.make(stMade.args);
										}
										return accepted;
									}
								}
							});

							if (accepted) {
								return { text: result, removeClass: 'done doneAuto doneAutoSpace doneAutoNumber doneSmart', addClass: p.accepted ? 'doneAutoNumber' : 'doneSmart' };// 不要继续往下执行。
							}
						}
					}

					// 一个词的替换
					{
						if (dict.search(st, 80).some(kv => {
							let tt;
							try {
								tt = kkv(st, kv, dict.array)
							} catch (err) {
								console.warn(err)
							}
							if (tt) {
								return { text: tt, addClass: 'doneAutoNumber' }
							}
						})) {
							return {};
						}
					}



					// 只能忽略数字英文符号等的匹配。
					var filterRegExp = /[\x00-\xff]/g, _k, _v;
					for (var k in o) {
						_k = k.replace(filterRegExp, '');
						if (_k == st.replace(filterRegExp, '')) {
							let v = smartMatch(st, [k, o[k]], dict);
							return { text: v, addClass: 'doneSmart' };
						}
					}

					// 实在是没有找到，需要做最后的处理。
					// 按下ctrl时，保留原来内容。按下alt时，删除找到的内容。找到内容时，自动替换背景颜色为灰色。
					// if (!clickEvent.ctrlKey) {
					// 	t.text('').removeAttr('style');
					// }
					return {}
				}
			},
				function (data) {// 自动匹配后执行的操作
					if (data) {
						let { text, addClass, removeClass } = data

						if (Reflect.has(data, 'text')) t.text(text)
						if (Reflect.has(data, 'removeClass')) t.removeClass(removeClass)
						if (Reflect.has(data, 'addClass')) t.addClass(addClass)
						// if (text) log(st, text)
					}
					t.removeClass('wait')
					worker.terminate()
					delete match100workers[objectId]
					resolve()
					if (match100fns.length === 0) {
						let last = t.last()
						last.focus()// 激活焦点 2019.03.22
						log(last[0])
						SM.s.selectAllChildren(last[0])// 选取内容
					}
				})
			worker.postMessage({ array, st, o })
			match100workers[objectId] = worker
		})
		// }


	}
}











// ddb-move-new
function pushlog() {
	var clog = createCustomLog.apply(null, arguments);
	if (clog) {
		clog.prependTo('#clogs');
	}
}

function pushloghtml(v) {
	$(`<p class="clog">`).prependTo(`#clogs`).html(v);
}
// arg为string时，视为信息。arg为object时，视为css。
function createCustomLog(...args) {
	let length = args.length, header, content, style = {}, contents = [];

	if (length === 0) {
		return;
	} else {
		let tr = $('<tr class="clog"></tr>');
		args.forEach(e => {
			let type = typeof e;
			if (type === 'string' || type === 'number') {
				contents.push(e);
			} else if (e === 'object') {
				Object.assign(style, e);
			}
		});

		content = contents.join('\n');
		tr.append($('<td>').text(content).css(style));

		return tr;
	}
}


// 格式化名称
function formatName(n) {
	return n.replace(/[\\\/\:\*\?\"\<\>\|\&\-\+\=\`\~\%\!\@\#\$\%\^\,\.\;\:\'\(\)\{\}\[\]\s]/g, '_');
}



// 过滤dictArray的source空格分隔数小于等于n
function filterStep(arr, n = 0) {
	return arr.filter(function (e) {
		var v = e[0];
		if (v) {
			v = v.trim().match(/\s+/g);
			if (v) {
				return v.length <= n;
			} else {
				return true;
			}
		}
		return false;
	});
}

// 过滤一些标签
function filterTag(arr) {
	var rs = [], regExp = /\[[a-z0-9\-]+?\]|\{[\d+?]\}|[\(\)\[\]\{\}\<\>\"\'\`\!\！\,\，\.\。\…\?\？]|^\d+$/ig;
	arr.forEach(function (e) {
		var s = e[0], t = e[1];
		if (s) {
			s = s.trim();
			if (s) {
				s = s.replace(regExp, '');
				if (t) {
					t = t.replace(regExp, '');
				}
				rs.push([s, t]);
			}
		}
	});
	return rs;
}

function filterLength(arr, max = 16, min = 2) {
	return arr.filter(function (e) {
		var s = e[0];
		if (s) {
			s = s.trim();
			if (s) {
				var length = s.length;
				return length <= max && length >= min;
			}
		}
		return false;
	})
}

function filterDict() {
	var rs = filterStep(dict.array, 0);
	rs = filterTag(rs);
	rs = filterLength(rs, 10);
	return rs;
}

function downloadFile(filename, content) {
	var a = document.createElement('a');
	var blob = new Blob([content]);
	var url = window.URL.createObjectURL(blob);
	// filename = filename + formatName(location.search) + '_' + Date.now() + '.txt';
	filename += '.txt'

	a.href = url;
	a.download = filename;
	a.click();
	window.URL.revokeObjectURL(url);
}

function downloadFile2(fileName, content) {
	var aLink = document.createElement('a');
	var blob = new Blob([content]);
	var evt = document.createEvent("HTMLEvents");
	evt.initEvent("click", false, false);//initEvent 不加后两个参数在FF下会报错, 感谢 Barret Lee 的反馈
	aLink.download = fileName;
	aLink.href = URL.createObjectURL(blob);
	aLink.dispatchEvent(evt);
}




// downloadExcel
function doit(table, fn, type, dl) {
	var elt = document.getElementById('works');
	var wb = XLSX.utils.table_to_book(elt, { sheet: "Sheet1" });
	return dl ?
		XLSX.write(wb, { bookType: type, bookSST: true, type: 'base64' }) :
		XLSX.writeFile(wb, fn || ('test.' + (type || 'xlsx')));
}

function smartMatch(source, sourceTargetArray) {
	log(sourceTargetArray)
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


// 查找表情符号用
function imo(begin, count) { while (count-- > 0) console.log(String.fromCharCode(55357, begin++)); }


// var password='a';
// if(ao.ls.get('licensePassword')!==password){
// 	var licensePassword=prompt('Input your license Password!');
// 	if(licensePassword===password) {
// 		ao.ls.set('licensePassword',licensePassword);
// 		// document.write('You do not have permission');
// 	}else{
// 		alert('You do not have permission. '+licensePassword);
// 		location.href=location.href;
// 	}
// }



// $(document).on('keydown','#tempResult',function(e){
// 	if(e.keyCode===27){
// 		hideTempResult();
// 	}
// })
// function showTempResult(text){
// 	$('#tempResult').text(text).height(window.innerHeight).removeClass('hide').trigger('select');
// 	document.execCommand('copy',true);
// 	hideTempResult();
// }
// function hideTempResult(){
// 	$('#tempResult').addClass('hide').text('');
// }
function copyToTempResult(data) {
	let ta = $('#tempResult').get(0)
	ta.value = data
	ta.select()
	document.execCommand('copy', true);
	var length = data.length;
	pushlog('Copyed', length > 50 ? (data.slice(0, 50) + '...(' + length + ')') : data);
}

function downloadFileUcs2(filename, content) {
	content = content.replace(/\n/g, '\r\n');
	content = punycode.ucs2.decode(content);
	content.unshift(0xfeff);
	content = Uint16Array.from(content);
	var a = document.createElement('a');
	var blob = new Blob([content]);
	var url = window.URL.createObjectURL(blob);
	// filename = filename + formatName(location.search) + '_' + Date.now() + '.txt';
	filename = filename;

	a.href = url;
	a.download = filename;
	a.click();
	window.URL.revokeObjectURL(url);
}


{
	try {
		let t
		let p = $('<div id="blocks">').appendTo('body').css({
			position: 'fixed',
			width: '100vw',
			overflow: 'hidden',
			left: 0, bottom: 0,
			opacity: 0.9,
		})
		$(document).delegate('focus', '.target', (e) => {
			log(123)
			setTimeout(() => {
				p.empty()
				let _t = $('.currentEditRow').get(0);
				if (_t === t) return;
				console.log(t)

				// let blocks = $('#works .no').clone().appendTo(p)

				// let ohter = blocks.not('.curre')

				// .eq($('.currentEditRow').index()).css({
				// 	background: '#ff0',
				// 	color: '#f00',
				// }).get(0).scrollIntoView({
				// 	// behavior: "smooth",
				// 	block: "center",
				// 	inline: "center",
				// })
			})
		})



	} catch (err) {
		console.error(err)
	}
}


function worksprogress() {
	$('#works tr')
}






// 记录最后的source和target的内容
$(document).on('mouseup', '.source, .target', function (e) {
	let { log } = console
	let s = window.getSelection();// 选择文字
	if (s.type !== 'Range' || s.anchorNode !== s.focusNode) {
		return;
	}
	let p = s.anchorNode, isSource, isTarget, text;
	while (p = p.parentNode) {
		isSource = p.classList.contains('source')
		isTarget = p.classList.contains('target')
		if (p.nodeType === Element.ELEMENT_NODE && p.classList && (isSource || isTarget)) {
			text = s.toString()
			if (isSource) {
				$('#lsst').text(text)

				// 기타 웹페이지 참조
				let g = $('#useNet').prop('checked');
				if (g) {
					if (text && text.trim()) {
						gSearch(text, $('#netTarget').val());
					}
				}

				// 选词搜索规则
				// 1）source !== target
				// 2）带有数值的排到下方
				var a = dict.search(text, Number($('#similarPercent').val()));
				a = a.filter(e => e[0] !== e[1]);
				a.sort(function (a, b) {
					if (/\d/.test(a)) return 1;
				});
				// 提示内容
				var table = ao.arrayToTable(a);
				$('td:nth-child(4)', table).addClass('index');
				$('td:nth-child(3)', table).addClass('similar').each((_, e) => e.textContent = parseInt(e.textContent) + '%');
				$('td:nth-child(2)', table).attr({ 'contenteditable': 'plaintext-only' }).addClass('target');
				$('td:nth-child(1)', table).attr({ 'contenteditable': 'plaintext-only' }).addClass('source');
				$('tr', table).each(function (i, tr) {
					$(tr).prepend($('<td class="no"></td>').text(i + 1));
				});
				$('#statusDict').html(table.innerHTML).prop('scrollTop', 0);
			} else if (isTarget) {
				$('#ltst').text(text)
			}
			break;
		}
	}
	return;

	let t = $(e.target);
	if (t.is('.source')) {
		lastSourceSelectionText = s.toString().trim();
		$('#lsst').text(lastSourceSelectionText);

		// 查找词典内容
		// if($('#useDictTip').prop('checked') && lastSourceSelectionText){
		if (lastSourceSelectionText) {
			// 기타 웹페이지 참조
			let g = $('#useNet').prop('checked');
			if (g) {
				if (lastSourceSelectionText && lastSourceSelectionText.trim()) {
					gSearch(lastSourceSelectionText, $('#netTarget').val());
				}
			}

			// 选词搜索规则
			// 1）source !== target
			// 2）带有数值的排到下方
			var a = dict.search(lastSourceSelectionText, Number($('#similarPercent').val()));
			a = a.filter(e => e[0] !== e[1]);
			a.sort(function (a, b) {
				if (/\d/.test(a)) return 1;
			});
			// 提示内容
			var table = ao.arrayToTable(a);
			$('td:nth-child(4)', table).addClass('index');
			$('td:nth-child(3)', table).addClass('similar').each((_, e) => e.textContent = parseInt(e.textContent) + '%');
			$('td:nth-child(2)', table).attr({ 'contenteditable': 'plaintext-only' }).addClass('target');
			$('td:nth-child(1)', table).attr({ 'contenteditable': 'plaintext-only' }).addClass('source');
			$('tr', table).each(function (i, tr) {
				$(tr).prepend($('<td class="no"></td>').text(i + 1));
			});
			$('#statusDict').html(table.innerHTML).prop('scrollTop', 0);
		}

	} else if (t.is('.target')) {
		lastTargetSelectionText = window.getSelection().toString().trim();
		$('#ltst').text(lastTargetSelectionText);
	}
});


function clearTarget() {
	$('#works .target').each((i, e) => {
		// clear class.
		e.classList.forEach(c => {
			if (/^target/.test(c) || /^hide/.test(c)) {
				return;
			}
			e.classList.remove(c)
		})
		e.textContent = ''
	})
}


// 计算当前文档任务状态
function clacWorksStatus() {
	let totalSourceLength = 0, totalTargetLength = 0, totalSourceLengthDiff = 0;

	$('#works tr').each((i, e) => {
		let sourceLength = $(e).find('.source').text().length
		let targetLength = $(e).find('.target').text().length

		totalSourceLength += sourceLength
		totalTargetLength += targetLength
		if (targetLength === 0) totalSourceLengthDiff += sourceLength
	})

	pushlog(`${totalSourceLengthDiff} 남음(총${totalSourceLength})`)
}

function clearWait() {
	$('#works .target').removeClass('wait')
}




$(function () {
	$('#pinkthema').on('click', function () {
		let { checked } = document.getElementById('pinkthema')
		let tag
		if (checked) {
			tag = document.body.appendChild(document.createElement('style'))
			tag.setAttribute('id', 'pinkthematag')
			tag.innerText = `
.util.tm th {
    background: #ffb7cf;
}
.util.work th {
    background: #ffc3d7;
}
.util.tb th {
    background: #FCE4EC;
}
h3 {
    background: #ffa8c6;
    color: #fff;
    padding: 6px;
    border-radius: 3px;
    text-align: center;
    max-width: 18em;
}
.util {
    resize: none;
    background: #FFFDE7;
}
tbody {
    border: 1px solid #FFFDE7!important;
}
h3 {
    background: #ffa8c6;
    color: #fff;
    padding: 6px;
    border-radius: 3px;
    text-align: center;
    max-width: 18em;
}
#toolleft div, #toolright div {
    display: block;
    border: 2px solid #FFFDE7;
    background: #FCE4EC;
    color: #F06292;
    border-radius: 5px;
    padding: 5px;
    margin: 2px;
    max-width: 20em;
}

#worksButtonbox {
    background: #F8BBD0!important;
}

#tipButtonbox {
    background: #F8BBD0!important;
}

.clog td {
    width: 100%;
    border: 1px solid #CE93D8;
    background: #F3E5F5;
    color: #CE93D8;
    z-index: -9;
}

.buttonbox input, .buttonbox button {
    background: #F3E5F5;
    margin: 0!important;
    padding: 0!important;
    width: 100%;
    font-size: 12px;
    height: 20px;
    border: 1px solid #E1BEE7!important;
    border-radius: 3px;
}
.no{
	box-sizing: border-box;
	border: none;
	width: 32px;
	margin: 0;
	padding: 0 4px;
	overflow: hidden;
	user-select: none;
	white-space: nowrap;
	word-wrap: break-word;
	word-break: break-all;
	text-align: center;
	color: #ffffff;
	background: #ffbad1;
}
.target {
	font-family: Meiryo;
}
`
		} else {
			tag = document.getElementById('pinkthematag')
			if (tag) tag.remove()
		}
		let tm = localforage.createInstance({ name: 'tm' })
		tm.setItem('pinkthema', $('#pinkthema').prop('checked'));

	})
})

// 打开外部参考网站（日后提供更详细的设置）
// opt: 是否激活为当前窗口。个别打开设置。添加自定义网址。
function gSearch(s, t) {
	s = encodeURIComponent(s);

	if (!gSearch.google || gSearch.google.closed)
		gSearch.google = wopen(`about:blank`, { name: 'google', width: 400, height: 500, screenX: 0, screenY: 0 });

	if (!gSearch.papago || gSearch.papago.closed)
		gSearch.papago = wopen(`about:blank`, { name: 'papago', width: 400, height: 500, screenX: 0, screenY: 500 });
	if (t === 'jp' || t === 'ja') {
		t = 'ja';
	}

	if (!gSearch.googleAll || gSearch.googleAll.closed)
		gSearch.googleAll = wopen(`about:blank`, { name: 'googleAll', width: 400, height: 500, screenX: 0, screenY: 1000 });

	gSearch.google.location.href = `https://translate.google.cn/?view=home&op=translate&sl=auto&tl=${t}&text=${s}`;
	gSearch.papago.location.href = `https://papago.naver.com/?sk=auto&tk=${t}&st=${s}`;
	gSearch.googleAll.location.href = `https://www.google.com/search?q=${s}`;
}
window.addEventListener('beforeunload', (e) => {
	function fn(name) {
		if (gSearch[name] && (typeof gSearch[name].close === 'function') && (!gSearch[name].closed)) gSearch[name].close()
	}
	fn('google')
	fn('papago')
	fn('googleAll')
});// 关闭外部搜索窗口


$(function () {
	themaReady[0] = true
	showBody()
})

function showBody() {
	if (themaReady.every(e => e)) {
		document.body.removeAttribute('style')
	}
}

function hideDone() {
	$('.done,.doneAuto').parent().toggle('.hide')
}

// 测试一个节点是否有父级target
function parentNodeIsTargetClasses(o) {
	let p, b = false
	while (p = o.parentNode) {
		if (p.classList.contains('target')) {
			b = true
			break;
		}
	}
	return b
}


function showDiff(target, source, tips) {

	if (t.length) {
		let t1 = $(tipName).find('tr').eq(key).find('.source').text().trim();
		let t2 = $(e.target).parent().find('.source').text().trim();
		let dmp = new diff_match_patch();
		let dmpHTML = dmp.diff_prettyHtml(dmp.diff_main(t1, t2));
		pushloghtml(dmpHTML);

		let { x, y, height } = tar.get(0).getBoundingClientRect();
		// showTip({html:dmpHTML, x, y:Math.max(y-height,0)});
		showTip({ html: dmpHTML, x, y, delay: 5000, css: { transform: 'translate(0,-100%)' } });
	}
}



// 排序
function readySort(className = '.source', method = 'text', asc = 1) {
	let s = $('#works tr')

	$('#works tbody[dataname] tr').sort((a, b) => {
		let at, bt
		at = $(a).find(className).text()
		bt = $(b).find(className).text()
		if (method === 'length') {// length已经是数值
			at = at.length
			bt = bt.length
		}
		if (className === '.no') {// 由于no是数值，所以需要转化为数值后，在进行比较
			at = parseInt(at)
			bt = parseInt(bt)
		}
		// 如果是文本，则直接进行比较
		return at > bt ? asc : (at < bt ? - asc : 0);
	}).each((i, e) => {
		let target = $(e)
		let parent = target.parent().get(0)
		target.detach().appendTo(parent)
	})
}

$('#noAsc').on('click', (e) => readySort('.no', 'text', 1))
$('#sourceAsc').on('click', (e) => readySort('.source', 'text', 1))
$('#sourceDesc').on('click', (e) => readySort('.source', 'text', -1))
$('#sourceLengthAsc').on('click', (e) => readySort('.source', 'length', 1))
$('#sourceLengthDesc').on('click', (e) => readySort('.source', 'length', -1))



function readFile(file, callback) {
	let result = [];
	let reader = new FileReader();
	let start = 0;
	let total = file.size;
	let { batch, onabort, onerror, onload, onloadstart, onloadend, onprogress } = readFile.options;
	let callbackType = typeof callback
	if (callbackType === 'function') {
		onload = callback
	} else if (callbackType === 'object' && callback !== null) {
		if(typeof callback.onabort==='function') onabort = callback.onabort
		if(typeof callback.onerror==='function') onerror = callback.onerror
		if(typeof callback.onload==='function') onload = callback.onload
		if(typeof callback.onloadstart==='function') onloadstart = callback.onloadstart
		if(typeof callback.onloadend==='function') onloadend = callback.onloadend
		if(typeof callback.onprogress==='function') onprogress = callback.onprogress
	}

	reader.onabort = onabort
	reader.onerror = onerror
	reader.onloadstart = onloadstart
	reader.onloadstart = onloadstart
	reader.onloadend = onloadend
	reader.onprogress = onprogress
	reader.onload = function (event) {
		try {
			result.push(event.target.result)
			asyncUpdate()
		} catch (e) {
			log(e)
		}
	};
	let asyncUpdate = function () {
		if (start < total) {
			log((start / total * 100).toFixed(2) + '%');
			let end = Math.min(start + batch, total);
			// reader.readAsArrayBuffer(file.slice(start, end));
			reader.readAsText(file.slice(start, end));
			start = end;
		} else {
			onload(result)
		}
	};
	asyncUpdate();
	return reader;
}
readFile.options = {
	batch: 1024 * 1024 * 2,
	onabort: console.warn,
	onerror: console.error,
	onload: console.log,
	onloadstart: console.log,
	onloadend: console.log,
	onprogress: console.log,
}

