/*global define */
define(function (require, exports, module) {
    'use strict';
    
    var CLASS_NAME              = 'jump-to-text-marker',
        NO_DEFINITION_MATCH     = 'No Definition match',
        FUNCTION_NAME_INVALID   = 'Invalid Function Name';
    
    /**
     * Validate the token value in the editor.
     * 
     * @param {!string} type
     * @return boolean
     */
    function isValidToken(type) {
        if (type === 'property' || type === 'variable' || type === 'variable-2') {
            return true;
        }
        return false;
    }
    
    // exposing the modules outside
    module.exports = {
        isValidToken:           isValidToken,
        CLASS_NAME:             CLASS_NAME,
        NO_DEFINITION_MATCH:    NO_DEFINITION_MATCH,
        FUNCTION_NAME_INVALID:  FUNCTION_NAME_INVALID
    };

});

