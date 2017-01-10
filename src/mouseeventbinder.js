/*global $, brackets, define */
define(function (require, exports, module) {
    'use strict';
    
    // module imports 
    var ExtensionUtils          = brackets.getModule('utils/ExtensionUtils'),
        EditorManager           = brackets.getModule('editor/EditorManager'),
        DocumentManager         = brackets.getModule('document/DocumentManager');
    
    // file imports check for file in src folder
    var Utils               = require('src/utils'),
        DefinitionHandler   = require('src/definitionhandler');
    
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
        // to remove the markers while opening a new file.
        DocumentManager.on('currentDocumentChange', onDocumentChanged);
    }
    
    
     /**
     * onDocumentChanged Handler to ensure the markers are removed in the old file.
     * this is mainly due to that the old file markers were left behind and not removed.
     * 
     * @param jQuery event 
     */
    
    function onDocumentChanged(eventObj, toDoc, fromDoc) {
        if(fromDoc !== undefined && fromDoc !== null){
            _removeTextmarkers(fromDoc._masterEditor);    
        }
    }
                           
    
    /**
     * Handler for keyUp verifies only 'Ctrl' key
     * 
     * @param jQuery event 
     */
    
    function ctrlUpListener(e) {
        if (e.keyCode === 17 || e.keyCode === 91) {
            _removeTextmarkers();
        }
    }
	
	function isCmdOrCtrlKey (event) {
		if(window.navigator.platform.indexOf('Mac') !== -1){ // windows platform
			return event.metaKey;
		}else{ // mac
			return event.ctrlKey;
		}
	}
       
    /**
     * Handler mouse hover
     * 
     * @param jQuery event 
     */
    
    function moveListener(e) {
        // verifying if the 'Ctrl' key is pressed and held.
        if ((isCmdOrCtrlKey(e) && !e.shiftKey)) {
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
        }else if((isCmdOrCtrlKey(e) && e.shiftKey)) {
			var editor = EditorManager.getCurrentFullEditor();
			_removeTextmarkers(editor);
		}
    }
    
    
    /**
     * Handler mouse click
     * 
     * @param jQuery event 
     */
    
    function clickListener(e) {
        // verifying if the 'Ctrl' key is pressed and held.
        if ((isCmdOrCtrlKey(e) && !e.shiftKey)) {
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