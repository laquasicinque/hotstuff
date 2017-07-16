"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object") {
        module.exports = factory();
    } else {
        root.HotStuff = factory();
    }
})(window, function () {
    // Normalise and change certain keys
    var KEY_ALIAS_MAP = {
        "+": "plus",
        "-": "subtract",
        ",": "comma",
        " ": "space",
        "   ": "tab",
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        control: "ctrl",
        delete: "del"
    };

    // Generate KeyCode mapping. We could hardcode all of it, but its not too much a performance hit
    // to generate some of the keys
    var KEYCODE_ALIAS_MAP = function () {
        var keys = {
            8: "backspace",
            9: "tab",
            13: "enter",
            16: "shift",
            17: "ctrl",
            18: "alt",
            19: "pause",
            20: "capslock",
            27: "esc",
            32: "space",
            33: "pageup",
            34: "pagedown",
            35: "end",
            36: "home",
            37: "left",
            38: "up",
            39: "right",
            40: "down",
            45: "insert",
            46: "del",
            59: ";",
            61: "equals",
            91: "meta",
            92: "meta",
            93: "select",
            106: "multiply",
            107: "plus",
            109: "subtract",
            110: "decimal",
            111: "divide",
            144: "numlock",
            145: "scrolllock",
            186: ";",
            187: "equals",
            189: "minus",
            190: ".",
            191: "/",
            192: "grave",
            219: "[",
            220: "\\",
            221: "]",
            222: "'",
            223: "`"
        };

        for (var i = 0; i <= 9; i++) {
            // 0-9
            keys[48 + i] = String.fromCharCode(48 + i);
            // numpad0-9
            keys[96 + i] = "numpad" + i;
        }

        // f keys
        for (var _i = 0; _i <= 11; _i++) {
            keys[112 + _i] = "f" + (_i + 1);
        } // a-z
        for (var _i2 = 65; _i2 < 91; _i2++) {
            keys[_i2] = String.fromCharCode(_i2).toLowerCase();
        }return keys;
    }();

    // normalize keys by referring to KEY_ALIAS_MAP, this might have to be modified in the future
    // to take into account OS
    var normalizeHotKey = function normalizeHotKey(x) {
        return KEY_ALIAS_MAP[x] ? KEY_ALIAS_MAP[x] : x;
    };

    // function to sort our key array, forces order to begin ctrl-alt-shift if they exist,
    // at the moment this happens by setting them to unicode characters 0-2
    // (which can't by typed normally on a keyboard)
    var HotKeySort = function HotKeySort(a, b) {
        if (a === "ctrl" || a === "control") a = "\x00";
        if (a === "alt") a = "\x01";
        if (a === "shift") a = "\x02";

        if (b === "ctrl" || b === "control") b = "\x00";
        if (b === "alt") b = "\x01";
        if (b === "shift") b = "\x02";

        return a > b;
    };

    // may require some refactoring to take in special cases
    // such as having the ability to split multiple hotkeys by commas
    var parseKeyCode = function parseKeyCode(str) {
        return str.toLowerCase().split(/[+-]/);
    };

    // helper function to make sure that there is an array for us to push our handlers to
    var addKeyListener = function addKeyListener(T, key) {
        if (T._keyListeners[key] === undefined) T._keyListeners[key] = [];
        return T._keyListeners[key];
    };

    var getKeyObject = function getKeyObject(keyObj, key) {
        keyObj = keyObj._keys;
        if (keyObj[key] === undefined) keyObj[key] = {
            trigger: false,
            event: null
        };
        return keyObj[key];
    };

    function createFakeEvent(event, el) {
        var fakeEvent = document.createEventObject ? document.createEventObject() : document.createEvent("Event");
        if (fakeEvent.initEvent) {
            fakeEvent.initEvent("keyup", true, true);
        }
        // attempt to add as many properties from the original event to our new fakeEvent
        // avoid using has own property, it won't get most of the properties
        for (var prop in event) {
            try {
                fakeEvent[prop] = event[prop];
            } catch (e) {
                // do nothing, we'll just skip them.
            }
        }

        el.dispatchEvent ? el.dispatchEvent(fakeEvent) : el.fireEvent("onkeyup", fakeEvent);
    }

    var DEFINE = function DEFINE(o) {
        return function (p, v) {
            return Object.defineProperty(o, p, v);
        };
    };

    // Begin HotStuff Class
    var HotStuff = function HotStuff() {
        if (!(this instanceof HotStuff)) return new (Function.prototype.bind.apply(HotStuff, [null].concat(Array.prototype.slice.call(arguments))))();
        this.init.apply(this, arguments);
    };

    // use assign to add methods to the prototype
    Object.assign(HotStuff.prototype, {
        constructor: HotStuff,
        init: function init(el) {
            var _this = this;

            // with no element provided, try to attach to the window
            if (el === null || el === undefined) if (window) el = window;else throw new Error("No element found to attach HotStuff to and could not find window object.");

            var define = DEFINE(this);

            define("el", {
                get: function get() {
                    return el;
                },

                readOnly: true,
                enumerable: true
            });

            this._keyListeners = {};
            this._keysActive = [];
            this._unresolvedKeyUps = [];

            // internal variables for generic key listeners (ones that listen to all keys)
            this._genericKeyListeners = [];

            el.addEventListener("keydown", this.handleKeyDown.bind(this));
            el.addEventListener("keyup", this.handleKeyUp.bind(this));

            // when the window loses or gains focus, trigger all key up events that haven't been triggered
            (function (arr, func) {
                arr.forEach(function (x) {
                    return window.addEventListener(x, func);
                });
            })(['blur', 'focus'], function () {
                _this._unresolvedKeyUps.forEach(function (listenerGroup) {
                    createFakeEvent(listenerGroup._events[listenerGroup._events.length - 1], _this.el);
                    listenerGroup._events.splice();
                });

                // triggering generic key listeners are slightly more complex
                // loop through all the keys, checking if the trigger is set to true,
                // then creates the fake event for that letter
                _this._genericKeyListeners.forEach(function (listenerGroup) {
                    var keys = listenerGroup._keys;
                    for (var property in keys) {
                        if (keys.hasOwnProperty(property) && keys[property].trigger) {
                            createFakeEvent(keys[property].event, _this.el);
                            keys[property].trigger = false;
                        }
                    }
                });
            });
        },
        addListener: function addListener(keysArr, keydownHandler, keyupHandler) {
            var _this2 = this;

            // prepare our arguments
            if (typeof keysArr === "string") keysArr = [keysArr];
            if (keysArr === null) keysArr = [];
            if (keysArr instanceof Function) {
                keyupHandler = keydownHandler;
                keydownHandler = keysArr;
                keysArr = []; // pass an empty array, we'll detect the length of this later to determine type of listener
            }

            if (!(keysArr instanceof Array)) throw new Error("Invalid Keys provided");

            if (keyupHandler == null && keydownHandler == null) throw new Error("No handlers provided");

            // provide generic functions if none are provided
            if (keydownHandler == null) keydownHandler = function keydownHandler(_) {
                return _;
            };
            if (keyupHandler == null) keyupHandler = function keyupHandler(_) {
                return _;
            };

            var sharedStore = {};

            // if the array has no items in it, we treat it as though it's listening to all keys presses
            if (keysArr.length === 0) {
                var _events = [];
                var _keys = {};
                keydownHandler = keydownHandler.bind(this);
                keyupHandler = keyupHandler.bind(this);
                this._genericKeyListeners.push({
                    keyDown: function keyDown(e) {
                        _events.push(e);
                        return keydownHandler(e, sharedStore, _this2._keysActive.slice());
                    },
                    keyUp: function keyUp(e) {
                        return keyupHandler(e, sharedStore, _this2._keysActive.slice());
                    },
                    _keys: _keys,
                    _events: _events
                });
                // technically unnecessary bail out as the following forEach won't work
                return;
            }

            // Hotkeys were provided, loop through them
            keysArr.forEach(function (keys) {
                // normalise our input
                keys = parseKeyCode(keys).map(normalizeHotKey).sort(HotKeySort);

                var keyActiveBuffer = [];
                var _events = [];

                keydownHandler = keydownHandler.bind(_this2);
                keyupHandler = keyupHandler.bind(_this2);

                addKeyListener(_this2, keys.join("+")).push({
                    keyDown: function keyDown(e) {
                        // we need to cache a copy of the active keys at the time of the keyDown event
                        // as when keyUp is triggered the keysActive can be different. We can possibly fiddle with the
                        // handleKeyDown method to fix this, but one way or another, we should make a separate copy
                        // from the one that's sent to keydownHandler as we want to make sure its untampered with.
                        _events.push(e);
                        keyActiveBuffer = _this2._keysActive.slice();
                        return keydownHandler(e, sharedStore, _this2._keysActive.slice());
                    },
                    keyUp: function keyUp(e) {
                        return keyupHandler(e, sharedStore, keyActiveBuffer);
                    },
                    _events: _events // posibbly only need to set this to an item instead of an array
                });
            });
        },
        handleKeyDown: function handleKeyDown(e) {
            var _this3 = this;

            // perhaps refactor;
            var key = (e.which && e.keyCode ? KEYCODE_ALIAS_MAP[e.which || e.keyCode] : e.key).toLowerCase();

            // don't allow duplicates to be pushed into our active keys,
            // sort our keys so that they're in the same order every time
            if (!this._keysActive.includes(key)) {
                this._keysActive.push(key);
                this._keysActive.sort(HotKeySort);
            }

            // join the keys together to make a string, we can use this key to search our listeners to see
            // if it contains a property with the strings name
            var keyStr = this._keysActive.map(normalizeHotKey).join("+");

            if (this._keyListeners[keyStr] != null) this._keyListeners[keyStr].forEach(function (listenerGroup) {
                if (listenerGroup.keyDown(e) !== false) {
                    // if keyDown returns false, don't add keyUp
                    if (!_this3._unresolvedKeyUps.includes(listenerGroup)) {
                        _this3._unresolvedKeyUps.push(listenerGroup);
                    }
                }
            });

            // generic key listeners are queried after specific key listeners ones
            this._genericKeyListeners.forEach(function (listenerGroup) {
                var keyObj = getKeyObject(listenerGroup, key);
                keyObj.trigger = listenerGroup.keyDown(e) !== false;
                keyObj.event = e;
            });
        },
        handleKeyUp: function handleKeyUp(e) {
            var key = (e.which && e.keyCode ? KEYCODE_ALIAS_MAP[e.which || e.keyCode] : e.key).toLowerCase();

            if (this._keysActive.includes(key)) {
                this._keysActive.splice(this._keysActive.indexOf(key), 1);
                this._keysActive.sort(HotKeySort);
            }

            this._unresolvedKeyUps.forEach(function (listenerGroup) {
                return listenerGroup.keyUp(e);
            });
            this._unresolvedKeyUps.splice(0); // clear array

            // run through our generic key ups
            this._genericKeyListeners.forEach(function (listenerGroup) {
                var keyObj = getKeyObject(listenerGroup, key);
                if (keyObj.trigger !== false) {
                    listenerGroup.keyUp(e);
                    // set this trigger to false, this will stop this keyup event being triggered again
                    // on window blur
                    keyObj.trigger = false;
                    keyObj.event = null;
                }
            });
        }
    });

    return HotStuff;
});