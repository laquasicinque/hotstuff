"use strict";var _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e};!function(e,t){"function"==typeof define&&define.amd?define([],t):"object"===("undefined"==typeof exports?"undefined":_typeof(exports))?module.exports=t():e.HotStuff=t()}(window,function(){var e={"+":"plus","-":"subtract",",":"comma"," ":"space","   ":"tab",arrowup:"up",arrowdown:"down",arrowleft:"left",arrowright:"right",control:"ctrl",delete:"del"},t=function(){for(var e={8:"backspace",9:"tab",13:"enter",16:"shift",17:"ctrl",18:"alt",19:"pause",20:"capslock",27:"esc",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down",45:"insert",46:"del",59:";",61:"equals",91:"meta",92:"meta",93:"select",106:"multiply",107:"plus",109:"subtract",110:"decimal",111:"divide",144:"numlock",145:"scrolllock",186:";",187:"equals",189:"minus",190:".",191:"/",192:"grave",219:"[",220:"\\",221:"]",222:"'",223:"`"},t=0;t<=9;t++)e[48+t]=String.fromCharCode(48+t),e[96+t]="numpad"+t;for(var n=0;n<=11;n++)e[112+n]="f"+(n+1);for(var i=65;i<91;i++)e[i]=String.fromCharCode(i).toLowerCase();return e}(),n=function(t){return e[t]?e[t]:t},i=function(e,t){return"ctrl"!==e&&"control"!==e||(e="\0"),"alt"===e&&(e=""),"shift"===e&&(e=""),"ctrl"!==t&&"control"!==t||(t="\0"),"alt"===t&&(t=""),"shift"===t&&(t=""),e>t},o=function(e){return e.toLowerCase().split(/[+-]/)},r=function(e,t){return void 0===e._keyListeners[t]&&(e._keyListeners[t]=[]),e._keyListeners[t]},s=function e(){if(!(this instanceof e))return new(Function.prototype.bind.apply(e,[null].concat(Array.prototype.slice.call(arguments))));this.init.apply(this,arguments)},c=function(e){return function(t,n){return Object.defineProperty(e,t,n)}};return Object.assign(s.prototype,{constructor:s,init:function(e){var t=this;if(null===e||void 0===e){if(!window)throw new Error("No element found to attach HotStuff to and could not find window object.");e=window}c(this)("el",{get:function(){return e},readOnly:!0,enumerable:!0}),this._keyListeners={},this._keysActive=[],this._unresolvedKeyUps=[],this._allKeyListeners=[],e.addEventListener("keydown",this.handleKeyDown.bind(this)),e.addEventListener("keyup",this.handleKeyUp.bind(this)),window.addEventListener("blur",function(){t._keysActive.splice(0)})},addListener:function(e,t,s){var c=this;if("string"==typeof e&&(e=[e]),e instanceof Function&&(s=t,t=e,e=[]),!(e instanceof Array))throw new Error("Invalid Keys provided");if(null==s&&null==t)throw new Error("No handlers provided");null==t&&(t=function(e){return e}),null==s&&(s=function(e){return e});var u={};if(0===e.length){var l=[];return t=t.bind(this),s=s.bind(this),void this._allKeyListeners.push({keyDown:function(e){return l=c._keysActive.slice(),t(e,u,c._keysActive.slice())},keyUp:function(e){return s(e,u,l)}})}e.forEach(function(e){e=o(e).map(n).sort(i);var l=[];t=t.bind(c),s=s.bind(c),r(c,e.join("+")).push({keyDown:function(e){return l=c._keysActive.slice(),t(e,u,c._keysActive.slice())},keyUp:function(e){return s(e,u,l)}})})},handleKeyDown:function(e){var o=this,r=(e.which&&e.keyCode?t[e.which||e.keyCode]:e.key).toLowerCase();this._keysActive.includes(r)||(this._keysActive.push(r),this._keysActive.sort(i));var s=this._keysActive.map(n).join("+");null!=this._keyListeners[s]&&this._keyListeners[s].forEach(function(t){!1!==t.keyDown(e)&&(o._unresolvedKeyUps.includes(t.keyUp)||o._unresolvedKeyUps.push(t.keyUp))}),this._allKeyListeners.forEach(function(t){!1!==t.keyDown(e)&&(o._unresolvedKeyUps.includes(t.keyUp)||o._unresolvedKeyUps.push(t.keyUp))})},handleKeyUp:function(e){var n=(e.which&&e.keyCode?t[e.which||e.keyCode]:e.key).toLowerCase();this._keysActive.includes(n)&&(this._keysActive.splice(this._keysActive.indexOf(n),1),this._keysActive.sort(i)),this._unresolvedKeyUps.forEach(function(t){return t(e)}),this._unresolvedKeyUps.splice(0)}}),s});