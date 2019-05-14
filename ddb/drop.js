{
	let prevent = function (e) {
		e.preventDefault()
	}

	// 注意：使用 item 进行分析时，text 和 html 也会包含在 item 中。
	// let drop = function (e) {
	// 	prevent(e)
	// 		let { dataTransfer } = e
	// 		let { items } = dataTransfer
	// 	getFns(e.target).forEach(fn => {
	// 		for (let item of items) {
	// 			let { kind, type } = item
	// 			if (kind === 'string') {
	// 				if (type === 'text/html') {
	// 					item.html = dataTransfer.getData(type)
	// 				} else {
	// 					item.text = dataTransfer.getData(type)
	// 				}
	// 				// e.getAsString((data)=>log('getAsString', data))
	// 			} else if (kind === 'file') {
	// 				item.file = item.getAsFile(type)
	// 			}
	// 			Reflect.apply(fn, dataTransfer, [item])
	// 		}
	// 	})
	// }

	// 使用 getData() 获取 text 和 html；使用 files 获取文件。
	let drop = function (e) {
		prevent(e)
		let { dataTransfer } = e
		let { files } = dataTransfer
		if(!fns.has(e.target)) return ;
		let s = getFns(e.target)
		s.forEach(fn => {
			if (files.length) {
				for (let file of files) {
					fn.call(dataTransfer, file)
				}
			} else {
				let html = dataTransfer.getData('text/html')
				let text = dataTransfer.getData('text/plain')
				fn.call(dataTransfer, { text, html })
			}
		})
	}

	let read = function (file, method, fn) {
		let fr = new FileReader();
		fr.file = file;
		fr[method](file);
		fr.onload = function (e) {
			let file = fr.file, data = fr.result
			Reflect.apply(fn, file, [data])
		}
	}

	let reads = function (files, method, fn) {
		for (let file of files) {
			if (file instanceof Blob) {
				read(file, method, fn)
			}
		}
	}

	let text = function (file, fn) {
		return read(file, 'readAsText', fn)
	}

	let dataURL = function (file, fn) {
		return read(file, 'readAsDataURL', fn)
	}
	let binaryString = function (file, fn) {
		return read(file, 'readAsBinaryString', fn)
	}
	let arrayBuffer = function (file, fn) {
		return read(file, 'readAsreadAsArrayBuffer', fn)
	}



	let fns = new Map()

	function getFns(target) {
		if (!fns.has(target)) fns.set(target, [])
		return fns.get(target)
	}

	function on(target, fn) {
		if (!(target instanceof EventTarget)) return;
		getFns(target).push(fn)
		target.addEventListener('dragenter', prevent)
		target.addEventListener('dragover', prevent)
		target.addEventListener('dragleave', prevent)
		target.addEventListener('drop', drop)
	}
	function off(target) {
		target.removeEventListener('dragenter', prevent)
		target.removeEventListener('dragover', prevent)
		target.removeEventListener('dragleave', prevent)
		target.removeEventListener('drop', drop)
		fns.delete(target)
	}

	// exports
	Object.defineProperty(this, 'DDBDrop', { value: Object.create(null), enumerable: true })
	Object.defineProperties(DDBDrop, {
		fns: { value: fns, enumerable: true },
		on: { value: on, enumerable: true },
		off: { value: off, enumerable: true },
		read: { value: read, enumerable: true },
		reads: { value: reads, enumerable: true },
		text: { value: text, enumerable: true },
		dataURL: { value: dataURL, enumerable: true },
		binaryString: { value: binaryString, enumerable: true },
		arrayBuffer: { value: arrayBuffer, enumerable: true },
	})
}


/* 【测试代码】

DDBDrop.on(document.body, function (e) {
	if (e.file) {
		DDBDrop.text(e.file, (text) => {
			log(text)
		})
	}

	if (e.text) log('text', e.text)

	if (e.html) log('html', e.html)
})


*/