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

* @param Title
* @desc The name of the display title for the mission objective screen.
* @default MY MEMOS
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
var title = String(parameters['Title'] || "MY MEMOS");

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
            $gameSystem.addUpdateMessage("New memo added!");
            break;
        case 'addsub':
            $gameSystem.addSubObjective(args[0], args[1], args[2]);
            $gameSystem.addUpdateMessage("New task added!");
            break;
        case 'donemain':
            $gameSystem.completeObjective(args[0], args[1]);
            $gameSystem.addUpdateMessage("Memo completed!");
            break;
        case 'donesub':
            $gameSystem.completeSubObjective(args[0], args[1], args[2]);
            $gameSystem.addUpdateMessage("Task completed!");
            break;
        case 'setmain':
            $gameSystem.setObjective(args[0], args[1], args[2]);
            $gameSystem.addUpdateMessage("Memo entry updated!");
            break;
        case 'setsub':
            $gameSystem.setSubObjective(args[0], args[1], args[2]);
            $gameSystem.addUpdateMessage("Memo entry updated!");
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
var _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    var messages = $gameSystem.getUpdateMessages();
    if(messages && messages.length > 0) {
        this._missionUpdateWindow.setUpdateMessages(messages);
        this._missionUpdateWindow.open();
    }
};
var _Scene_Map_stop = Scene_Map.prototype.stop;
Scene_Map.prototype.stop = function() {
    _Scene_Map_stop.call(this);
    this._missionUpdateWindow.close();
};
var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows.call(this);
    this.createMissionUpdateWindow();
};

Scene_Map.prototype.createMissionUpdateWindow = function() {
    this._missionUpdateWindow = new Window_MissionUpdateText();
    this.addChild(this._missionUpdateWindow);
};
Scene_Map.prototype.updateCallMemo = function() {
    if ($gameSystem.isMemoEnabled()) {
        if (this.isMemoCalled()) {
            SoundManager.playOk();
            SceneManager.push(Scene_Mission);
        }
    }
};
Scene_Map.prototype.isMemoCalled = function() {
    return Input.isTriggered(openMemoKey);
};

// Game Object for the mission objectives
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
        this._success = !fail;
        this.setActive(false);
        this._subObjectives.forEach(function(sub) {
            $gameSystem.completeSubObjective(this._id, sub._alias, fail);
        }.bind(this));
    }
};

var _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this._allObjectives = [];
    this._updateMessages = [];
    this._memoEnabled = false;
};
Game_System.prototype.addUpdateMessage = function(message) {
    this._updateMessages.push(message);
};
Game_System.prototype.clearUpdateMessages = function() {
    this._updateMessages = [];
};
Game_System.prototype.getUpdateMessages = function() {
    return this._updateMessages;
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

    this._missionListWindow = new Window_MissionList(0, titleHeight, wh);
    this._missionListWindow.setHandler('cancel', this.onSelectCancel.bind(this));

    var wx = this._missionListWindow.width;
    var ww = Graphics.boxWidth - wx;

    this._missionTypeWindow = new Window_MissionIndex(wx, 0, ww);
    this._missionTypeWindow.setHandler('ok', this.onSelectOk.bind(this));
    this._missionTypeWindow.setHandler('cancel', this.popScene.bind(this));

    this._displayWindow = new Window_MissionDisplay(wx, titleHeight, ww, wh);

    this.addWindow(this._title);
    this.addWindow(this._missionListWindow);
    this.addWindow(this._missionTypeWindow);
    this.addWindow(this._displayWindow);

    this._missionTypeWindow.setDisplayWindow(this._missionListWindow);
    this._missionListWindow.setDisplayWindow(this._displayWindow);
};
Scene_Mission.prototype.onSelectOk = function() {
    this._missionListWindow.refresh();
    this._missionListWindow.select(Window_MissionList.lastIndex);
    this._missionListWindow.activate();
}
Scene_Mission.prototype.onSelectCancel = function() {
    this._missionListWindow.createContents();
    this._missionTypeWindow.activate();
}

function Window_MissionTitle() {
    this.initialize.apply(this, arguments);
}
Window_MissionTitle.prototype = Object.create(Window_Base.prototype);
Window_MissionTitle.prototype.constructor = Window_MissionTitle;

