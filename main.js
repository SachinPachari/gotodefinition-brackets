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
        JSUtils                 = brackets.getModule('language/JSUtils'),
        FileViewController      = brackets.getModule('project/FileViewController'),
        ProjectManager          = brackets.getModule('project/ProjectManager'),
        AppInit                 = brackets.getModule('utils/AppInit'),
//        HighlightAgent          = brackets.getModule('LiveDevelopment/Agents/HighlightAgent'),
//        DOMNode                 = brackets.getModule('LiveDevelopment/Agents/DOMNode'),
//        DOMAgent                = brackets.getModule('LiveDevelopment/Agents/DOMAgent'),
        storageStack            = [],
        posHelper               = {},
        FUNCTION_NAME_INVALID   = 'Invalid Function Name',
        NO_DEFINITION_MATCH     = 'No Definition match',
        CLASS_NAME              = 'jump-to-text-marker';

    
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
            selectedText = _getFunctionName(editor, sel.start);
            storage = {
                file: editor.getFile(), 
                pos: sel.end
            };
            
        }else{
            selectedText = _getFunctionName(editor, cmPos);
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
                _findFunctionFile(selectedText.functionName).done(function () {
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
     * Return the token string that is at the specified position.
     *
     * @param hostEditor {!Editor} editor
     * @param {!{line:number, ch:number}} pos
     * @return {functionName: string, reason: string}
     */
    function _getFunctionName(hostEditor, pos) {
        var token = hostEditor._codeMirror.getTokenAt(pos, true);

        // If the pos is at the beginning of a name, token will be the
        // preceding whitespace or dot. In that case, try the next pos.
        if (!/\S/.test(token.string) || token.string === '.') {
            token = hostEditor._codeMirror.getTokenAt({line: pos.line, ch: pos.ch + 1}, true);
        }
        
        // Return valid function expressions only (function call or reference)
        if (!_isValidToken(token.type)) {
            return {
                functionName: null,
                reason: FUNCTION_NAME_INVALID
            };
        }

        return {
            functionName: token.string,
            reason: null
        };
    }
    
    
    /**
     * Find the function declaration in the open filse or project.
     *
     * @param {!string} functionName
     * @return {$.Promise} a promise that will be resolved with an array of function offset information
     */
    function _findFunctionFile (functionName) {
        var helper = brackets._jsCodeHintsHelper;
        if (helper === null) {
            return null;
        }
        var result = new $.Deferred();
        var response = helper();
        if (response.hasOwnProperty('promise')) {
            response.promise.done(function (jumpResp) {
                var resolvedPath = jumpResp.fullPath;
                if (resolvedPath) {
                    // Tern doesn't always return entire function extent.
                    // Use QuickEdit search now that we know which file to look at.
                    var fileInfos = [];
                    fileInfos.push({name: jumpResp.resultFile, fullPath: resolvedPath});
                    JSUtils.findMatchingFunctions(functionName, fileInfos, true).done(function (functions) {
                            if (functions && functions.length > 0) {
                                // TODO - issue with setting the ch value. so the ursor will be in ch:0
                                var cursorPos = {line: functions[0].lineStart};
                                _setCursorPosition(cursorPos);
                                result.resolve(functions);
                            } else {
                                // No matching functions were found
                                result.reject({reason: NO_DEFINITION_MATCH});
                            }
                        }).fail(function () {
                            result.reject();
                        });
                } else {
                    // no result from Tern.  Fall back to _findInProject().
                    _findInProject(functionName).done(function (functions) {
                        if (functions && functions.length > 0) {
                            // TODO - issue with setting the ch value. so the ursor will be in ch:0
                            var cursorPos = {line: functions[0].lineStart};
                            _setCursorPosition(cursorPos);
                            result.resolve(functions);
                        } else {
                            // No matching functions were found
                            result.reject({reason: NO_DEFINITION_MATCH});
                        }
                    }).fail(function (reason) {
                        result.reject(reason);
                    });
                }
            }).fail(function () {
                result.reject();
            });
        }

        return result.promise();
    }
    
    
    /**
     * @private
     * Finds the function in the open project folder and sub-folders
     * 
     * @param {!string} functionName
     * @return {$.Promise} a promise that will be resolved with an array of function offset information
     */
    function _findInProject(functionName) {
        var result = new $.Deferred();

        function _nonBinaryFileFilter(file) {
            return !LanguageManager.getLanguageForPath(file.fullPath).isBinary();
        }

        ProjectManager.getAllFiles(_nonBinaryFileFilter)
            .done(function (files) {
                JSUtils.findMatchingFunctions(functionName, files)
                    .done(function (functions) {
                        // TODO - need to open the correct file. 
                        if(functions.length === 0){
                            result.reject({reason: NO_DEFINITION_MATCH});
                            return;
                        }
                        var filePath = functions[0].document.file.fullPath;
                        FileViewController.openFileAndAddToWorkingSet(filePath).done(function () {
                            result.resolve(functions);
                        });
                    })
                    .fail(function (reason) {
                        result.reject(reason);
                    });
            })
            .fail(function (reason) {
                result.reject(reason);
            });

        return result.promise();
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
    
    function _isLastChForLine (functionObj) {
        
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
        
//        $('#editor-holder').on('keyup', function (e) {
//            console.info(e.keyCode);
//        });
        function _markTextHandler (editor, start, end, query) {
            var cm = editor._codeMirror;
            var allMarks = editor._codeMirror.doc.getAllMarks();
            if(allMarks.length !== 0){
                for(let i = 0, l=allMarks.length; i<l; i++){
                    if(allMarks[i].className === CLASS_NAME)
                    return;
                }    
            }
            cm.doc.markText(start, end, {className: CLASS_NAME});
        }
        
        function _removeTextmarkers (editor) {
            if(editor === undefined){
                return;
            }
            var allMarks = editor._codeMirror.doc.getAllMarks();
            for(let i = 0, l=allMarks.length; i<l; i++){
                if(allMarks[i].className === CLASS_NAME)
                allMarks[i].clear();
            }
            
//            $(editor._codeMirror.display.lineDiv).find('.jump-to-text-marker').each( function (idx, el) {
//                $(el).removeClass('jump-to-text-marker');
//            });
        }
    });
    
});