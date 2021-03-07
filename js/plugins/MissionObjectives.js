//=============================================================================
// MissionObjectives.js
//=============================================================================

/*:
* @plugindesc Displays mission objectives.
* @author Frankie Chen
*
* @param Open Brace
* @desc The delimiting character for the opening brace to group multiple words as one single parameter for plugin commands.
* @default "
* 
* @param Close Brace
* @desc The delimiting character for the closing brace to group multiple words as one single parameter for plugin commands.
* @default "
* 
* @param Open Memo Key
* @desc The hotkey for opening the mission objective screen.
* @default tab
* 
* @param Event Switch
* @desc The switch ID for checking whether a mission objective is active.
* @default 1
*
* @help
*
* Use the open and closing brace to enter multiple words as a single parameter.
* 
* Plugin Command:
*   openmemo                                  # Open the memo screen
*   enablememokey true/false                  # Enable the memo screen hotkey
*   addmain id alias "objective"              # Add a new main objective
*   addsub id sub_alias "objective"           # Add a new sub objective to the main objective with id
*   donemain id fail?                         # Set main objective with id as complete
*   donesub id sub_alias fail?                # Set sub objective of a main objective as complete
*   setmain id alias? "new objective"?        # Replace a main objective with a new alias and/or objective
*   setsub id sub_alias "new sub objective"   # Replace sub objective with a new sub objective
*   checkmain id                              # Check if a main objective is active (for event scripting)
*   checksub id sub_alias                     # Check if a sub objective is active (for event scripting)
*   checksuccess id                           # Check if a main objective is successfully completed
* 
*/

var parameters = PluginManager.parameters('MissionObjectives');
var openBrace = String(parameters['Open Brace'] || '\"');
var closeBrace = String(parameters['Close Brace'] || '\"');
var openMemoKey = String(parameters['Open Memo Key'] || 'tab');
var switchID = Number(parameters['Event Switch'] || 1);

