/*global $, brackets, define, console */
define(function (require, exports, module) {
    'use strict';
    
    // module imports 
    var EditorManager           = brackets.getModule('editor/EditorManager'),
        storageStack            = [];
    
    // file imports check for file in src folder
    var FileHelper  = require('src/filehelper');
    
    /**
     * Handler take the user to selected/clicked function.
     * 
     * @param {ch : number} functionObj
     * @param {line : number} cmPos
     */
    function handleGoToForward(functionObj, cmPos) {
        
        var editor = EditorManager.getFocusedEditor(),
            selectedText,
            storage;
        
        // Only provide a JavaScript editor when cursor is in JavaScript content
        if (editor.getModeForSelection() !== 'javascript') {
            return null;
        }
        
        if (functionObj === undefined) {
            // Only provide JavaScript editor if the selection is within a single line
            var sel = editor.getSelection();
            if (sel.start.line !== sel.end.line) {
                return null;
            }
            selectedText = FileHelper.getFunctionName(editor, sel.start);
            storage = {
                file : editor.getFile(),
                pos : sel.end
            };
            
        } else {
            selectedText = FileHelper.getFunctionName(editor, cmPos);
            storage = {
                file: editor.getFile(),
                pos: {
                    line: cmPos.line,
                    ch: functionObj.end // it is a ch value 
                }
            };
        }
        
        if (selectedText.functionName !== null) {
            _toggleGlassWindow(true);
            try {
                FileHelper.findFunctionFile(selectedText.functionName).done(function (funs) {
                    var cursorPos = {line: funs[0].lineStart};
                    _setCursorPosition(cursorPos);
                    storageStack.push(storage);
                    _toggleGlassWindow();
                }).fail(function (err) {
                    _toggleGlassWindow();
                    _handleInvalid(err.reason);
                });
            } catch (err) {
                console.error(err);
                // handle the hiding of glass window. in case of some errors
                _toggleGlassWindow();
            }
        } else {
            _handleInvalid(selectedText.reason);
        }
    }
    
    
    /**
     * Handler to go to earlier navigation. 
     * 
     */
    function handleGoToBack() {
        if (storageStack.length > 0) {
            var memory = storageStack.pop();
            var filePath = memory.file.fullPath;
            var ch = memory.pos.ch;
            var line = memory.pos.line;
            _toggleGlassWindow(true);
            FileHelper.openFile(filePath).done(function () {
                _toggleGlassWindow();
                EditorManager.getCurrentFullEditor().setCursorPos(line, ch, true);
            }).fail(function () {
                _toggleGlassWindow();
            });
        }
    }
    
    
    /**
     * Set the cursor in a specific Position by scrolling to the give line.
     * 
     * @param cursorPos {!{line:number, ch:number}}
     */
    function _setCursorPosition(cursorPos) {
        // can add a better curser placement. TODO
        EditorManager.getCurrentFullEditor().setCursorPos(cursorPos.line, cursorPos.ch, true);
    }
    
    /**
     * Show info regarding the failure 
     * 
     * @param {!string} reason
     */
    function _handleInvalid(reason) {
        console.debug('Failed to load the definitions : \n', reason);
        var editor = EditorManager.getCurrentFullEditor() || EditorManager.getFocusedEditor();
        editor.displayErrorMessageAtCursor(reason);
//        EditorManager._toggleInlineWidget(_inlineEditProviders, Strings.ERROR_QUICK_EDIT_PROVIDER_NOT_FOUND);
    }
    
    /**
     * toggle the glass window css to be shown during the loading.
     * 
     * @param {boolean} show
     */
    function _toggleGlassWindow(show) {
        if (show) {
            if (!$('#editor-holder').hasClass('glass-window')) {
                $('#editor-holder').addClass('glass-window');
            }
        } else {
            $('#editor-holder').removeClass('glass-window');
        }
    }
    
    
    // exposing modules
    module.exports = {
        handleGoToForward:           handleGoToForward,
        handleGoToBack:             handleGoToBack
    };

});

