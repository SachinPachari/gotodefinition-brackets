/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that takes the curson to the definition of the method. */
define(function (require, exports, module) {
    "use strict";

    var CommandManager          = brackets.getModule("command/CommandManager"),
        Menus                   = brackets.getModule("command/Menus"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        KeyBindingManager       = brackets.getModule("command/KeyBindingManager"),
        LanguageManager         = brackets.getModule("language/LanguageManager"),
        JSUtils                 = brackets.getModule("language/JSUtils"),
        FileViewController      = brackets.getModule("project/FileViewController"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        AppInit                 = brackets.getModule("utils/AppInit"),
        storageStack            = [],
        FUNCTION_NAME_INVALID   = "Invalid Function Name",
        NO_DEFINITION_MATCH     = "No Definition match";


    // Function to run when the menu item is clicked
    function handleGoToForward() {
        
        var editor = EditorManager.getFocusedEditor();
        // Only provide a JavaScript editor when cursor is in JavaScript content
        if (editor.getModeForSelection() !== "javascript") {
            return null;
        }
        
        // Only provide JavaScript editor if the selection is within a single line
        var sel = editor.getSelection();
        if (sel.start.line !== sel.end.line) {
            return null;
        }
        
        var selectedText = _getFunctionName(editor, sel.start);
        if (selectedText.functionName !== null) {
            storageStack.push({file: editor.getFile(), pos: sel});
//            var selectedText = editor.getSelectedText();
            
            findFunctionFile(selectedText.functionName).done(function () {
//                editor.document.replaceRange("Hello, world!", insertionPos);    
                console.debug(arguments);
            }).fail(function (err) {
                _handleInvalid(err.reason);
            });
        }else{
            _handleInvalid(selectedText.reason);
        }
    }
    
    function handleGoToBack() {
        if(storageStack.length > 0){
            var memory = storageStack.pop();
            var filePath = memory.file.fullPath;
            var ch = memory.pos.end.ch;
            var line = memory.pos.end.line;
            FileViewController.openFileAndAddToWorkingSet(filePath).done(function () {
                EditorManager.getCurrentFullEditor().setCursorPos(line, ch, true);
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
        if (!/\S/.test(token.string) || token.string === ".") {
            token = hostEditor._codeMirror.getTokenAt({line: pos.line, ch: pos.ch + 1}, true);
        }

        // Return valid function expressions only (function call or reference)
        if (!((token.type === "variable") ||
              (token.type === "variable-2") ||
              (token.type === "property"))) {
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
    
    function findFunctionFile (functionName) {
        
        var helper = brackets._jsCodeHintsHelper;
        if (helper === null) {
            return null;
        }

        var result = new $.Deferred();

        var response = helper();
        if (response.hasOwnProperty("promise")) {
            response.promise.done(function (jumpResp) {
                var resolvedPath = jumpResp.fullPath;
                if (resolvedPath) {

                    // Tern doesn't always return entire function extent.
                    // Use QuickEdit search now that we know which file to look at.
                    var fileInfos = [];
                    fileInfos.push({name: jumpResp.resultFile, fullPath: resolvedPath});
                    JSUtils.findMatchingFunctions(functionName, fileInfos, true)
                        .done(function (functions) {
                            if (functions && functions.length > 0) {
                                // TODO - issue with setting the ch value. so the ursor will be in ch:0
                                var cursorPos = {line: functions[0].lineStart};
                                _setCursorPosition(cursorPos);
                                result.resolve(functions);
                            } else {
                                // No matching functions were found
                                result.reject({reason: NO_DEFINITION_MATCH});
                            }
                        })
                        .fail(function () {
                            result.reject();
                        });

                } else {        // no result from Tern.  Fall back to _findInProject().

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
    
    
    /*
    
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
     * Set the cursor in a specific Position
     * 
     * @param cursorPos {!{line:number, ch:number}}
     */
    function _setCursorPosition (cursorPos) {
        EditorManager.getCurrentFullEditor().setCursorPos(cursorPos.line, cursorPos.ch, true);
    }
    
    /**
     * Show info regarding the failure
     * 
     * @param cursorPos {!{line:number, ch:number}}
     */
    function _handleInvalid (reason) {
        console.debug('Failed to load the definitions : \n',reason);
    }

    
    function handleAltClick () {
        console.debug('Alt is held down');
    }
    

    // First, register a command - a UI-less object associating an id to a handler
    var MY_COMMAND_ID_FORWARD = "sachin.clicktogotodefinition.forward";
    CommandManager.register("Navigate To Definition", MY_COMMAND_ID_FORWARD, handleGoToForward);
    var MY_COMMAND_ID_BACK = "sachin.clicktogotodefinition.backward";
    CommandManager.register("Go Back", MY_COMMAND_ID_BACK, handleGoToBack);
    var MY_COMMAND_ID_CLICK = "sachin.clicktogotodefinition.click";
    CommandManager.register("clickEvent", MY_COMMAND_ID_CLICK, handleAltClick);

    // addign to context menu for now since ctrl+click is used for multiple cursor
    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    contextMenu.addMenuItem(MY_COMMAND_ID_FORWARD);
    contextMenu.addMenuItem(MY_COMMAND_ID_BACK);
    
    AppInit.appReady(function () {
        console.debug('htmlReady');
        // click listeners
        $("#editor-holder").on('click', function (e) {
            if(e.altKey){
                console.info(e);
            }
        });
        
        // highlighters
        $("#editor-holder").on('mousemove',function(e) {
            if(e.altKey){
                console.info(e.target, e.currentTarget);
            }
        });
        
    });
    
        //    $("#editor-holder").on('keydown keyup', function (e) {
//        
//            console.info(e);
//            
//                console.debug(this, overEvt);
//              }).mouseout(function(outEvt) {
//                console.debug(this, outEvt);
//              });
//        }
//    });
    
    
    
    
    
    $(document).on('htmlContentLoadComplete', function (e) {
        console.debug(e);
    });

    
    
    KeyBindingManager.addBinding(MY_COMMAND_ID_FORWARD, "Ctrl-Alt-E");
    KeyBindingManager.addBinding(MY_COMMAND_ID_BACK, "Ctrl-Alt-W");
//    KeyBindingManager.addBinding(MY_COMMAND_ID_CLICK, "Alt");

});