var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    switch (command) {
        case 'openmemo':
            SoundManager.playOk();
            SceneManager.push(Scene_Mission);
            break;
        case 'enablememokey':
            $gameSystem.enabledMemo(args[0]);
            break; 
        case 'addmain':
            $gameSystem.addObjective(args[0], args[1], args[2]);
            break;
        case 'addsub':
            $gameSystem.addSubObjective(args[0], args[1], args[2]);
            break;
        case 'donemain':
            $gameSystem.completeObjective(args[0], args[1]);
            break;
        case 'donesub':
            $gameSystem.completeSubObjective(args[0], args[1], args[2]);
            break;
        case 'setmain':
            $gameSystem.setObjective(args[0], args[1], args[2]);
            break;
        case 'setsub':
            $gameSystem.setSubObjective(args[0], args[1], args[2]);
            break;
        case 'checkmain':
            $gameSwitches.setValue(switchID, $gameSystem.checkIfObjectiveIsActive(args[0]));
            break;  
        case 'checksub':
            $gameSwitches.setValue(switchID, $gameSystem.checkIfSubObjectiveIsActive(args[0], args[1]));
            break;   
        case 'checksuccess':
            $gameSwitches.setValue(switchID, $gameSystem.checkIfObjectiveIsSuccessful(args[0]));
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

var _Scene_Map_updateScene = Scene_Map.prototype.updateScene;
Scene_Map.prototype.updateScene = function() {
    _Scene_Map_updateScene.call(this);
    if (!SceneManager.isSceneChanging()) {
        this.updateCallMemo();
    }
};
Scene_Map.prototype.updateCallMemo = function() {
    if ($gameSystem.isMemoEnabled()) {
        if (this.isMemoCalled() && !$gamePlayer.isMoving()) {
            SoundManager.playOk();
            SceneManager.push(Scene_Mission);
        }
    }
};
Scene_Map.prototype.isMemoCalled = function() {
    return Input.isTriggered(openMemoKey);
};

function Game_Mission() {
    this.initialize.apply(this, arguments);
}
Game_Mission.prototype.initialize = function(id, alias, data) {
    this._subObjectives = [];
    this._objective = data;
    this._alias = alias;
    this._id = id;
    this._active = true;
    this._success = false;
};
Game_Mission.prototype.setObjective = function(text) {
    if(text) this._objective = text;
};
Game_Mission.prototype.setAlias = function(text) {
    if(text) this._alias = text;
};
Game_Mission.prototype.setActive = function(bool) {
    this._active = bool;
};
Game_Mission.prototype.completeObjective = function(fail) {
    if(this._active) {
        this._objective += fail ? " ✗" : " ✓";
        this._success = !!fail;
        this.setActive(false);
    }
};

var _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this._allObjectives = [];
    this._memoEnabled = false;
};
Game_System.prototype.addObjective = function(id, alias, data) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    if(i === -1) { //Duplicate check
        var objective = new Game_Mission(id, alias, data);
        this._allObjectives.push(objective);
    }    
};
Game_System.prototype.getObjectives = function() {
    return this._allObjectives;
};
Game_System.prototype.addSubObjective = function(id, subAlias, item) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    var main;
    if(i !== -1) {
        main = this._allObjectives[i];
        var sub = {
            _alias: subAlias,
            _data: item,
            _active: true
        };
        i = main._subObjectives.map(function(obj) {return obj._alias || null}).indexOf(subAlias);
        //Duplicate check
        if(i === -1) main._subObjectives.push(sub);
    }
};
Game_System.prototype.completeObjective = function(id, fail) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    if(i !== -1) {
        console.log(this._allObjectives[i])
        this._allObjectives[i].completeObjective(fail);
    }
};
Game_System.prototype.completeSubObjective = function(id, subAlias, fail) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    var main;
    if(i !== -1) {
        main = this._allObjectives[i];
        i = main._subObjectives.map(function(obj) {return obj._alias || null}).indexOf(subAlias);
        if(i !== -1 && main._subObjectives[i]._active) {
            main._subObjectives[i]._data += fail ? " ✗" : " ✓";
            main._subObjectives[i]._active = false;
        }
    }
};
Game_System.prototype.setObjective = function(id, alias, data) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    if(i !== -1) {
        this._allObjectives[i].setAlias(alias === "=" ? null : alias);
        this._allObjectives[i].setObjective(data === "=" ? null : data);
    }
};
Game_System.prototype.setSubObjective = function(id, subAlias, item) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    var main;
    if(i !== -1) {
        main = this._allObjectives[i];
        i = main._subObjectives.map(function(obj) {return obj._alias || null}).indexOf(subAlias);
        if(i !== -1) main._subObjectives[i]._data = item;
    }
};
Game_System.prototype.checkIfObjectiveIsActive = function(id) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    if(i !== -1) return this._allObjectives[i]._active;
    return false;
};
Game_System.prototype.checkIfSubObjectiveIsActive = function(id, subAlias) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    if(i !== -1) {
        var subList = this._allObjectives[i]._subObjectives;
        i = subList.map(function(obj) {return obj._alias || null}).indexOf(subAlias);
        if(i !== -1) return subList[i]._active;
    }    
    return false;
};
Game_System.prototype.checkIfObjectiveIsSuccessful = function(id) {
    var i = this._allObjectives.map(function(obj) {return obj._id || null}).indexOf(id);
    if(i !== -1) return this._allObjectives[i]._success;
    return false;
};
Game_System.prototype.enabledMemo = function(param) {
    var bool = param === "true" ? true : false;
    this._memoEnabled = bool;
};
Game_System.prototype.isMemoEnabled = function() {
    return this._memoEnabled;
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
    this._indexWindow.setHandler('cancel', this.onSelectCancel.bind(this));

    var wx = this._indexWindow.width;
    var ww = Graphics.boxWidth - wx;

    this._indexModeWindow = new Window_MissionIndex(wx, 0, ww);
    this._indexModeWindow.setHandler('ok', this.onSelectOk.bind(this));
    this._indexModeWindow.setHandler('cancel', this.popScene.bind(this));

    this._displayWindow = new Window_MissionDisplay(wx, titleHeight, ww, wh);

    this.addWindow(this._title);
    this.addWindow(this._indexWindow);
    this.addWindow(this._indexModeWindow);
    this.addWindow(this._displayWindow);

    this._indexModeWindow.setDisplayWindow(this._indexWindow);
    this._indexWindow.setDisplayWindow(this._displayWindow);
};
Scene_Mission.prototype.onSelectOk = function() {
    this._indexWindow.refresh();
    console.log(Window_Mission.lastIndex);
    this._indexWindow.select(Window_Mission.lastIndex);
    this._indexWindow.activate();
}
Scene_Mission.prototype.onSelectCancel = function() {
    this._indexWindow.createContents();
    this._indexModeWindow.activate();
}

