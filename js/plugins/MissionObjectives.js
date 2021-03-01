//=============================================================================
// MissionObjectives.js
//=============================================================================

/*:
 * @plugindesc Displays misssion objectives.
 * @author Frankie Chen
 *
 * @param Open Brace
 * @desc The delimiting character for the opening brace to group multiple words as one single parameter for plugin commands.
 * @default \"
 * 
 * @param Close Brace
 * @desc The delimiting character for the closing brace to group multiple words as one single parameter for plugin commands.
 * @default \"
 *
 * @help
 *
 * Use the open and closing brace to enter multiple words as a single parameter.
 * 
 * Plugin Command:
 *   openmemo                                          # Open the memo screen
 *   addmain alias "objective"                         # Add new main objective with alias
 *   addsub main_alias sub_alias "objective"           # Add new sub objective to main objective with alias
 *   donemain alias                                    # Set main objective with alias as complete
 *   donesub main_alias sub_alias fail?                # Set sub objective of main objective with alias as complete
 *   setsub main_alias sub_alias "new sub objective"   # Set sub objective of main objective with alias as complete
 */

(function() {
    var parameters = PluginManager.parameters('MissionObjectives');
    var openBrace = String(parameters['Open Brace'] || '\"');
    var closeBrace = String(parameters['Close Brace'] || '\"');

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        switch (command) {
            case 'openmemo':
                SceneManager.push(Scene_Mission);
                break;
            case 'addmain':
                $gameSystem.addObjective(args[0], args[1]);
                break;
            case 'addsub':
                $gameSystem.addSubObjective(args[0], args[1], args[2]);
                break;
            case 'donemain':
                $gameSystem.completeObjective(args[0]);
                break;
            case 'donesub':
                $gameSystem.completeSubObjective(args[0], args[1], args[2]);
                break;
            case 'setsub':
                $gameSystem.setSubObjective(args[0], args[1], args[2]);
                break;
            }
    };

    Game_Interpreter.prototype.command356 = function() {
        var cmdtext = this._params[0];
        var args = [];
        var word = "";
        var quoteClosed = true;
        for(var i = 0; i < cmdtext.length; i++) {
            if(quoteClosed && cmdtext.charAt(i) === " ") {
                args.push(word);
                word = "";
            }
            else if(cmdtext.charAt(i) === openBrace || cmdtext.charAt(i) === closeBrace) quoteClosed = !quoteClosed;
            else word += cmdtext.charAt(i);
        }
        if(word.length > 0) args.push(word);
        var command = args.shift();
        this.pluginCommand(command, args);
        return true;
    };

    function Game_Mission() {
        this.initialize.apply(this, arguments);
    }
    Game_Mission.prototype.initialize = function() {
        this._subObjectives = [];
        this._objective = "";
        this._alias = "";
        this._active = true;
    };
    Game_Mission.prototype.setObjective = function(text) {
        this._objective = text;
    };
    Game_Mission.prototype.setAlias = function(text) {
        this._alias = text;
    };
    Game_Mission.prototype.setActive = function(bool) {
        this._active = bool;
    };

    var _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._allObjectives = [];
    };
    Game_System.prototype.addObjective = function(alias, item) {
        var objective = new Game_Mission();
        objective.setObjective(item);
        objective.setAlias(alias);
        this._allObjectives.push(objective);
    };
    Game_System.prototype.getObjectives = function() {
        return this._allObjectives;
    };
    Game_System.prototype.addSubObjective = function(alias, subAlias, item) {
        var i = this._allObjectives.map(function(obj) {return obj._alias || null}).indexOf(alias);
        if(i !== -1) {
            var sub = {
                _alias: subAlias,
                _data: item
            };
            this._allObjectives[i]._subObjectives.push(sub);
        }
    };
    Game_System.prototype.completeObjective = function(item) {
        var i = this._allObjectives.map(function(obj) {return obj._alias || null}).indexOf(item);
        if(i !== -1) {
            this._allObjectives[i].setActive(false);
        }
    };
    Game_System.prototype.completeSubObjective = function(alias, subAlias, fail) {
        var i = this._allObjectives.map(function(obj) {return obj._alias || null}).indexOf(alias);
        var main;
        if(i !== -1) {
            main = this._allObjectives[i];
            i = main._subObjectives.map(function(obj) {return obj._alias || null}).indexOf(subAlias);
            if(i !== -1) main._subObjectives[i] += fail ? " ✗" : " ✓";
        }
    };
    Game_System.prototype.setSubObjective = function(alias, subAlias, item) {
        var i = this._allObjectives.map(function(obj) {return obj._alias || null}).indexOf(alias);
        var main;
        if(i !== -1) {
            main = this._allObjectives[i];
            i = main._subObjectives.map(function(obj) {return obj._alias || null}).indexOf(subAlias);
            if(i !== -1) main._subObjectives[i] = item;
        }
    };

    function Scene_Mission() {
        this.initialize.apply(this, arguments);
    }

    Scene_Mission.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Mission.prototype.constructor = Scene_Mission;

    Scene_Mission.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_Mission.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this._title = new Window_MissionTitle(0, 0);
        
        var titleHeight = this._title.fittingHeight(1);  
        var wh = Graphics.boxHeight - titleHeight; 

        this._indexWindow = new Window_Mission(0, titleHeight, wh);
        this._indexWindow.setHandler('cancel', this.popScene.bind(this));
        
        var wx = this._indexWindow.width;
        var ww = Graphics.boxWidth - wx;

        this._displayWindow = new Window_MissionDisplay(wx, titleHeight, ww, wh);

        this.addWindow(this._title);
        this.addWindow(this._indexWindow);
        this.addWindow(this._displayWindow);

        this._indexWindow.setDisplayWindow(this._displayWindow);
    };

    function Window_MissionTitle() {
        this.initialize.apply(this, arguments);
    }
    Window_MissionTitle.prototype = Object.create(Window_Base.prototype);
    Window_MissionTitle.prototype.constructor = Window_MissionTitle;

    Window_MissionTitle.prototype.initialize = function(x, y) {
        var width = Graphics.boxWidth;
        var height = this.fittingHeight(1);
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this.makeFontBigger();
        this.drawText("Memos", width / 2 - 36 * 2, 0, 120);
    };
    Window_MissionTitle.prototype.update = function() {
        Window_Base.prototype.update.call(this);          
    };

    function Window_Mission() {
        this.initialize.apply(this, arguments);
    }
    Window_Mission.prototype = Object.create(Window_Selectable.prototype);
    Window_Mission.prototype.constructor = Window_Mission;

    Window_Mission.lastTopRow = 0;
    Window_Mission.lastIndex = 0;

    Window_Mission.prototype.initialize = function(x, y, height) {
        var width = Graphics.boxWidth / 3;
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this.refresh();
        this.setTopRow(Window_Mission.lastTopRow);
        this.select(Window_Mission.lastIndex);
        this.activate();
    };
    Window_Mission.prototype.maxItems = function() {
        return this._list ? this._list.length : 0;
    };
    Window_Mission.prototype.refresh = function() {
        this._list = [];
        var list = $gameSystem.getObjectives();
        for(var i = 0; i < list.length; i++) {
            var item = list[i];
            if(item._objective) {
                this._list.push(item);
            }
        }
        this.createContents();
        this.drawAllItems();
    };
    Window_Mission.prototype.setDisplayWindow = function(window) {
        this._displayWindow = window;
        this.updateStatus();
    };

    Window_Mission.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        this.updateStatus();
    };

    Window_Mission.prototype.updateStatus = function() {
        if (this._displayWindow) {
            var item = this._list[this.index()];
            this._displayWindow.setItem(item);
        }
    };
    Window_Mission.prototype.drawItem = function(index) {     
        var item = this._list[index];
        var rect = this.itemRectForText(index);
        this.changeTextColor(this.normalColor());
        this.changePaintOpacity(item._active);
        this.drawText(item._alias, rect.x, rect.y, rect.width);
    };

    function Window_MissionDisplay() {
        this.initialize.apply(this, arguments);
    }

    Window_MissionDisplay.prototype = Object.create(Window_Base.prototype);
    Window_MissionDisplay.prototype.constructor = Window_MissionDisplay;

    Window_MissionDisplay.prototype.initialize = function(x, y, width, height) {
        Window_Base.prototype.initialize.call(this, x, y, width, height);
    };
    Window_MissionDisplay.prototype.setItem = function(item) {
        if(this._objective !== item) {
            this._objective = item;
            this.refresh();
        }       
    };
    Window_MissionDisplay.prototype.update = function() {
        Window_Base.prototype.update.call(this);       
    };

    Window_MissionDisplay.prototype.refresh = function() {
        var x = 0;
        var y = 0;
        var lineHeight = this.lineHeight();
        var objective = this._objective;
        this.contents.clear();
        
        this.changePaintOpacity(objective._active);
        this.changeTextColor(this.systemColor());
        this.makeFontBigger();

        this.drawText(objective._alias, x, y);
        y += 12;
        this.resetFontSettings();
        this.drawTextEx("<WordWrap>"+objective._objective, x, y + lineHeight);
        var list = "<WordWrap>";
        objective._subObjectives.map(function(item) {
            list += ("» " + item + "<br>");
        });
        this.drawTextEx(list, x + 16, y + lineHeight * 2);
    };
})();