/*global define */
define(function (require, exports, module) {
    'use strict';
    
//    var CLASS_NAME              = 'jump-to-text-marker',
//        NO_DEFINITION_MATCH     = 'No Definition match',
//        FUNCTION_NAME_INVALID   = 'Invalid Function Name';
    
    /**
     * Validate the token value in the editor.
     * 
     * @param {!string} type
     * @return boolean
     */
//    function isValidToken(type) {
//        if (type === 'property' || type === 'variable' || type === 'variable-2') {
//            return true;
//        }
//        return false;
//    }
    
    var ProjectManager          = brackets.getModule('project/ProjectManager');
    
    
    function init(){
        var $body = $('body');
        var $suggestionsContainer = $('<div id="suggestions-container"></div>');
        $body.append($suggestionsContainer);
        
        // creating a drop-down menu 
        var $completeList = $("<li class='dropdown suggestions-menu'></li>")
        .append($("<a href='#' class='dropdown-toggle' data-toggle='dropdown'></a>").hide())
        .append("<ul class='suggestions-dropdown-menu'></ul>");
        
        this.$completeList = $completeList;
        
        $suggestionsContainer.append($completeList);
    }
    
    function updateSuggestions (functionList){
        var self            = this,
            match           = functionList.match,
            selectInitial   = functionList.selectInitial,
            view            = { hints: [] },
            _addHint;

//        this.hints = functionList.hints;
//        this.hints.handleWideResults = functionList.handleWideResults;
        
        var rootDir = ProjectManager.getProjectRoot();
        var rootPath = rootDir.fullPath;
        for( var i = 0; i < functionList.length; i++ ){
            var filePath = functionList[i].document.file.fullPath;
            var relativeFilePath = filePath.replace(rootPath, '');
            view.hints.push({ 
                formattedHint: "<span>" + relativeFilePath + "</span>", 
                functionPath: functionList[i] 
            });
        }
        
        // clearing the old list 
        this.$completeList.find("li").remove();
        
        var $ul = this.$completeList.find("ul.dropdown-menu"),
                $parent = $ul.parent();
//
//        
//                // clear the list
//        this.$hintMenu.find("li").remove();
//        
//        // if there are no hints then close the list; otherwise add them and
//        // set the selection
//        if (this.hints.length === 0) {
//            if (this.handleClose) {
//                this.handleClose();
//            }
//        } else {
//            this.hints.some(function (item, index) {
//                if (index >= self.maxResults) {
//                    return true;
//                }
//
//                _addHint(item);
//            });
//
//            // render code hint list
//            var $ul = this.$hintMenu.find("ul.dropdown-menu"),
//                $parent = $ul.parent();
//
//            // remove list temporarily to save rendering time
//            $ul.remove().append(Mustache.render(CodeHintListHTML, view));
//
//            $ul.children("li").each(function (index, element) {
//                var hint        = self.hints[index],
//                    $element    = $(element);
//
//                // store hint on each list item
//                $element.data("hint", hint);
//
//                // insert jQuery hint objects after the template is rendered
//                if (hint.jquery) {
//                    $element.find(".codehint-item").append(hint);
//                }
//            });
//
//            // delegate list item events to the top-level ul list element
//            $ul.on("click", "li", function (e) {
//                // Don't let the click propagate upward (otherwise it will
//                // hit the close handler in bootstrap-dropdown).
//                e.stopPropagation();
//                if (self.handleSelect) {
//                    self.handleSelect($(this).data("hint"));
//                }
//            });
//
//            // Lists with wide results require different formatting
//            if (this.hints.handleWideResults) {
//                $ul.find("li a").addClass("wide-result");
//            }
//
//            // attach to DOM
//            $parent.append($ul);
//
//            this._setSelectedIndex(selectInitial ? 0 : -1);
//        }
    }
    
    function openSuggestionView () {
        
    }
    
    
    // exposing the modules outside
    module.exports = {
        init:                   init,
        updateSuggestions:      updateSuggestions,
        openSuggestionView:     openSuggestionView
        
    };

});

