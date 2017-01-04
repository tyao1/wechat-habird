#!/usr/bin/env node
if (process.env.NODE_ENV !== 'production') {
  if (!require('piping')({
      hook: true,
      ignore: /(\/\.|~$|\.json$)/i
    })) {
    return;
  }
}
require('../babel.index'); // babel registration (runtime transpilation for node)
require('../app');
