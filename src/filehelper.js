/*global $, brackets, define */
define(function (require, exports, module) {
    'use strict';
    
    // module imports
    var LanguageManager         = brackets.getModule('language/LanguageManager'),
        ProjectManager          = brackets.getModule('project/ProjectManager'),
        FileViewController      = brackets.getModule('project/FileViewController'),
        JSUtils                 = brackets.getModule('language/JSUtils'),
        TokenUtils              = brackets.getModule('utils/TokenUtils'),
        DropdownButton          = brackets.getModule('widgets/DropdownButton').DropdownButton;
    
        
    // file imports check for file in src folder
    var Utils = require('src/utils');
    var SuggestionList      = require('src/suggestionlist');
    
    /**
     * Return the token string that is at the specified position.
     *
     * @param hostEditor {!Editor} editor
     * @param {!{line:number, ch:number}} pos
     * @return {functionName: string, reason: string}
     */
    function getFunctionName(hostEditor, pos) {
        
//        var token = hostEditor._codeMirror.getTokenAt(pos, true);
        var cm = hostEditor._codeMirror;
        var token = TokenUtils.getTokenAt(cm, pos, true);

        // If the pos is at the beginning of a name, token will be the
        // preceding whitespace or dot. In that case, try the next pos.
        if (!/\S/.test(token.string) || token.string === '.') {
            token = TokenUtils.getTokenAt(cm, {line: pos.line, ch: pos.ch + 1}, true);
        }
        
        // Return valid function expressions only (function call or reference)
        if (!Utils.isValidToken(token.type)) {
            return {
                functionName: null,
                reason: Utils.FUNCTION_NAME_INVALID
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
    function findFunctionFile(functionName) {
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
                            processFunctions(functions, result);
                        } else {
                            // No matching functions were found
                            result.reject({reason: Utils.NO_DEFINITION_MATCH});
                        }
                    }).fail(function () {
                        result.reject();
                    });
                } else {
                    // no result from Tern.  Fall back to findInProject().
                    findInProject(functionName).done(function (functions) {
                        if (functions && functions.length > 0) {
                            processFunctions(functions, result);
                        } else {
                            // No matching functions were found
                            result.reject({reason: Utils.NO_DEFINITION_MATCH});
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
    
    
    function processFunctions (functions , $result) {
        
//        if(functions.length === 1){ // if single definition is only found, then proceed to open the file and complete.
//            var filePath = functions[0].document.file.fullPath;
//            openFile(filePath).done(function () {
//                $result.resolve(functions);
//            });
//            return;
//        }
        
        
        $result.resolve(functions);
        SuggestionList.updateSuggestions(functions);
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

        ProjectManager.getAllFiles(_nonBinaryFileFilter)
            .done(function (files) {
                
                JSUtils.findMatchingFunctions(functionName, files)
                    .done(function (functions) {
                        result.resolve(functions);
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
    
    function _nonBinaryFileFilter(file) {
        return !LanguageManager.getLanguageForPath(file.fullPath).isBinary();
    }
    
    
    /*
    * Opens the file in the given path
    * 
    * @param {!string} filePath
    * @return {$.Promise} a promise that will be resolved with an array of function offset information
    */
    
    function openFile(filePath) {
        var result = $.Deferred();
        
        FileViewController.openFileAndAddToWorkingSet(filePath).done(function () {
            result.resolve();
        }).fail(function () {
            result.reject();
        });
        
        return result.promise();
    }
    
    // exposing the modules outside
    module.exports = {
        getFunctionName:    getFunctionName,
        findFunctionFile:   findFunctionFile,
        findInProject:      findInProject,
        openFile:           openFile
    };
    
});

