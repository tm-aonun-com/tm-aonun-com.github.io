function evalt(s, t) { return (function (s) { return eval(s) }).call(t, s) }
this.evalt = evalt