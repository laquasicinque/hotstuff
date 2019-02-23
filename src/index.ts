import { KEY_ALIAS_MAP, KEYCODE_ALIAS_MAP } from './keyAliases'

// normalize keys by referring to KEY_ALIAS_MAP, this might have to be modified in the future
// to take into account OS
const normalizeHotKey = x => (KEY_ALIAS_MAP[x] ? KEY_ALIAS_MAP[x] : x);

// function to sort our key array, forces order to begin ctrl-alt-shift if they exist,
// at the moment this happens by setting them to unicode characters 0-2
// (which can't by typed normally on a keyboard)
const HotKeySort = function (a, b) {
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
const parseKeyCode = function (str) {
    return str.toLowerCase().split(/[+-]/);
};

// helper function to make sure that there is an array for us to push our handlers to
const addKeyListener = function (T, key) {
    if (T._keyListeners[key] === undefined) T._keyListeners[key] = [];
    return T._keyListeners[key];
};

const getKeyObject = function (keyObj, key) {
    keyObj = keyObj._keys;
    if (keyObj[key] === undefined) keyObj[key] = {
        trigger: false,
        event: null
    }
    return keyObj[key];
};

function createFakeEvent(event, el) {
    // @ts-ignore
    let fakeEvent = document.createEventObject
    // @ts-ignore
        ? document.createEventObject()
        : document.createEvent("Event");
    if (fakeEvent.initEvent) {
        fakeEvent.initEvent("keyup", true, true);
    }
    // attempt to add as many properties from the original event to our new fakeEvent
    // avoid using has own property, it won't get most of the properties
    for (let prop in event) {
        try {
            fakeEvent[prop] = event[prop];
        } catch (e) {
            // do nothing, we'll just skip them.
        }
    }

    el.dispatchEvent
        ? el.dispatchEvent(fakeEvent)
        : el.fireEvent("onkeyup", fakeEvent);
}

const DEFINE = o => (p, v) => Object.defineProperty(o, p, v);

// Begin HotStuff Class
const HotStuff = function (el) {
    if (!(this instanceof HotStuff)) {
        new HotStuff(el);
        return
    }
    this.init(el);
};

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

        // internal variables for generic key listeners (ones that listen to all keys)
        this._genericKeyListeners = [];

        el.addEventListener("keydown", this.handleKeyDown.bind(this));
        el.addEventListener("keyup", this.handleKeyUp.bind(this));

        // when the window loses or gains focus, trigger all key up events that haven't been triggered
        (function (arr, func) {
            arr.forEach(x => window.addEventListener(x, func));
        })(['blur', 'focus'], () => {
            this._unresolvedKeyUps.forEach(listenerGroup => {
                createFakeEvent(
                    listenerGroup._events[listenerGroup._events.length - 1],
                    this.el
                );
                listenerGroup._events.splice();
            });

            // triggering generic key listeners are slightly more complex
            // loop through all the keys, checking if the trigger is set to true,
            // then creates the fake event for that letter
            this._genericKeyListeners.forEach(listenerGroup => {
                let keys = listenerGroup._keys;
                for (let property in keys) {
                    if (keys.hasOwnProperty(property) && keys[property].trigger) {
                        createFakeEvent(keys[property].event, this.el);
                        keys[property].trigger = false;
                    }
                }
            });
        });
    },
    addListener(keysArr, keydownHandler, keyupHandler) {
        // prepare our arguments
        if (typeof keysArr === "string") keysArr = [keysArr];
        if (keysArr === null) keysArr = [];
        if (keysArr instanceof Function) {
            keyupHandler = keydownHandler;
            keydownHandler = keysArr;
            keysArr = []; // pass an empty array, we'll detect the length of this later to determine type of listener
        }

        if (!(keysArr instanceof Array)) throw new Error("Invalid Keys provided");

        if (keyupHandler == null && keydownHandler == null)
            throw new Error("No handlers provided");

        // provide generic functions if none are provided
        if (keydownHandler == null) keydownHandler = _ => _;
        if (keyupHandler == null) keyupHandler = _ => _;

        const sharedStore = {};

        // if the array has no items in it, we treat it as though it's listening to all keys presses
        if (keysArr.length === 0) {
            let _events = [];
            let _keys = {};
            keydownHandler = keydownHandler.bind(this);
            keyupHandler = keyupHandler.bind(this);
            this._genericKeyListeners.push({
                keyDown: e => {
                    _events.push(e);
                    return keydownHandler(e, sharedStore, this._keysActive.slice());
                },
                keyUp: e => keyupHandler(e, sharedStore, this._keysActive.slice()),
                _keys: _keys,
                _events: _events
            });
            // technically unnecessary bail out as the following forEach won't work
            return;
        }

        // Hotkeys were provided, loop through them
        keysArr.forEach(keys => {
            // normalise our input
            keys = parseKeyCode(keys).map(normalizeHotKey).sort(HotKeySort);

            let keyActiveBuffer = [];
            let _events = [];

            keydownHandler = keydownHandler.bind(this);
            keyupHandler = keyupHandler.bind(this);

            addKeyListener(this, keys.join("+")).push({
                keyDown: e => {
                    // we need to cache a copy of the active keys at the time of the keyDown event
                    // as when keyUp is triggered the keysActive can be different. We can possibly fiddle with the
                    // handleKeyDown method to fix this, but one way or another, we should make a separate copy
                    // from the one that's sent to keydownHandler as we want to make sure its untampered with.
                    _events.push(e);
                    keyActiveBuffer = this._keysActive.slice();
                    return keydownHandler(e, sharedStore, this._keysActive.slice());
                },
                keyUp: e => keyupHandler(e, sharedStore, keyActiveBuffer),
                _events: _events // posibbly only need to set this to an item instead of an array
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
            this._keyListeners[keyStr].forEach(listenerGroup => {
                if (listenerGroup.keyDown(e) !== false) {
                    // if keyDown returns false, don't add keyUp
                    if (!this._unresolvedKeyUps.includes(listenerGroup)) {
                        this._unresolvedKeyUps.push(listenerGroup);
                    }
                }
            });

        // generic key listeners are queried after specific key listeners ones
        this._genericKeyListeners.forEach(listenerGroup => {
            let keyObj = getKeyObject(listenerGroup, key);
            keyObj.trigger = listenerGroup.keyDown(e) !== false;
            keyObj.event = e;
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

        this._unresolvedKeyUps.forEach(listenerGroup => listenerGroup.keyUp(e));
        this._unresolvedKeyUps.splice(0); // clear array

        // run through our generic key ups
        this._genericKeyListeners.forEach(listenerGroup => {
            let keyObj = getKeyObject(listenerGroup, key);
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

export default HotStuff;
