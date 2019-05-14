let KeyboardManager = {
	status: {
		working: false,
	},
	_works: {},
	_mainWork(e) {
		let combinationRegExp = /^(Control|Shift|Alt|Meta)(Left|Right)?$/;
		let combinations, cmd;
		combinations = []
		// combinations
		if (e.ctrlKey) {
			combinations.push('Ctrl');
		}
		if (e.shiftKey) {
			combinations.push('Shift');
		}
		if (e.altKey) {
			combinations.push('Alt');
		}
		if (e.metaKey) {
			combinations.push('Meta');
		}
		// key
		if (combinationRegExp.test(e.code)) {
		} else if (/^(Digit|Numpad)\d$/.test(e.code)) {
			cmd = e.code.match(/\d$/)[0];
		} else if (/^(Arrow)(Up|Right|Down|Left)$/.test(e.code)) {
			cmd = e.code.replace(/^Arrow/, '');
		} else if (/^Key(.+)$/.test(e.code)) {
			cmd = e.code.slice(3);
		} else if (e.code === 'Backquote') {
			cmd = '`';
		} else if (e.code === 'Minus') {
			cmd = '-';
		} else if (e.code === 'BracketLeft') {
			cmd = '[';
		} else if (e.code === 'BracketRight') {
			cmd = ']';
		} else if (e.code === 'Backslash') {
			cmd = '\\';
		} else if (e.code === 'Semicolon') {
			cmd = ';';
		} else if (e.code === 'Quote') {
			cmd = '\'';
		} else if (e.code === 'Comma') {
			cmd = ',';
		} else if (e.code === 'Period') {
			cmd = '.';
		} else if (e.code === 'Slash') {
			cmd = '/';
		} else if (e.code === 'Space') {
			cmd = 'Space';
		} else {
			cmd = e.key;
		}
		cmd = cmd !== undefined ? combinations.concat(cmd) : combinations;
		cmd = cmd.join('+').toLowerCase();
		e.cmd = cmd;
		KeyboardManager._run(KeyboardManager._works.all, e);
		KeyboardManager._run(KeyboardManager._works[cmd], e);
	},
	start(options = false) {
		let status = KeyboardManager.status;
		if (status.working) return;
		status.working = true;
		window.addEventListener('keydown', KeyboardManager._mainWork, options);
		return this;
	},
	stop(options = false) {
		let status = KeyboardManager.status;
		if (!status.working) return;
		status.working = false;
		window.removeEventListener('keydown', KeyboardManager._mainWork, options);
		return this;
	},
	_run(f, event) {
		if (f === undefined) return false;
		if (typeof f === 'function') {
			Reflect.apply(f, event.target, [event]);
		} else if (Array.isArray(f)) {
			f.forEach(f => KeyboardManager._run(f, event));
		}
	},
	on(type, handle) {
		let _type, _item;
		_item = this._works[type];
		_type = typeof _item;
		if (Array.isArray(_item) && _item.indexOf(handle) !== -1) {
			_item.push(handle);
		} else if (_type === 'function') {
			this._works[type] = [_item, handle];
		} else {
			this._works[type] = [handle];
		}
		return this;
	},
	off(type, handle) {
		let _type, _item;
		_item = this._works[type];
		_type = typeof _item;
		if (Array.isArray(_item)) {
			let index = _item.indexOf(handle);
			if (index !== -1) _item.splice(index, 1);
		} else if (_type === 'function' && _item === handle) {
			delete this._works[type];
		}
		return this;
	},
	clear(type) {
		if (type !== undefined) {
			delete this._handle[type];
		} else {
			this._handle = Object.create(null);
		}
		return this;
	}
}
Object.freeze(KeyboardManager);