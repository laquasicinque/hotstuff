
// Normalise and change certain keys
export const KEY_ALIAS_MAP = {
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
export const KEYCODE_ALIAS_MAP = (function () {
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
