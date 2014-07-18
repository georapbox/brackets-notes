/*
 * The MIT License (MIT)
 * Copyright (c) 2014 George Raptis. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, Mustache, brackets, window */

define(function (require, exports, module) {
    'use strict';

    var CommandManager = brackets.getModule('command/CommandManager'),
        Dialogs = brackets.getModule('widgets/Dialogs'),
        Strings = brackets.getModule("strings"),
        Menus = brackets.getModule('command/Menus'),
        KeyBindingManager = brackets.getModule('command/KeyBindingManager'),
        ExtensionUtils = brackets.getModule('utils/ExtensionUtils'),
        PanelManager = brackets.getModule('view/PanelManager'),
        AppInit = brackets.getModule('utils/AppInit'),
        
        noteIcon = $('<a title="Notes" id="georapbox-notes-icon"></a>'),
        notesPanelTemplate = require('text!html/notes-panel.html'),
        notesRowTemplate = require('text!html/notes-row.html'),
        newNoteTemplate = require("text!html/notes-new.html"),
        deleteNoteTemplate = require("text!html/delete-note.html"),
        panel,
        notesPanel,
        
        COMMAND_ID = 'georapbox_notes',
        
        _activeEditor = null,
        _activeDocument = null,
        _notes = localStorage.getObj('georapbox.notes') || [];
    
    /**    
     * Description: Replace an object's value with undefined if meets condition.
     *              It is used when saving an object to localStorage to avoid circular reference.
     * @param {String} key
     * @param {Object} value
     * @returns {Object} undefined || value    
     */
    var replacer = function (key, value) {
        if (key === 'bookmark') {
            return undefined;
        } else {
            return value;
        }
    };
    
    /**
     * Extends Storage to save objects.
     */
    if (!Storage.prototype.setObj) {
        Storage.prototype.setObj = function (key, obj) {
            return this.setItem(key, JSON.stringify(obj, replacer));
        };
    }
    
    /**
     * Extends Storage to retrieve objects.
     */
    if (!Storage.prototype.getObj) {
        Storage.prototype.getObj = function (key) {
            return JSON.parse(this.getItem(key));
        };
    }
    
    /**
     * Saves notes to localStorage.
     */
    function saveNote(val, callback) {
        var date = new Date(),
            ts = date.getTime(),
            dateFormatted = date.toLocaleString();
        
        if ($.trim(val) !== '') {
            _notes.push({
                id: ts,
                date: dateFormatted,
                note: val
            });

            localStorage.setObj('georapbox.notes', _notes);

            if (typeof callback === 'function' && typeof callback !== 'undefined') {
                callback();
            }
        }
    }
    
    /**
     * Deletes note.
     */
    function deleteNote(noteId) {
        var i = 0,
            len = _notes.length,
            note;
        
        for (i; i < len; i += 1) {
            note = _notes[i];
            
            if (noteId === note.id) {
                return _notes.splice(i, 1);
            }
        }
    }
    
    /**    
     * Updates note.    
     */
    function updateNote(noteId, noteVal) {
        var i = 0,
            len = _notes.length,
            note,
            date;
        
        for (i; i < len; i += 1) {
            note = _notes[i];
            
            if (note.id === noteId) {
                if (noteVal !== note.note) {
                    date = new Date();
                    note.id = date.getTime();
                    note.date = date.toLocaleString();
                    note.note = noteVal;
                    return _notes;
                }
            }
        }
    }
    
    /**
     * Make note editable.
     */
    function makeEditable(textarea) {
        textarea.prop('readonly', false);
        textarea.addClass('editable');
        textarea.focus();
    }
    
    /**
     * Make note read only
     */
    function makeReadOnly(textarea) {
        textarea.prop('readonly', true);
        textarea.removeClass('editable');
    }
    
    /*
     * Renders notes inside bottom panel.
     */
    function renderNotes() {
        if (panel.isVisible()) {
            var notesTable = notesPanel.find('table tbody'),
                notesRowsLen = 0,
                lineColumn,
                fileColumn,
                file;
            
            var resultsHTML = Mustache.render(notesRowTemplate, {
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
        var dialog,
            noteTextarea,
            noteValue;
        
        var promise = Dialogs.showModalDialogUsingTemplate(Mustache.render(newNoteTemplate, Strings))
			.done(function (id) {
                // if button OK clicked
                if (id === Dialogs.DIALOG_BTN_OK) {
                    noteTextarea = dialog.find('textarea');
                    noteValue = noteTextarea.val();
                    
					saveNote(noteValue, function () {
                        renderNotes();
                    });
                }
			});
        
        dialog = $('.georapbox-notes-new-note-dialog.instance');
        return promise;
    }
    
    /**
     * Shows dialog for removing note.
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
     * Toggles notes bottom panel state.
     */
    function togglePanel() {
        if (panel.isVisible()) {
            panel.hide();
            noteIcon.removeClass('active');
            CommandManager.get('georapbox.notes.viewNotes').setChecked(false);
        } else {
            panel.show();
            noteIcon.addClass('active');
            CommandManager.get('georapbox.notes.viewNotes').setChecked(true);
            renderNotes();
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
        var navigateMenu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU),
            viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU),
            registerCommandHandler = function (commandId, menuName, handler, shortcut, menu) {
                CommandManager.register(menuName, commandId, handler);
                menu.addMenuItem(commandId);
                KeyBindingManager.addBinding(commandId, shortcut);
            };
        
        navigateMenu.addMenuDivider();
        
        registerCommandHandler('georapbox.notes.viewNotes', 'Notes', togglePanel, 'Ctrl-Alt-Shift-N', viewMenu);
    }
    
    /**    
     * Description: Adds event listeners.
     */
    function addHandlers() {
        notesPanel = $('#georapbox-notes-panel');
        
        notesPanel.on('click', '.close', togglePanel).
            on('click', 'td.delete a', function () {
                var container = $(this).parent().parent(),
                    id = container.find('.id').html(),
                    date = container.find('.labelIcon').html(),
                    note = container.find('.note textarea').val();
                
                id = parseInt(id, 10);
                
                showDeleteNoteDialog(id, date, note, function () {
                    deleteNote(id);
                    localStorage.removeItem('georapbox.notes');
                    localStorage.setObj('georapbox.notes', _notes);
                    renderNotes();
                });
            }).
            on('click', 'td.edit a', function () {
                var textArea = $(this).parent().parent().find('textarea');
                makeEditable(textArea);
            }).
            on('focusout', 'td.note textarea', function () {
                var self = $(this),
                    noteValue,
                    noteId;

                if (self.hasClass('editable')) {
                    noteValue = self.val();
                    noteId = parseInt(self.parent().parent().find('td.id').html(), 10);

                    makeReadOnly(self);
                    updateNote(noteId, noteValue);
                    localStorage.removeItem('georapbox.notes');
                    localStorage.setObj('georapbox.notes', _notes);
                    renderNotes();
                }
            }).
            on('click', 'td.note .resize', function () {
                var textarea = $(this).next();
                
                if (textarea.height() === 53) {
                    textarea.height(textarea[0].scrollHeight);
                } else {
                    textarea.css({height: '53px'});
                }
                
            }).
            on('click', '#georapbox-notes-new-btn', showNewNoteModal);
        
        noteIcon.on('click', togglePanel).
            appendTo('#main-toolbar .buttons');
    }
    
    /**
     * Description: Initialize the extension.
     */
    AppInit.appReady(function () {
        panel = PanelManager.createBottomPanel('georapbox.notes.panel', $(notesPanelTemplate), 100);
        addStyles();
        addMenuCommands();
        addHandlers();
    });
});