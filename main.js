define(function (require, exports, module) {
  'use strict';

  var Mustache = brackets.getModule('thirdparty/mustache/mustache');
  var CommandManager = brackets.getModule('command/CommandManager');
  var Dialogs = brackets.getModule('widgets/Dialogs');
  var Strings = require('strings');
  var Menus = brackets.getModule('command/Menus');
  var KeyBindingManager = brackets.getModule('command/KeyBindingManager');
  var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  var WorkspaceManager = brackets.getModule('view/WorkspaceManager');
  var DocumentManager = brackets.getModule('document/DocumentManager');
  var AppInit = brackets.getModule('utils/AppInit');
  var noteIcon = $('<a title="' + Strings.EXTENSION_NAME + '" id="georapbox-notes-icon"></a>');
  var notesPanelTemplate = require('text!html/notes-panel.html');
  var notesPanelHeaderTemplate = require('text!html/notes-panel-header.html');
  var notesRowTemplate = require('text!html/notes-row.html');
  var newNoteTemplate = require('text!html/notes-new.html');
  var importNotesTemplate = require('text!html/notes-import.html');
  var deleteNoteTemplate = require('text!html/delete-note.html');
  var reorder = require('services/reorder');
  var validateNotes = require('services/validate-notes');
  var uniqBy = require('utils/uniq-by');
  var marked = require('lib/marked');
  var STORAGE_KEY = 'georapbox.notes';
  var STORAGE_KEY_VISIBLE = STORAGE_KEY + '.visible';
  var STORAGE_KEY_PREVIEW_VISIBLE = STORAGE_KEY + '.preview.visible';
  var _notes = storageGetObj(localStorage, STORAGE_KEY) || [];
  var panel, notesPanel;

  /**
   * Extends Storage to save objects.
   * @param storage {Object} - Web storage (localStorage/sessionStorage)
   * @param key {String} - object's key
   * @param obj {Object} - object ot save
   */
  function storageSaveObj(storage, key, obj) {
    return storage.setItem(key, JSON.stringify(obj));
  }

  /**
   * Extends Storage to retrieve objects.
   * @param storage {Object} - Web storage (localStorage/sessionStorage)
   * @param key {String} - object's key
   */
  function storageGetObj(storage, key) {
    return JSON.parse(storage.getItem(key));
  }

  /**
   * Creates a new untitled file and appends content.
   */
  function openFile(content, fileExtension) {
    var counter = 1;
    var doc = DocumentManager.createUntitledDocument(counter, fileExtension);
    doc.setText(content);
  }

  /**
   * Saves notes to localStorage.
   * @param val {String} - note (Markdown)
   * @param markup {String} - note (HTML markup)
   * param callback {Function}
   */
  function saveNote(val, markup, callback) {
    var date = new Date();
    var ts = date.getTime();
    var dateFormatted = date.toLocaleString();

    if ($.trim(val) !== '') {
      _notes.unshift({
        id: ts,
        date: dateFormatted,
        note: val,
        noteMarkup: markup
      });

      storageSaveObj(localStorage, STORAGE_KEY, _notes);

      if (typeof callback === 'function' && typeof callback !== 'undefined') {
        callback();
      }
    }
  }

  /**
   * Deletes note by note id.
   * @param noteId {Number}
   */
  function deleteNote(noteId) {
    var i = 0;
    var len = _notes.length;
    var note;

    for (i; i < len; i += 1) {
      note = _notes[i];

      if (noteId === note.id) {
        return _notes.splice(i, 1);
      }
    }
  }

  /**
   * Updates note.
   * @param noteId {Number}
   * @param noteVal {String} - note (Markdown)
   * @param noteMarkup {String} - note (HTML markup)
   */
  function updateNote(noteId, noteVal, noteMarkup) {
    var i = 0;
    var len = _notes.length;
    var note, date;

    for (i; i < len; i += 1) {
      note = _notes[i];

      if (note.id === noteId) {
        if (noteVal !== note.note) {
          date = new Date();
          note.id = date.getTime();
          note.date = date.toLocaleString();
          note.note = noteVal;
          note.noteMarkup = noteMarkup;
          return _notes;
        }
      }
    }
  }

  /**
   * Makes note textarea editable.
   * @param textarea {Node}
   */
  function makeEditable(textarea) {
    textarea.prop('readonly', false);
    textarea.addClass('editable');
    textarea.height(textarea[0].scrollHeight);
    textarea.focus();
  }

  /**
   * Makes note textarea read only.
   * @param textarea {Node}
   */
  function makeReadOnly(textarea) {
    textarea.prop('readonly', true);
    textarea.removeClass('editable');
  }

  /*
   * Renders notes inside bottom panel.
   */
  function renderNotes() {
    var notesTable, resultsHTML;

    if (panel.isVisible()) {
      notesTable = notesPanel.find('table tbody');
      resultsHTML = Mustache.render(notesRowTemplate, {
        strings: Strings,
        notes: _notes
      });

      notesTable.empty().append(resultsHTML);
    }

    return false;
  }

  /**
   * Shows dialog for new note.
   */
  function showNewNoteModal() {
    var dialog, noteTextarea, hidePreviewInput, noteValue, noteHtml, preview;
    var promise = Dialogs.showModalDialogUsingTemplate(Mustache.render(newNoteTemplate, Strings))
      .done(function (id) {
        // if button OK clicked
        if (id === Dialogs.DIALOG_BTN_OK) {
          noteTextarea = dialog.find('textarea');
          noteValue = noteTextarea.val();
          noteHtml = dialog.find('div[data-id="georapbox-new-note-preview"]').html();

          saveNote(noteValue, noteHtml, function () {
            renderNotes();
          });

          dialog.unbind('keyup');
        }

        // if button CANCEL clicked
        if (id === Dialogs.DIALOG_BTN_CANCEL) {
          dialog.unbind('keyup');
        }
      });

    dialog = $('.georapbox-notes-new-note-dialog.instance');
    preview = $('div[data-id="georapbox-new-note-preview"]');
    noteTextarea = dialog.find('textarea');
    hidePreviewInput = dialog.find('input[type="checkbox"]');

    noteTextarea.focus();

    function previewMarkDown(noteMarkup) {
      preview.html(marked(noteMarkup.val()));
    }

    function togglePreview(isVisible) {
      if (isVisible === true) {
        preview.show();
        noteTextarea.css({ width: '49%' });
        localStorage.setItem(STORAGE_KEY_PREVIEW_VISIBLE, 'true');
      } else {
        preview.hide();
        noteTextarea.css({ width: '99%' });
        localStorage.setItem(STORAGE_KEY_PREVIEW_VISIBLE, 'false');
      }
    }

    dialog.on('keyup', 'textarea', function () {
      previewMarkDown($(this));
    });

    // Determine if Preview is visible or not.
    if (localStorage.getItem(STORAGE_KEY_PREVIEW_VISIBLE) === 'false') {
      hidePreviewInput.attr('checked', 'checked');
      togglePreview(false);
    }

    dialog.on('change', 'input[type="checkbox"]', function () {
      togglePreview(!$(this).is(':checked'));
    });

    return promise;
  }

  /**
   * Displays a basic dialog without template.
   * @param {String} message The message to be displayed in dialog's body.
   * @param {String} title The title displayed in dialog's header.
   * @return {Object} A Promise that resolves to user's actions on dialog.
   */
  function showInfoDialog(message, title) {
    return Dialogs.showModalDialog('', title, message);
  }

  /**
   * Shows Import Notes dialog.
   * @return {Object} A Promise that resolves to user's actions on dialog.
   */
  function showImportNotesDialog() {
    var dialog, notesTextarea, notesValue;
    var promise = Dialogs.showModalDialogUsingTemplate(Mustache.render(importNotesTemplate, Strings))
      .done(function (id) {
        var savedNotes = storageGetObj(localStorage, STORAGE_KEY) || [];
        var parsedNotes = [];
        var exampleNoteFormat = [
          {id: 1417862479217, date: '12/6/2014 12:41:19 PM', note: 'My first ever note', noteMarkup: 'My first ever note'},
          {id: 1496988859284, date: '6/9/2017, 9:14:19 AM', note: 'This is another note', noteMarkup: 'This is another note'}
        ];
        var exampleNoteFormatTemplate = '<pre>' + JSON.stringify(exampleNoteFormat, null, 2) + '</pre>';

        // if button OK clicked
        if (id === Dialogs.DIALOG_BTN_OK) {
          notesTextarea = dialog.find('textarea');
          notesValue = notesTextarea.val();

          try {
            parsedNotes = JSON.parse(notesValue);
          } catch (err) {
            showInfoDialog(Strings.INVALID_IMPORT_MESSAGE + exampleNoteFormatTemplate, Strings.INVALID_IMPORT_TITLE);
            return;
          }

          if (validateNotes(parsedNotes)) {
            _notes = uniqBy(savedNotes.concat(parsedNotes), 'id');
            storageSaveObj(localStorage, STORAGE_KEY, _notes);
            renderNotes();
          } else {
            showInfoDialog(Strings.INVALID_IMPORT_MESSAGE + exampleNoteFormatTemplate, Strings.INVALID_IMPORT_TITLE);
          }
        }
      });

    dialog = $('.georapbox-notes-import-notes-dialog.instance');

    return promise;
  }

  /**
   * Shows dialog for removing note.
   * @param noteId {Number}
   * @param noteDate {String}
   * @param noteText {String}
   * @param callback {Function}
   */
  function showDeleteNoteDialog(noteId, noteDate, noteText, callback) {
    var dialog;
    var promise = Dialogs.showModalDialogUsingTemplate(Mustache.render(deleteNoteTemplate, Strings))
      .done(function (id) {
        // if button OK clicked
        if (id === Dialogs.DIALOG_BTN_OK) {
          if (typeof callback === 'function' && typeof callback !== 'undefined') {
            callback();
          }
        }
      });

    dialog = $('.georapbox-notes-delete-note-dialog.instance');
    dialog.find('.date').html(noteDate);
    dialog.find('.note').html(noteText.substring(0, 200) + '...');

    return promise;
  }

/**
 * Creates the "Notes" bottom panel.
 */
function createBottomPanel() {
  panel = WorkspaceManager.createBottomPanel('georapbox.notes.panel', $(notesPanelTemplate), 100);

  var panelHeader = $('#georapbox-notes-panel-header'),
    resultsHTML = Mustache.render(notesPanelHeaderTemplate, {
      strings: Strings
    });

  panelHeader.empty().append(resultsHTML);
}

  /**
   * Toggles notes bottom panel state.
   */
  function togglePanel() {
    if (panel.isVisible()) {
      panel.hide();
      noteIcon.removeClass('active');
      CommandManager.get('georapbox.notes.viewNotes').setChecked(false);
      localStorage.setItem(STORAGE_KEY_VISIBLE, 'false');
    } else {
      panel.show();
      noteIcon.addClass('active');
      CommandManager.get('georapbox.notes.viewNotes').setChecked(true);
      renderNotes();
      localStorage.setItem(STORAGE_KEY_VISIBLE, 'true');
    }
  }

  /**
   * Loads external stylesheets.
   */
  function addStyles() {
    ExtensionUtils.loadStyleSheet(module, 'css/notes.css');
  }

  /**
   * Description: Adds menu commands.
   */
  function addMenuCommands() {
    var navigateMenu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
    var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    var registerCommandHandler = function (commandId, menuName, handler, shortcut, menu) {
      CommandManager.register(menuName, commandId, handler);
      menu.addMenuItem(commandId);
      KeyBindingManager.addBinding(commandId, shortcut);
    };

    navigateMenu.addMenuDivider();

    registerCommandHandler('georapbox.notes.viewNotes', Strings.COMMAND_NAME, togglePanel, 'Ctrl-Alt-Shift-N', viewMenu);
  }

  /**
   * Description: Adds event listeners.
   */
  function addHandlers() {
    notesPanel = $('#georapbox-notes-panel');

    notesPanel
      .on('click', '.close', togglePanel)
      .on('click', '.georapbox-notes-delete', function (e) {
        e.preventDefault();

        var tableRow = $(this).parents('tr');
        var id = tableRow.find('.id').html();
        var date = tableRow.find('.labelIcon').html();
        var note = tableRow.find('.note textarea').val();

        id = parseInt(id, 10);

        showDeleteNoteDialog(id, date, note, function () {
          deleteNote(id);
          localStorage.removeItem(STORAGE_KEY);
          storageSaveObj(localStorage, STORAGE_KEY, _notes);
          renderNotes();
        });
      })
      .on('click', '.georapbox-notes-edit', function () {
        var tableRow = $(this).parents('tr');
        var textArea = tableRow.find('textarea');
        var textareaTd = tableRow.find('.note');
        var previewTd = tableRow.find('.preview');

        textareaTd.show();
        previewTd.hide();
        makeEditable(textArea);
      })
      .on('focusout', 'td.note textarea', function () {
        var self = $(this);
        var noteValue, noteMarkup, noteId;
        var markupArea = self.parent().parent().find('article');

        function previewMarkDown() {
          markupArea.html(marked(self.val()));
        }

        if (self.hasClass('editable')) {
          noteValue = self.val();
          noteId = parseInt(self.parent().parent().find('td.id').html(), 10);
          makeReadOnly(self);
          previewMarkDown();
          noteMarkup = self.parent().next().find('article').html();
          updateNote(noteId, noteValue, noteMarkup);
          localStorage.removeItem(STORAGE_KEY);
          storageSaveObj(localStorage, STORAGE_KEY, _notes);
          renderNotes();
        }
      })
      .on('click', '[data-id="georapbox-notes-new-btn"]', showNewNoteModal)
      .on('click', '[data-id="georapbox-notes-import-btn"]', showImportNotesDialog)
      .on('click', '.georapbox-notes-options-handler', function (e) {
        var options = $(this).next();

        e.preventDefault();

        if (options.is(':visible')) {
          $(this).removeClass('active');
          options.hide();
        } else {
          $(this).addClass('active');
          options.show();
        }
      })
      .on('click', '.georapbox-notes-extract', function (e) {
        var textareaVal = $(this).parents('tr').find('td.note textarea').val();
        e.preventDefault();
        openFile(textareaVal, '.md');
      })
      .on('click', '[data-id="georapbox-notes-export-btn"]', function (e) {
        var notes = storageGetObj(localStorage, STORAGE_KEY) || [];

        e.preventDefault();

        try {
          openFile(JSON.stringify(notes, null, 2), '.json');
        } catch (err) {
          console.error(err);
        }
      })
      .on('dragstart', 'tr', reorder.dragndrop.handleDragStart)
      .on('dragenter', 'tr', reorder.dragndrop.handleDragEnter)
      .on('dragover', 'tr', reorder.dragndrop.handleDragOver)
      .on('dragleave', 'tr', reorder.dragndrop.handleDragLeave)
      .on('drop', 'tr', reorder.dragndrop.handleDrop)
      .on('dragend', 'tr', function () {
        var rows = notesPanel.find('tr');

        reorder.dragndrop.handleDragEnd(rows);

        _notes = [];

        rows.each(function () {
          var row = $(this);
          var id = row.find('td.id').html();
          var date = row.find('td.date .labelIcon').html();
          var note = row.find('td.note textarea').val();
          var noteMarkup = row.find('td.preview article').html();

          _notes.push({
            id: parseInt(id, 10),
            date: date,
            note: note,
            noteMarkup: noteMarkup
          });
        });

        storageSaveObj(localStorage, STORAGE_KEY, _notes);
      });

      noteIcon.on('click', togglePanel).appendTo('#main-toolbar .buttons');
  }

  /**
   * Description: Initialize the extension.
   */
  AppInit.appReady(function () {
    createBottomPanel();
    addStyles();
    addMenuCommands();
    addHandlers();
    if (localStorage.getItem(STORAGE_KEY_VISIBLE) === 'true') {
      togglePanel();
    }
  });
});