function Window_MissionTitle() {
    this.initialize.apply(this, arguments);
}
Window_MissionTitle.prototype = Object.create(Window_Base.prototype);
Window_MissionTitle.prototype.constructor = Window_MissionTitle;

Window_MissionTitle.prototype.initialize = function(x, y) {
    var width = Graphics.boxWidth / 3;
    var height = this.fittingHeight(1);
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this.drawText("My Memos", 0, 0, 120);
};
Window_MissionTitle.prototype.update = function() {
    Window_Base.prototype.update.call(this);          
};

function Window_MissionIndex() {
    this.initialize.apply(this, arguments);
}
Window_MissionIndex.prototype = Object.create(Window_Selectable.prototype);
Window_MissionIndex.prototype.constructor = Window_MissionIndex;

Window_MissionIndex.prototype.initialize = function(x, y, width) {
    var height = this.fittingHeight(1);
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
    this.setTopRow(0);
    this.select(0);
    this.activate();
};
Window_MissionIndex.prototype.maxItems = function() {
    return 3;
};
Window_MissionIndex.prototype.maxCols = function() {
    return 3;
};
Window_MissionIndex.prototype.refresh = function() {
    this._list = ["Current", "Completed", "All"];
    this.createContents();
    this.drawAllItems();
};
Window_MissionIndex.prototype.setDisplayWindow = function(window) {
    this._displayWindow = window;
};
Window_MissionIndex.prototype.update = function() {
    Window_Selectable.prototype.update.call(this);
    this.updateStatus();
};
Window_MissionIndex.prototype.updateStatus = function() {
    if (this._displayWindow) {
        var item = this._list[this.index()];
        this._displayWindow.setDisplayMode(item);
    }
};
Window_MissionIndex.prototype.drawItem = function(index) {     
    var item = this._list[index];
    var rect = this.itemRectForText(index);
    this.changeTextColor(this.normalColor());
    this.drawText(item, rect.x, rect.y, rect.width, 'center');
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
    this.setTopRow(Window_Mission.lastTopRow);
    this._list = [];
};
Window_Mission.prototype.maxItems = function() {
    return this._list ? this._list.length : 0;
};
Window_Mission.prototype.refresh = function() {
    var list = $gameSystem.getObjectives();
    var check;     
    for(var i = list.length - 1; i >= 0; i--) {
        var item = list[i];  
        switch(this._displayMode) {
            case "Current":
                check = item._objective && item._active;
                break;
            case "Completed":
                check = item._objective && !item._active;
                break;
            case "All":
                check = item._objective;
                break;
            default:
                check = false;
        }       
        if(check) this._list.push(item);
    }
    this.createContents();
    this.drawAllItems();
};
Window_Mission.prototype.setDisplayMode = function(mode) {
    this._displayMode = mode;
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
    this.contents.fontSize = 20;
    this.drawText(item._alias, rect.x, rect.y, rect.width);
};
Window_Mission.prototype.select = function(index) {  
    var maxIndex = this._list ? this._list.length - 1 : -1;
    if(index > maxIndex) index = maxIndex;
    Window_Selectable.prototype.select.call(this, index);
};
Window_Mission.prototype.processCancel = function() {
    Window_Selectable.prototype.processCancel.call(this);
    Window_Mission.lastTopRow = this.topRow();
    Window_Mission.lastIndex = this.index();
    this.deselect();
    this._list = [];
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
    if(objective) {
        this.changePaintOpacity(objective._active);
        this.changeTextColor(this.systemColor());
        this.contents.fontSize = 28;
        this.drawText(objective._alias, x, y);
        y += 8;
        var list = "<WordWrap>" + objective._objective + "<br>";
        objective._subObjectives.map(function(item) {
            list += (" » " + item._data + "<br><br>");
        });
        this.drawTextEx(list, x, y + lineHeight);
    }      
};