'use strict';
(function(module, undefined){

  var format = function format(fmt) {
    var re = /(%?)(%([jds]))/g
      , args = Array.prototype.slice.call(arguments, 1);
    if(args.length) {
      fmt = fmt.replace(re, function(match, escaped, ptn, flag) {
        var arg = args.shift();
        switch(flag) {
          case 's':
            arg = '' + arg;
            break;
          case 'd':
            arg = Number(arg);
            break;
          case 'j':
            arg = JSON.stringify(arg);
            break;
        }
        if(!escaped) {
          return arg; 
        }
        args.unshift(arg);
        return match;
      })
    }

    // arguments remain after formatting
    if(args.length) {
      fmt += ' ' + args.join(' ');
    }

    // update escaped %% values
    fmt = fmt.replace(/%{2,2}/g, '%');

    return '' + fmt;
  }


  if(module.util===undefined) module.util={};
  if(module.util.format===undefined || (typeof module.util.format!=='function')) module.util.format=format;
})(this);