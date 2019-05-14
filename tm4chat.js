let tm4Chat, tm4Vue;

tm4Vue = new Vue({
	el: '#tm4Chat',
	data: {
		count: 0,
		tm4ChatOn: false,
		messages:[],
		message: '',
	},
	methods: {
		onSend(e){
			if(this.message) {
				if(e.type==='keydown' && e.keyCode===13){
					e.preventDefault();
					this.message = e.target.value;
					tm4Chat.send(this.message);
					this.message = '';
				}
				else if(e.type==='mouseup'){
					tm4Chat.send(this.message);
					this.message = '';
				}
			}
		}
	}
})

tm4Chat = io(location.protocol + '//' + location.host, {
	reconnection: false,
	path:'/ws-tm4',
	serveClient: false,
	transports: ['websocket'],
});
tm4Chat.on('connect', (e) => {
	tm4Vue.tm4ChatOn = true;
});
tm4Chat.on('disconnect', (e) => {
	tm4Vue.tm4ChatOn = false;
});
tm4Chat.on('message',(...message)=>{
	console.log(message)
	tm4Vue.messages.push(message);
});
tm4Chat.on('count',(n)=>{
	tm4Vue.count=n;
});