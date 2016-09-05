/*global $, brackets, define */
define(function (require, exports, module) {
    'use strict';
    
    // module imports 
    var ExtensionUtils          = brackets.getModule('utils/ExtensionUtils'),
        EditorManager           = brackets.getModule('editor/EditorManager');
    
    // file imports 
    var Utils               = require('src/Utils'),
        DefinitionHandler   = require('src/DefinitionHandler');
    
    var editorId = '#editor-holder',
        prevLine;
    
    
    function bindEvents() {
        // load stylesheet.
        ExtensionUtils.loadStyleSheet(module, '../styles/goto-definitions.css');
        // bind click listeners.
        $(editorId).on('click', clickListener);
        // bind hover linsteners  
        $(editorId).on('mousemove', moveListener);
        // bind "ctrl" up key to remove all markers
        $(editorId).on('keyup', ctrlUpListener);
    }
    
    
    /**
     * Handler for keyUp verifies only 'Ctrl' key
     * 
     * @param jQuery event 
     */
    
    function ctrlUpListener(e) {
        if (e.keyCode === 17) {
            _removeTextmarkers();
        }
    }
       
    /**
     * Handler mouse hover
     * 
     * @param jQuery event 
     */
    
    function moveListener(e) {
        // verifying if the 'Ctrl' key is pressed and held.
        if (e.ctrlKey) {
            var editor = EditorManager.getCurrentFullEditor();
            if(editor === undefined) {
                return;
            }
            var cm = editor._codeMirror;
            var cmPos = cm.coordsChar({
                left: e.pageX,
                top: e.pageY
            });
            
            var functionObj = cm.getTokenAt(cmPos);
            if (Utils.isValidToken(functionObj.type)) {
                var start = { line: cmPos.line, ch: functionObj.start };
                var end = { line: cmPos.line, ch: functionObj.end };
                prevLine = cmPos.line;
                if(cmPos.line !== prevLine){
                    _markTextHandler(editor, start, end, functionObj.string);
                }else{
                    _removeTextmarkers(editor);
                    _markTextHandler(editor, start, end, functionObj.string);
                }
            } else {
                _removeTextmarkers(editor);
            }
        }
    }
    
    
    /**
     * Handler mouse click
     * 
     * @param jQuery event 
     */
    
    function clickListener(e) {
        // verifying if the 'Ctrl' key is pressed and held.
        if (e.ctrlKey) {
            var editor = EditorManager.getCurrentFullEditor();
            var cm = editor._codeMirror;
            var cmPos = cm.coordsChar({
                left: e.pageX,
                top: e.pageY
            });
            var functionObj = cm.getTokenAt(cmPos);
            _removeTextmarkers(editor);
            DefinitionHandler.handleGoToForward(functionObj, cmPos);
        }
    }
    
    
    /**
     * Marks the given text
     * 
     * @param Editor Object
     * @param {line : number, ch : number} start
     * @param {line : number, ch : number} end
     * @param String query
     */
    
    function _markTextHandler(editor, start, end, query) {
        var cm = editor._codeMirror,
            allMarks = editor._codeMirror.doc.getAllMarks(),
            i,
            l;
        if (allMarks.length !== 0) {
            for (i = 0, l = allMarks.length; i < l; i++) {
                if (allMarks[i].className === Utils.CLASS_NAME) {
                    return;
                }
            }
        }
        cm.doc.markText(start, end, {className: Utils.CLASS_NAME});
    }
    
    /**
     * Removes all text marks in the editor
     * 
     * @param Editor Object
     */

    function _removeTextmarkers(editor) {
        editor = editor || EditorManager.getCurrentFullEditor();
        var allMarks = editor._codeMirror.doc.getAllMarks(),
            i,
            l;
        for (i = 0, l = allMarks.length; i < l; i++) {
            if (allMarks[i].className === Utils.CLASS_NAME) {
                allMarks[i].clear();
            }

        }
    }
    
    // exposing the modules outside
    module.exports = {
        bindEvents:           bindEvents
    };
    
});