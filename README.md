# Hotstuff
Small Javascript Library to add hotkeys to an element with no dependencies

## Installation

```bash
npm install hotstuff
```

## Usage
The preferred method of pulling HotStuff into your project is using NPM and a CommonJS module system.
```javascript
const HotStuff = require('hotstuff');
```
You can then create a new HotStuff object using one of the methods below.
Note: HotStuff attaches events using addEventListener on both the keydown and keyup events so the object you pass to HotStuff must support those events. 
```javascript
const element = document.getElementById('elem');
const hotStuff = new HotStuff(element);

// You can also attach to the window 
const hotStuff = new HotStuff(window);
const hotStuff = new HotStuff(); // by default HotStuff attaches itself to the window object if there is one
```
From this point you can add hotkeys using the new `hotStuff` object using the `hotStuff.addListener` method. Both functions are optional (so if you want to just add a key up function, you can by passing null as the second argument)

```javascript
hotStuff.addListener(hotkey,keydownFunction, keyupFunction);
// example
hotStuff.addListener('ctrl+a',function(e){
    e.preventDefault();
    console.log("Blocked ctrl+a")
}, function(){
    console.log("Released")
});
```
As well as the original KeyboardEvent object, each function is also passed a persistant shared store (a basic object). This is shared between each pair of functions and persists between triggers. This allows data to be passed between functions without polluting other scopes. There's also a third argument that passes in the keys that were pressed

```javascript
    hotStuff.addListener('enter',(e,store)=>{
      e.preventDefault();
      store.triggered = store.triggered ? store.triggered : performance.now();
    },(e,store)=>{
      store.count = (store.count|0)+1;
      console.log("KeyPress Length: " + (performance.now()-store.triggered));
      console.log("KeyPress Count: " + store.count);
      delete store.triggered;
    });
```
You can attach multiple key bindings to the same functions (and stores) by passing an array of key presses as the first argument of addListener.

```javascript
hotStuff.addListener(['f5','ctrl+r','ctrl+shift+r'],function(e,store){
    e.preventDefault();
    store.count = (store.count|0) + 1;
},function(e,store){
    console.log(`Blocked page refresh shortcut ${store.count} times.`)
});
```

There may be times where you don't want your keyup function to trigger, whilst this is possible with the store, you can also achieve this by making your keydown function return false.
```javascript
// sidenote: the arrow keys can either be referred to by using
// arrow<direction> or just <direction>
hotStuff.addListener(['up','left','arrowdown','arrowright'],function(e){
    e.preventDefault();
    return false;
},function(){
    // this will never be called
    for(let i = 0; i<1000; i++){
        alert("Really obnoxious alert.")
    }
});
```


