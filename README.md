## Brackets Notes Extension

Extension for [Brackets](https://github.com/adobe/brackets) that allows the user to easily add and manage notes, with [Markdown](http://daringfireball.net/projects/markdown/) support.\*

\* This small extension was firstly developed for my personal projects' needs but I thought I should share for anyone that might find it useful.

**Tested with Brackets Sprint >=37**

## Installation

### Git Clone
1. Under main menu select **Help > Show Extensions Folder**
2. Git clone this repository inside the "user" folder.

### Extension Manager
1. Under main menu select File > Extension Manager...
2. Search for "Notes"
3. Click "Install"

### How to use
1. Under main menu select **View > Notes** or use the shortcut **"CTRL+ALT+Shift+N"** or click the **"Notes" icon** on the extension toolbar to open the Notes Panel.
2. Click on the "NEW NOTE" button to open the dialog, type your note and click "Save".
3. You can edit a note by clicking on the "Edit" icon or delete it by clicking on the "X" icon.
4. Drag and drop notes to reorder them.

### Further info
- At the time being all notes are stored to Web Storage.

## Changelog
###1.0.2
- Extract notes to file.
- Group each note's options (extract, edit, delete) into a dropdown list.
- Bug fixing on reordering notes functionality.

###1.0.1
- Drag and drop to reorder notes.
- Remember if notes panel is visible or not.
- Refactor styles to conform with dark theme after Bracket's update to v0.43.

###1.0.0
- Add Markdown support.
- Refactor notes object structure.

###0.1.2
- Alert message when deleting note.
- UI updates.

###0.1.1
- Bug fixing

###0.1.0
- Initial release.