Window_MissionTitle.prototype.initialize = function(x, y) {
    var width = Graphics.boxWidth * 0.3;
    var height = this.fittingHeight(1);
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this.drawText(title, 0, 0, 120);
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

function Window_MissionList() {
    this.initialize.apply(this, arguments);
}
Window_MissionList.prototype = Object.create(Window_Selectable.prototype);
Window_MissionList.prototype.constructor = Window_MissionList;

Window_MissionList.lastTopRow = 0;
Window_MissionList.lastIndex = 0;

Window_MissionList.prototype.initialize = function(x, y, height) {
    var width = Graphics.boxWidth * 0.3;
    Window_Selectable.prototype.initialize.call(this, x, y, width, height);
    this.setTopRow(Window_MissionList.lastTopRow);
    this._list = [];
};
Window_MissionList.prototype.maxItems = function() {
    return this._list ? this._list.length : 0;
};
Window_MissionList.prototype.refresh = function() {
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
Window_MissionList.prototype.setDisplayMode = function(mode) {
    this._displayMode = mode;
    this.updateStatus();
};
Window_MissionList.prototype.setDisplayWindow = function(window) {
    this._displayWindow = window;
};
Window_MissionList.prototype.update = function() {
    Window_Selectable.prototype.update.call(this);
    this.updateStatus();
};
Window_MissionList.prototype.updateStatus = function() {
    if (this._displayWindow) {
        var item = this._list[this.index()];
        this._displayWindow.setItem(item);
    }
};
Window_MissionList.prototype.drawItem = function(index) {     
    var item = this._list[index];
    var rect = this.itemRectForText(index);
    this.changeTextColor(this.normalColor());
    this.changePaintOpacity(item._active);
    this.contents.fontSize = 18;
    this.drawText(item._alias, rect.x, rect.y, rect.width);
};
Window_MissionList.prototype.select = function(index) {  
    var maxIndex = this._list ? this._list.length - 1 : -1;
    if(index > maxIndex) index = maxIndex;
    Window_Selectable.prototype.select.call(this, index);
};
Window_MissionList.prototype.processCancel = function() {
    Window_Selectable.prototype.processCancel.call(this);
    Window_MissionList.lastTopRow = this.topRow();
    Window_MissionList.lastIndex = this.index();
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
    var objective = this._objective;
    this.contents.clear();
    if(objective) {
        this.changePaintOpacity(objective._active);
        this.changeTextColor(this.systemColor());
        this.contents.fontSize = 32;
        this.drawText(objective._alias, x, y);
        y += 44;
        this.changeTextColor(this.normalColor());
        
        this.contents.fontSize = 24;
        x += 8;
        var lines = this.applyTextBreak(objective._objective, Graphics.width * 0.7, 24);        
        lines.forEach(function(line) {
            this.drawText(line, x, y);
            y += 28;
        }.bind(this));
        y += 12;
        this.contents.fontSize = 20;
        objective._subObjectives.forEach(function(item) {
            lines = this.applyTextBreak(" » " + item._data, Graphics.width * 0.7, 20);
            lines.forEach(function(line) {
                this.drawText(line, x, y);
                y += 24;
            }.bind(this));
            y += 8;
        }.bind(this));
    }      
};
Window_MissionDisplay.prototype.applyTextBreak = function(text, boxWidth, fontSize) {
    fontSize *= 0.55;
    var lines = [];
    if(text.length * fontSize < boxWidth) {
        lines.push(text);
        return lines;
    }
    var words = text.split(" "); 
    var line = "";
    for(var i = 0, len = 0; i < words.length;) {
        len += (words[i].length + 1);
        if(len * fontSize < boxWidth) {
            line += `${words[i++]} `;
        }
        else {
            lines.push(line);
            line = "";
            len = 0;
        }
    }
    if(line.length > 0) lines.push(line);
    return lines;
};

function Window_MissionUpdateText() {
    this.initialize.apply(this, arguments);
}

Window_MissionUpdateText.prototype = Object.create(Window_Base.prototype);
Window_MissionUpdateText.prototype.constructor = Window_MissionUpdateText;

Window_MissionUpdateText.prototype.initialize = function() {
    var width = Graphics.width;
    var height = Graphics.height;
    Window_Base.prototype.initialize.call(this, 0, 0, width, height);
    this._updateMessages = [];
    this.opacity = 0;
    this.contentsOpacity = 0;
    this._showCount = 0;
    this.refresh();
};
Window_MissionUpdateText.prototype.windowWidth = function() {
    return 360;
};
Window_MissionUpdateText.prototype.windowHeight = function() {
    return this.fittingHeight(1);
};
Window_MissionUpdateText.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this._showCount > 0) {
        this.updateFadeIn();
        this._showCount--;
    } else {
        this.updateFadeOut();
    }
};
Window_MissionUpdateText.prototype.updateFadeIn = function() {
    this.contentsOpacity += 16;
};
Window_MissionUpdateText.prototype.updateFadeOut = function() {
    this.contentsOpacity -= 16;
};
Window_MissionUpdateText.prototype.open = function() {
    this.refresh();
    this._showCount = 100;
};
Window_MissionUpdateText.prototype.close = function() {
    this._showCount = 0;
};
Window_MissionUpdateText.prototype.refresh = function() {
    this.contents.clear();
    var width = this.windowWidth();
    var x = Graphics.width - width;
    var y = Graphics.height / 2 - this.windowHeight();
    this.contents.fontSize = 20;
    this._updateMessages.forEach(function(message) {
        this.drawBackground(x, y, width, this.lineHeight());
        this.drawText(message, x, y, width, 'center');
        y -= this.lineHeight();
    }.bind(this));  
    $gameSystem.clearUpdateMessages();
};
Window_MissionUpdateText.prototype.drawBackground = function(x, y, width, height) {
    var color1 = this.dimColor1();
    var color2 = this.dimColor2();
    this.contents.gradientFillRect(x, y, width / 2, height, color2, color1);
    this.contents.gradientFillRect(x + width / 2, y, width / 2, height, color1, color2);
};
Window_MissionUpdateText.prototype.setUpdateMessages = function(messages) {
    this._updateMessages = messages;
};