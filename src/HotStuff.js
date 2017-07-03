(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.HotStuff = factory();
    }
})(window, function() {
    // Normalise and change certain keys
    const KEY_ALIAS_MAP = {
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
    const KEYCODE_ALIAS_MAP = (function() {
        const keys = {
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

        for (let i = 0; i <= 9; i++) {
            // 0-9
            keys[48 + i] = String.fromCharCode(48 + i);
            // numpad0-9
            keys[96 + i] = "numpad" + i;
        }

        // f keys
        for (let i = 0; i <= 11; i++) keys[112 + i] = "f" + (i + 1);
        // a-z
        for (let i = 65; i < 91; i++)
            keys[i] = String.fromCharCode(i).toLowerCase();

        return keys;
    })();

    // normalize keys by referring to KEY_ALIAS_MAP, this might have to be modified in the future
    // to take into account OS
    const normalizeHotKey = x => (KEY_ALIAS_MAP[x] ? KEY_ALIAS_MAP[x] : x);

    // function to sort our key array, forces order to begin ctrl-alt-shift if they exist,
    // at the moment this happens by setting them to unicode characters 0-2
    // (which can't by typed normally on a keyboard)
    const HotKeySort = function(a, b) {
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
    const parseKeyCode = function(str) {
        return str.toLowerCase().split(/[+-]/);
    };

    // helper function to make sure that there is an array for us to push our handlers to
    const addKeyListener = function(T, key) {
        if (T._keyListeners[key] === undefined) T._keyListeners[key] = [];
        return T._keyListeners[key];
    };

    // Begin HotStuff Class
    const HotStuff = function() {
        if (!(this instanceof HotStuff)) return new HotStuff(...arguments);
        this.init(...arguments);
    };

    const DEFINE = o => (p, v) => Object.defineProperty(o, p, v);

    // use assign to add methods to the prototype
    Object.assign(HotStuff.prototype, {
        constructor: HotStuff,
        init(el) {
            // with no element provided, try to attach to the window
            if (el === null || el === undefined)
                if (window) el = window;
                else
                    throw new Error(
                        "No element found to attach HotStuff to and could not find window object."
                    );

            const define = DEFINE(this);

            define("el", {
                get() {
                    return el;
                },
                readOnly: true,
                enumerable: true
            });

            this._keyListeners = {};
            this._keysActive = [];
            this._unresolvedKeyUps = [];
            this._genericKeyListeners = [];

            el.addEventListener("keydown", this.handleKeyDown.bind(this));
            el.addEventListener("keyup", this.handleKeyUp.bind(this));
            // when the window loses focus, remove all active keys
            window.addEventListener("blur", () => {
                this._keysActive.splice(0);
                // TODO: Do something with unresolvedKeyUps
                // at the moment we leave unresolvedKeyUps, we will want to trigger all of them
                // but we don't have an KeyboardEvent to provide it, we need to handle this
            });
        },
        addListener(keysArr, keydownHandler, keyupHandler) {
            // prepare our arguments
            if (typeof keysArr === "string") keysArr = [keysArr];
            if (keysArr instanceof Function) {
                keyupHandler = keydownHandler;
                keydownHandler = keysArr;
                keysArr = []; // pass an empty array, we'll detect the length of this later to determine type of listener
            }


            if (!(keysArr instanceof Array)) throw new Error("Invalid Keys provided");

            if (keyupHandler == null && keydownHandler == null)
                throw new Error("No handlers provided");
            if (keydownHandler == null) keydownHandler = _ => _;
            if (keyupHandler == null) keyupHandler = _ => _;

            const sharedStore = {};

            // if the array has no items in it, we treat it as though it's listening to all keys presses
            if (keysArr.length === 0) {
                let keyActiveBuffer = [];
                keydownHandler = keydownHandler.bind(this);
                keyupHandler = keyupHandler.bind(this);
                this._allKeyListeners.push({
                    keyDown: e => {
                        // we need to cache a copy of the active keys at the time of the keyDown event
                        // as when keyUp is triggered the keysActive can be different. We can possibly fiddle with the
                        // handleKeyDown method to fix this, but one way or another, we should make a separate copy
                        // from the one that's sent to keydownHandler as we want to make sure its untampered with.
                        keyActiveBuffer = this._keysActive.slice();
                        return keydownHandler(e, sharedStore, this._keysActive.slice());
                    },
                    keyUp: e => keyupHandler(e, sharedStore, keyActiveBuffer)
                });
                return;
            }


            keysArr.forEach(keys => {
                // normalise our input
                keys = parseKeyCode(keys).map(normalizeHotKey).sort(HotKeySort);

                let keyActiveBuffer = [];

                keydownHandler = keydownHandler.bind(this);
                keyupHandler = keyupHandler.bind(this);

                addKeyListener(this, keys.join("+")).push({
                    keyDown: e => {
                        keyActiveBuffer = this._keysActive.slice();
                        return keydownHandler(e, sharedStore, this._keysActive.slice());
                    },
                    keyUp: e => keyupHandler(e, sharedStore, keyActiveBuffer)
                });
            });
        },
        handleKeyDown(e) {
            // perhaps refactor;
            const key = (e.which && e.keyCode
                ? KEYCODE_ALIAS_MAP[e.which || e.keyCode]
                : e.key).toLowerCase();

            // don't allow duplicates to be pushed into our active keys,
            // sort our keys so that they're in the same order every time
            if (!this._keysActive.includes(key)) {
                this._keysActive.push(key);
                this._keysActive.sort(HotKeySort);
            }

            // join the keys together to make a string, we can use this key to search our listeners to see
            // if it contains a property with the strings name
            const keyStr = this._keysActive.map(normalizeHotKey).join("+");

            if (this._keyListeners[keyStr] != null)
                this._keyListeners[keyStr].forEach(x => {
                    if (x.keyDown(e) !== false) {
                        // if keyDown returns false, don't add keyUp
                        if (!this._unresolvedKeyUps.includes(x.keyUp)) {
                            this._unresolvedKeyUps.push(x.keyUp);
                        }
                    }
                });
            // generic key listeners are queried after specific ones
            this._allKeyListeners.forEach(x => {
                if (x.keyDown(e) !== false) {
                    if (!this._unresolvedKeyUps.includes(x.keyUp)) {
                        this._unresolvedKeyUps.push(x.keyUp);
                    }
                }
            });
        },
        handleKeyUp(e) {
            const key = (e.which && e.keyCode
                ? KEYCODE_ALIAS_MAP[e.which || e.keyCode]
                : e.key).toLowerCase();
            if (this._keysActive.includes(key)) {
                this._keysActive.splice(this._keysActive.indexOf(key), 1);
                this._keysActive.sort(HotKeySort);
            }
            this._unresolvedKeyUps.forEach(x => x(e));
            this._unresolvedKeyUps.splice(0); // clear array
        }
    });

    return HotStuff;
});