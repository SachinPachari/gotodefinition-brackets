/*global define */
define(function (require, exports, module) {
    'use strict';
    
//    var CLASS_NAME              = 'jump-to-text-marker',
//        NO_DEFINITION_MATCH     = 'No Definition match',
//        FUNCTION_NAME_INVALID   = 'Invalid Function Name';
    
//    /**
//     * Validate the token value in the editor.
//     * 
//     * @param {!string} type
//     * @return boolean
//     */
//    function isValidToken(type) {
//        if (type === 'property' || type === 'variable' || type === 'variable-2') {
//            return true;
//        }
//        return false;
//    }
    
    var CodeHintList        = brackets.getModule("editor/CodeHintList").CodeHintList,
        EditorManager       = brackets.getModule('editor/EditorManager');
    
    function initDropDown() {
        var editor = EditorManager.getCurrentFullEditor();
        this.hintList = new CodeHintList(editor, false);
    }
    
    function loadDefinionsList (functions) {
        // make the hintObj here 
        console.info(functions);
        this.hintList.update();
    }
    
    
    // exposing the modules outside
    module.exports = {
        initDropDown:           initDropDown,
        loadDefinionsList:      loadDefinionsList
    };

});