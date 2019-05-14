let { log, warn } = console

DDBDrop.on(document.getElementById('drop'), (file) => {
	if (!(file instanceof File)) return;

	document.getElementById('filename').innerText = file.name;

	DDBDrop.text(file, (text) => {
		document.getElementById('origin').value = text


		let table = tmstringToTable(text)
		table.dataset.name = file.name
		$('#table').html(table)
	})

	// 侦听input事件，不用等待下一帧时读取内容
	$(document).delegate('.target', 'input paste', { data: 'from delegate' }, (e) => {
		// log(e.originalEvent.data, e.data)
		let { data, dataTransfer } = e.originalEvent
		if (typeof data === 'string') log(data, data.charCodeAt(0))
		else log(e.originalEvent.clipboardData.getData('text'))
		// else if (data === null) log(e.originalEvent.dataTransfer)
		// else log(data)
		/* 
		e.originalEvent.data
		null      粘贴时
		
		
		*/
		data = tableToTmstring($('#table table').get(0))
		document.getElementById('string').innerText = data
	})

	

})