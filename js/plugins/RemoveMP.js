//=============================================================================
//LTN_RemoveMP.js
//=============================================================================
// Version 1.0
/*:
* @plugindesc Remove the MP settings from the entire game.
*
* @author LTN Games
* @param Remove MP Bar
* @desc Removes all MP bars from the menus
* @default true
*
* @help
*/
(function() {
var LTN = LTN || {};
LTN.PluginName = LTN.PluginName || {};
LTN.Parameters = PluginManager.parameters('LTN_RemoveMP');
LTN.Params = LTN.Params || {};
LTN.Params.removeMPBar = String(LTN.Parameters['Remove MP Bar']).toLowerCase();
//=============================================================================
//
LTN.oldWindowBase_drawActorMP = Window_Base.prototype.drawActorMp;
//=============================================================================
Window_Base.prototype.drawActorMp = function(actor, x, y, width) {
  if(LTN.Params.removeMPBar === 'false'){
    LTN.oldWindowBase_drawActorMP.call(this, actor, x, y ,width);
  } else {
    // Do Nothing, don't draw anything
  }
};
})();