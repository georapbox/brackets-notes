define(function () {
  'use strict';

  function validateNotes(notes) {
    var i, len, note;

    if (Object.prototype.toString.call(notes) !== '[object Array]') {
      return false;
    }

    if (notes.length === 0) {
      return true;
    }

    for (i = 0, len = notes.length; i < len; i += 1) {
      note = notes[i];

      if (!note.date || !note.id || !note.note || !note.noteMarkup) {
        return false;
      }
    }

    return true;
  }

  return validateNotes;
});
