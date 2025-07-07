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
let currentCellId = "";
let currentDirection = "Across";
let listenForArgument = false;
const SELECTED_CELL_CLASSNAME="xwd__cell--selected";
const YELLOW = '#ffda00';
const GREEN = '#20f560';
const LIGHTGREEN = "#9effbc";


const clickReactComponent = (element) => {
    const keys = Object.keys(element);
    const reactPropsKeyString = keys.find((k) => k.includes('__reactProps'))
    element[reactPropsKeyString].onClick();
};

const clearCommandBuffer = () => {
    console.log("clearing command buffer")
    commandBuffer = "";
};

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

};

const deleteCustomSheet = () => {
    const styleSheets = Array.from(document.styleSheets);
    const customSheet = styleSheets.find(sheet => sheet.title === 'customSheet');
    if (customSheet) customSheet.ownerNode.remove()
};

const setCursorColor = (color) => {
    setCustomSheet(`.${SELECTED_CELL_CLASSNAME} {fill:${color} !important;}`);
};

const activateInsertMode = () => {
    isNavMode = false;
    setCursorColor(YELLOW);
    console.log("normal mode off")
};


const simulateKeyPress = (keycode, options) => {
    const crosswordWrapper = document.getElementsByClassName("xwd__franklin")[0];
    crosswordWrapper.dispatchEvent(new KeyboardEvent('keydown', {'key': keycode, 'bubbles':true, ...options}))
};

const jumpInit = () => {
    if (argumentBuffer.length === 0) {
        console.log("listening for argument...");
        listenForArgument = true;
        setCursorColor(LIGHTGREEN);
        return;
    }
    jumpToHint(argumentBuffer)
    listenForArgument = false;
    setCursorColor(GREEN);

};

const jumpAcross = () => {
    if (!argumentBuffer.length) return;
    jumpToHint(argumentBuffer)
    if (currentDirection !== 'Across') {
        simulateKeyPress('ArrowRight')
    }
    listenForArgument = false;
    setCursorColor(GREEN);

};

const jumpDown = () => {
    if (!argumentBuffer.length) return;
    jumpToHint(argumentBuffer)
    if (currentDirection !== 'Down') {
        simulateKeyPress('ArrowDown')
    }
    listenForArgument = false;
    setCursorColor(GREEN);

};

const jumpToHint = (number) => {
    const hintStarts = [...document.querySelectorAll('[text-anchor="start"]')];
    const target = hintStarts.find((hs) => hs.textContent === number)
    clickReactComponent(target.parentElement);
};

const deleteHighlightedCells = () => {
    const highlightedCells = [...document.getElementsByClassName("xwd__cell--highlighted")]
    highlightedCells.forEach((cell) => {
        clickReactComponent(cell.parentElement);
        simulateKeyPress('Delete');
    })
};

const changeWord = () => {
    deleteHighlightedCells();
    setLocation(currentCellId, currentDirection);
    console.log("change word tbd");
};


const deleteWord = () => {
    deleteHighlightedCells();
    setLocation(currentCellId, currentDirection);
    console.log("delete word tbd");
};


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
    'ciw': () => changeWord(),
    'diw': () => deleteWord(),
    'caw': () => changeWord(),
    'daw': () => deleteWord(),
    'x': ()=> simulateKeyPress('Delete'),
    'r': ()=> {simulateKeyPress('Delete'); activateInsertMode();},
};

const isKeyAlphanumberic = (key) => {
    return key.length === 1 && key.match(/^([a-z]|[A-Z]|[0-9])$/i);
};

const isKeyNumeric = (key) => {
    return key.length === 1 && key.match(/^([0-9])$/i);

};


const updateStates = () => {
    const currentCellElement = document.getElementsByClassName('xwd__cell--selected')[0];
    currentCellId = currentCellElement.id;
    currentDirection = currentCellElement.getAttribute('aria-label').match(/^\d+(A|D):.+$/)[1] === 'D' ? 'Down' : 'Across';
    console.log('Current Cell: ', currentCellId);
    console.log('Direction: ', currentDirection);
};

const processNormalMode = (event) => {
    if (event.key == 'Meta') {
        clearCommandBuffer();
        clearArgumentBuffer();
        listenForArgument = false;
        setCursorColor(GREEN);
        return;
    }

    // allows us to refresh that page and stuff like that
    if (!(event.metaKey || event.ctrlKey)) {
        event.preventDefault();
    }

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
};

const setLocation = (cellId, direction) => {
    if (cellId !== currentCellId) {
     clickReactComponent(document.getElementById(cellId).parentElement);
    }

    if (direction === "Across") {
        if (currentDirection === "Across") return;
        simulateKeyPress(" ");
    }
    if (direction === "Down") {
        if (currentDirection === "Down") return;
        simulateKeyPress(" ");
    }
};



setCursorColor(GREEN);

(function() {
    'use strict';

    document.onkeydown = function(event) {
        console.log("---");
        console.log("keypress: ", event.key)
        updateStates();

        if (event.key == 'Alt'){
            var pencil = document.getElementsByClassName("xwd__toolbar_icon--pencil")[0] ?? document.getElementsByClassName("xwd__toolbar_icon--pencil-active")[0];
            pencil.click();
        };


        if (isNavMode) {
            /**
            if (event.key === 'a') {
            event.preventDefault();
            setLocation('cell-id-144', "Down");
            }*/

            processNormalMode(event);
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