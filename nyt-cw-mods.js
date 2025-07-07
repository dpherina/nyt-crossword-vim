// ==UserScript==
// @name         NYT Crossword Mods
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Modifications to NYT Crossword controls
// @author       dpherina
// @match        https://www.nytimes.com/crosswords/game/*
// @icon
// @grant        none
// @run-at       document-start
// ==/UserScript==

/** todo

- figure out which direction is selected to compensate for jump direction switch offset
- figure out how to override ESC and enter
- e/b functionality

*/


let isNavMode = true;
let commandBuffer = "";
let argumentBuffer = "";
let listenForArgument = false;
const SELECTED_CELL_CLASSNAME="xwd__cell--selected";
const YELLOW = '#ffda00';
const GREEN = '#20f560';


const clickReactComponent = (element) => {
    const keys = Object.keys(element);
    const reactPropsKeyString = keys.find((k) => k.includes('__reactProps'))
    element[reactPropsKeyString].onClick();
}

const clearCommandBuffer = () => {
    console.log("clearing command buffer")
    commandBuffer = "";
}

const clearArgumentBuffer = () => {
    console.log('clearing argument buffer');
    argumentBuffer = "";
};




const setCustomSheet = (css) => {
    deleteCustomSheet();
    const mySheet = document.createElement('style', {is: "customStyleSheet"});
    mySheet.type = 'text/css';
    mySheet.title = 'customSheet';
    mySheet.appendChild(document.createTextNode(css));
    (document.head || document.getElementsByTagName('head')[0]).appendChild(mySheet);

}

const deleteCustomSheet = () => {
    const styleSheets = Array.from(document.styleSheets);
    const customSheet = styleSheets.find(sheet => sheet.title === 'customSheet');
    if (customSheet) customSheet.ownerNode.remove()
}

const setCursorColor = (color) => {
    setCustomSheet(`.${SELECTED_CELL_CLASSNAME} {fill:${color} !important;}`);
}

const activateInsertMode = () => {
    isNavMode = false;
    setCursorColor(YELLOW);
    console.log("normal mode off")
}


const simulateKeyPress = (keycode, options) => {
    const crosswordWrapper = document.getElementsByClassName("xwd__franklin")[0];
    crosswordWrapper.dispatchEvent(new KeyboardEvent('keydown', {'key': keycode, 'bubbles':true, ...options}))
};

const jumpInit = () => {
    if (argumentBuffer.length === 0) {
        console.log("listening for argument...");
        listenForArgument = true;
        return;
    }
    jumpToHint(argumentBuffer)
    listenForArgument = false;
}

const jumpAcross = () => {
    if (!argumentBuffer.length) return;
    jumpToHint(argumentBuffer)
    simulateKeyPress('ArrowRight')
    listenForArgument = false;
}

const jumpDown = () => {
    if (!argumentBuffer.length) return;
    jumpToHint(argumentBuffer)
    simulateKeyPress('ArrowDown')
    listenForArgument = false;
}

const jumpToHint = (number) => {
    const hintStarts = [...document.querySelectorAll('[text-anchor="start"]')];
    const target = hintStarts.find((hs) => hs.textContent === number)
    clickReactComponent(target.parentElement);
}

const deleteHighlightedCells = () => {
    const highlightedCells = [...document.getElementsByClassName("xwd__cell--highlighted")]
    highlightedCells.forEach((cell) => {
        clickReactComponent(cell.parentElement);
        simulateKeyPress('Backspace');
    })
}

const clearWord = () => {
    deleteHighlightedCells();
    console.log("clear word tbd");
}


const deleteWord = () => {
    deleteHighlightedCells();
    console.log("delete word tbd");

}


const commandMap = {
    'i': activateInsertMode,
    'j': () => simulateKeyPress('ArrowDown'),
    'k': () => simulateKeyPress('ArrowUp'),
    'l': () => simulateKeyPress('ArrowRight'),
    'h': () => simulateKeyPress('ArrowLeft'),
    'w': () => simulateKeyPress('Tab'),
    'W': () => simulateKeyPress('Tab', {'shiftKey':true}),
    'g': () => jumpInit(),
    'a': () => jumpAcross(),
    'd': () => jumpDown(),
    'ciw': () => clearWord(),
    'diw': () => deleteWord(),
    'caw': () => clearWord(),
    'daw': () => deleteWord(),
    'x': ()=> simulateKeyPress('Backspace'),
    'r': ()=> {simulateKeyPress('Backspace'); activateInsertMode();},
};

const isKeyAlphanumberic = (key) => {
    return key.length === 1 && key.match(/^([a-z]|[A-Z]|[0-9])$/i);
}

const isKeyNumeric = (key) => {
    return key.length === 1 && key.match(/^([0-9])$/i);

}

setCursorColor(GREEN);

(function() {
    'use strict';

    document.onkeydown = function(event) {
        console.log("---");
        console.log("keypress: ", event.key)

        const crosswordWrapper = document.getElementsByClassName("xwd__franklin")[0];
        const simulateKeyPress = (keycode, options) => crosswordWrapper.dispatchEvent(new KeyboardEvent('keydown', {'key': keycode, 'bubbles':true, ...options}));


        if (event.key == 'Alt'){
            var pencil = document.getElementsByClassName("xwd__toolbar_icon--pencil")[0] ?? document.getElementsByClassName("xwd__toolbar_icon--pencil-active")[0];
            pencil.click();
        };


        if (isNavMode) {

            if (event.key == 'Meta') {
                clearCommandBuffer();
                clearArgumentBuffer();
                return;
            }
            event.preventDefault();

            if (!isKeyAlphanumberic(event.key)) return;

            if (listenForArgument && isKeyNumeric(event.key)) {
                argumentBuffer = argumentBuffer.concat(event.key);
                console.log("argument buffer: ", argumentBuffer);
                return;
            }

            commandBuffer = commandBuffer.concat(event.key);
            console.log("command buffer: ", commandBuffer);

            if (commandMap[commandBuffer]) {
                console.log('executing: ', commandBuffer);
                commandMap[commandBuffer]();
                clearCommandBuffer();
                clearArgumentBuffer();
                return;
            }
        }
        if (!isNavMode) {
            if (event.key == 'Meta') {
                isNavMode = true;
                setCursorColor(GREEN);
                console.log("normal mode on")
            }
        }
    };


})();