/*global $, brackets, define */
define(function (require, exports, module) {
    'use strict';
    
    var FUNCTION_NAME_INVALID   = 'Invalid Function Name',
        NO_DEFINITION_MATCH     = 'No Definition match',
        LanguageManager         = brackets.getModule('language/LanguageManager'),
        ProjectManager          = brackets.getModule('project/ProjectManager'),
        FileViewController      = brackets.getModule('project/FileViewController'),
        JSUtils                 = brackets.getModule('language/JSUtils');
    
    /**
     * Return the token string that is at the specified position.
     *
     * @param hostEditor {!Editor} editor
     * @param {!{line:number, ch:number}} pos
     * @return {functionName: string, reason: string}
     */
    function getFunctionName (hostEditor, pos) {
        var token = hostEditor._codeMirror.getTokenAt(pos, true);

        // If the pos is at the beginning of a name, token will be the
        // preceding whitespace or dot. In that case, try the next pos.
        if (!/\S/.test(token.string) || token.string === '.') {
            token = hostEditor._codeMirror.getTokenAt({line: pos.line, ch: pos.ch + 1}, true);
        }
        
        // Return valid function expressions only (function call or reference)
        if (!isValidToken(token.type)) {
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
    function findFunctionFile (functionName) {
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
//                                var cursorPos = {line: functions[0].lineStart};
//                                _setCursorPosition(cursorPos);
                                result.resolve(functions);
                            } else {
                                // No matching functions were found
                                result.reject({reason: NO_DEFINITION_MATCH});
                            }
                        }).fail(function () {
                            result.reject();
                        });
                } else {
                    // no result from Tern.  Fall back to findInProject().
                    findInProject(functionName).done(function (functions) {
                        if (functions && functions.length > 0) {
                            // TODO - issue with setting the ch value. so the ursor will be in ch:0
//                            var cursorPos = {line: functions[0].lineStart};
//                            _setCursorPosition(cursorPos);
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
    function findInProject(functionName) {
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
     * Validate the token value in the editor.
     * 
     * @param {!string} type
     * @return boolean
     */
    function isValidToken (type) {
        if(type === 'property' || type === 'variable' || type === 'variable-2'){
            return true;
        }
        return false;
    }
    
    
    module.exports = {
        getFunctionName: getFunctionName,
        isValidToken: isValidToken,
        findFunctionFile: findFunctionFile,
        findInProject: findInProject
    };

});

