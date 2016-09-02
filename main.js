/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that takes the curson to the definition of the method. */
define(function (require, exports, module) {
    'use strict';

    var CommandManager          = brackets.getModule('command/CommandManager'),
        ExtensionUtils          = brackets.getModule('utils/ExtensionUtils'),
        Menus                   = brackets.getModule('command/Menus'),
        EditorManager           = brackets.getModule('editor/EditorManager'),
        LanguageManager         = brackets.getModule('language/LanguageManager'),
        
        FileViewController      = brackets.getModule('project/FileViewController'),
        ProjectManager          = brackets.getModule('project/ProjectManager'),
        AppInit                 = brackets.getModule('utils/AppInit'),
        storageStack            = [],
        FUNCTION_NAME_INVALID   = 'Invalid Function Name',
        NO_DEFINITION_MATCH     = 'No Definition match',
        CLASS_NAME              = 'jump-to-text-marker';
    
    
    var FileHelper = require('FileHelper');
    
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
        
        if(functionObj === undefined){
            // Only provide JavaScript editor if the selection is within a single line
            var sel = editor.getSelection();
            if (sel.start.line !== sel.end.line) {
                return null;
            }
            selectedText = FileHelper.getFunctionName(editor, sel.start);
            storage = {
                file: editor.getFile(), 
                pos: sel.end
            };
            
        }else{
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
            try{
                FileHelper.findFunctionFile(selectedText.functionName).done(function () {
                    storageStack.push(storage);
                    _toggleGlassWindow();
                }).fail(function (err) {
                    _toggleGlassWindow();
                    _handleInvalid(err.reason);
                });    
            }catch(err){
                console.error(err);
                // handle the hiding of glass window. in case of some errors
                _toggleGlassWindow();
            }
        }else{
            _handleInvalid(selectedText.reason);
        }
    }
    
    
    /**
     * Handler to go to earlier navigation. 
     * 
     */
    function handleGoToBack() {
        if(storageStack.length > 0){
            var memory = storageStack.pop();
            var filePath = memory.file.fullPath;
            var ch = memory.pos.ch;
            var line = memory.pos.line;
            _toggleGlassWindow(true);
            FileViewController.openFileAndAddToWorkingSet(filePath).done(function () {
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
    function _setCursorPosition (cursorPos) {
        EditorManager.getCurrentFullEditor().setCursorPos(cursorPos.line, cursorPos.ch, true);
    }
    
    /**
     * Show info regarding the failure 
     * 
     * @param {!string} reason
     */
    function _handleInvalid (reason) {
        console.debug('Failed to load the definitions : \n',reason);
        var editor = EditorManager.getCurrentFullEditor() || EditorManager.getFocusedEditor();
        editor.displayErrorMessageAtCursor(reason);
//        EditorManager._toggleInlineWidget(_inlineEditProviders, Strings.ERROR_QUICK_EDIT_PROVIDER_NOT_FOUND);
 
    }
    
    /**
     * Validate the token value in the editor.
     * 
     * @param {!string} type
     * @return boolean
     */
    function _isValidToken (type) {
        if(type === 'property' || type === 'variable' || type === 'variable-2'){
            return true;
        }
        return false;
    }
    
    /**
     * toggle the glass window css to be shown during the loading.
     * 
     * @param {boolean} show
     */
    function _toggleGlassWindow(show) {
        if(show){
            if(!$('#editor-holder').hasClass('glass-window')){
                $('#editor-holder').addClass('glass-window');
            }
        }else{
            $('#editor-holder').removeClass('glass-window');
        }
    }

    
    // First, register a command - a UI-less object associating an id to a handler
    var MY_COMMAND_ID_FORWARD = 'sachin.clicktogotodefinition.forward';
    CommandManager.register('Navigate To Definition', MY_COMMAND_ID_FORWARD, handleGoToForward);
    var MY_COMMAND_ID_BACK = 'sachin.clicktogotodefinition.backward';
    CommandManager.register('Go Back', MY_COMMAND_ID_BACK, handleGoToBack);

    // adding to context menu since it can help user to go back also.
    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    contextMenu.addMenuItem(MY_COMMAND_ID_FORWARD);
    contextMenu.addMenuItem(MY_COMMAND_ID_BACK);
    
    
    
    // adding the 
    AppInit.appReady(function () {
        // load stylesheet.
        ExtensionUtils.loadStyleSheet(module, 'styles/goto-definitions.css');
        // bind click listeners.
        $('#editor-holder').on('click', function (e) {
            // verifying if the 'Alt' key is pressed and held.
            if(e.ctrlKey){
                var editor = EditorManager.getCurrentFullEditor();
                var cm = editor._codeMirror;
                var cmPos = cm.coordsChar({
                    left:e.pageX, 
                    top:e.pageY
                });
                var functionObj = cm.getTokenAt(cmPos);
                _removeTextmarkers(editor);
                handleGoToForward(functionObj, cmPos);
            }
        });
        
        // bind hover linsteners  
        $('#editor-holder').on('mousemove', function (e) {
            // verifying if the 'Alt' key is pressed and held.
            if(e.ctrlKey){
                var editor = EditorManager.getCurrentFullEditor();
                var cm = editor._codeMirror;
                var cmPos = cm.coordsChar({
                    left:e.pageX, 
                    top:e.pageY
                });
                var functionObj = cm.getTokenAt(cmPos);
                if(_isValidToken(functionObj.type)){
                    var start = { line: cmPos.line, ch: functionObj.start };
                    var end = { line: cmPos.line, ch: functionObj.end };
                    _markTextHandler(editor, start, end, functionObj.string);
                }else {
                    _removeTextmarkers(editor);
                }
            }
        });
        
        $('#editor-holder').on('keyup', function (e) {
            if(e.keyCode === 17){
                _removeTextmarkers();
            }
        });
        function _markTextHandler (editor, start, end, query) {
            var cm = editor._codeMirror;
            var allMarks = editor._codeMirror.doc.getAllMarks();
            if(allMarks.length !== 0){
                for(var i = 0, l=allMarks.length; i<l; i++){
                    if(allMarks[i].className === CLASS_NAME){
                        return;
                    }
                }    
            }
            cm.doc.markText(start, end, {className: CLASS_NAME});
        }
        
        function _removeTextmarkers (editor) {
            editor = editor || EditorManager.getCurrentFullEditor();
            var allMarks = editor._codeMirror.doc.getAllMarks();
            for(var i = 0, l=allMarks.length; i<l; i++){
                if(allMarks[i].className === CLASS_NAME){
                    allMarks[i].clear();    
                }
                
            }
        }
    });
    
});