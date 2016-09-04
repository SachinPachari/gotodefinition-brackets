/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/** Simple extension that takes the curson to the definition of the method. */
define(function (require, exports, module) {
    'use strict';

    // module imports
    var CommandManager          = brackets.getModule('command/CommandManager'),
        Menus                   = brackets.getModule('command/Menus'),
        AppInit                 = brackets.getModule('utils/AppInit');
        
    
    // file imports
    var EventBinder         = require('src/MouseEventBinder'),
        DefinitionHandler   = require('src/DefinitionHandler');
        
    
    // binding all events on the appReady event
    AppInit.appReady(function () {
        EventBinder.bindEvents();
    });

    // First, register a command - a UI-less object associating an id to a handler
    var MY_COMMAND_ID_FORWARD = 'gotodefinition-brackets.forward';
    CommandManager.register('Navigate To Definition', MY_COMMAND_ID_FORWARD, DefinitionHandler.handleGoToForward);
    var MY_COMMAND_ID_BACK = 'gotodefinition-brackets.backward';
    CommandManager.register('Go Back', MY_COMMAND_ID_BACK, DefinitionHandler.handleGoToBack);

    // adding to context menu since it can help user to go back also.
    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    contextMenu.addMenuItem(MY_COMMAND_ID_FORWARD);
    contextMenu.addMenuItem(MY_COMMAND_ID_BACK);
    
});