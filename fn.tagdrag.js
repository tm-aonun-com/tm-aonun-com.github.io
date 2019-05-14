// no module

function tagDrag(tag, callback) {
	console.log(tag)
	tag.draggable=true
	// // tag.ondragleave = dodrag;
	// // tag.ondragenter = dodrag;
	// // tag.ondragend = dodrag;
	// tag.ondrag    = dodrag;

	tag.ondragover  = function(e){
		e.dataTransfer.effectAllowed = 'copy';
	};
	tag.addEventListener('dragstart', function(e){
		e.dataTransfer.setData('id', e.target.id);
		e.dataTransfer.effectAllowed = 'copy';
		if(typeof callback==='function') callback(e);
	});

	function dodrag(e){
		e.preventDefault();
	}
}

function tagDrop(tag, callback) {
	tag.ondragover = function(e){
		e.preventDefault();
	}
	tag.ondrop=function(e) {
		e.preventDefault();
		e.dataTransfer.effectAllowed = 'copy';
		var id = e.dataTransfer.getData('id');
		var o = document.createElement('div');
		o.setAttribute('uid', id);
		o.textContent = document.querySelector('#'+id).textContent;
		e.currentTarget.appendChild(o);
		o.onclick=function(e){
			reflushDict(e.target.parentElement);
			e.target.remove();
		};
		
		reflushDict(e.target);
		if(typeof callback==='function') callback(e);
	}
}

function reflushDict(target){
	var id = target.id;
	if(id){
		var name = id.replace('#','').replace('UI','');
		name=name.slice(0,1).toUpperCase()+name.slice(1);
		// console.log(target.id, target.id.replace('#','').replace('UI',''))
		sys['use'+name+'Ids'] = Array.prototype.map.call(target.children, function(e){
			return e.getAttribute('uid');
		});
	}
}