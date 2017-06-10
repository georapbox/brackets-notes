define(function () {
  'use strict';

  function uniqBy(array, prop) {
    var duplicates, len, i, j, found;

    if (Object.prototype.toString.call(array) !== '[object Array]') {
      throw new TypeError('uniqBy expects an array as first argument');
    }

    if (typeof prop !== 'string') {
      throw new TypeError('uniqBy expects a string as second argument');
    }

    duplicates = [];
    len = array.length;

    for (i = 0; i < len; i += 1) {
      found = false;

      for (j = 0; j < duplicates.length; j += 1) {
        if (array[i][prop] && array[i][prop] === duplicates[j][prop]) {
          found = true;
          break;
        }
      }

      if (!found) {
        duplicates.push(array[i]);
      }
    }

    return duplicates;
  }

  return uniqBy;
});
