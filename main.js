/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that takes the curson to the definition of the method. */
define(function (require, exports, module) {
    "use strict";

    var CommandManager  = brackets.getModule("command/CommandManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        Menus           = brackets.getModule("command/Menus"),
        LanguageManager = brackets.getModule("language/LanguageManager"),
        PerfUtils       = brackets.getModule("utils/PerfUtils"),
        JSUtils         = brackets.getModule("language/JSUtils"),
        ProjectManager  = brackets.getModule("project/ProjectManager");


    // Function to run when the menu item is clicked
    function handleHelloWorld() {
        var editor = EditorManager.getFocusedEditor();
        if (editor !== undefined && isValidEditorText(editor)) {
            var insertionPos = editor.getCursorPos();
            var selectedText = editor.getSelectedText();
//            _findInProject();
            _findInProject(selectedText).done(function (functions) {
                if (functions && functions.length > 0) {
                    var jsInlineEditor = new MultiRangeInlineEditor(functions);
                    jsInlineEditor.load(hostEditor);

                    PerfUtils.addMeasurement(PerfUtils.JAVASCRIPT_INLINE_CREATE);
                    result.resolve(jsInlineEditor);
                } else {
                    // No matching functions were found
                    PerfUtils.addMeasurement(PerfUtils.JAVASCRIPT_INLINE_CREATE);
                    result.reject();
                }
            }).fail(function () {
                PerfUtils.finalizeMeasurement(PerfUtils.JAVASCRIPT_INLINE_CREATE);
                result.reject();
            });
            editor.document.replaceRange("Hello, world!", insertionPos);
            
        }
    }
    
    function isValidEditorText (editor) {
        var flag = true;
        var selection = editor.getSelection();
        var selectedText = editor.getSelectedText();
        
        if(selectedText === undefined && selectedText === ""){
            flag = false;
            return flag;
        }
        
        if(selection.start.line !== selection.end.line){
            flag = false;
            return flag;
        }
        return flag;
    }
    
    function _findInProject(functionName) {
        var result = new $.Deferred();

        PerfUtils.markStart(PerfUtils.JAVASCRIPT_FIND_FUNCTION);

        function _nonBinaryFileFilter(file) {
            return !LanguageManager.getLanguageForPath(file.fullPath).isBinary();
        }

        ProjectManager.getAllFiles(_nonBinaryFileFilter)
            .done(function (files) {
                JSUtils.findMatchingFunctions(functionName, files)
                    .done(function (functions) {
                        PerfUtils.addMeasurement(PerfUtils.JAVASCRIPT_FIND_FUNCTION);
                        result.resolve(functions);
                    })
                    .fail(function () {
                        PerfUtils.finalizeMeasurement(PerfUtils.JAVASCRIPT_FIND_FUNCTION);
                        result.reject();
                    });
            })
            .fail(function () {
                result.reject();
            });

        return result.promise();
    }
    
    function handleInvalid () {
        console.debug('handleInvalid');
    }


    // First, register a command - a UI-less object associating an id to a handler
    var MY_COMMAND_ID = "sachin.clicktogotodefinition";   // package-style naming to avoid collisions
    CommandManager.register("clicktogotodefinition", MY_COMMAND_ID, handleHelloWorld);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
    menu.addMenuItem(MY_COMMAND_ID, "Ctrl-Alt-W");
//    menu.addMenuItem(MY_COMMAND_ID);
});