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
let currentDirection = "";
let listenForArgument = false;
const SELECTED_CELL_CLASSNAME="xwd__cell--selected";
const YELLOW = '#ffda00';
const GREEN = '#20f560';
const LIGHTGREEN = "#9effbc";

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


const clickReactComponent = (element) => {
    element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }))
};

const getAria = () => {
    const currentCellElement = document.getElementById('cell-id-0');
    return currentCellElement.getAttribute('aria-label')
}


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
    const targetCell = getCellOfHint(argumentBuffer)
    setLocation(targetCell, currentDirection)
    listenForArgument = false;
    setCursorColor(GREEN);

};

const jumpAcross = () => {
    if (!argumentBuffer.length) return;
    const targetCell = getCellOfHint(argumentBuffer)

    setLocation(targetCell, 'Across')
    listenForArgument = false;
    setCursorColor(GREEN);

};

const jumpDown = () => {
    if (!argumentBuffer.length) return;
    getCellOfHint(argumentBuffer)
    const targetCell = getCellOfHint(argumentBuffer)

    setLocation(targetCell, 'Down')

    listenForArgument = false;
    setCursorColor(GREEN);

};

const getCellOfHint = (number) => {
    const hintStarts = [...document.querySelectorAll('[text-anchor="start"]')];
    const target = hintStarts.find((hs) => hs.textContent === number)
    return target.parentElement.firstElementChild.id;
};

const deleteHighlightedCells = () => {
    const highlightedCells = [...document.getElementsByClassName("xwd__cell--highlighted")]//.filter(e => !e.classList.contains('xwd__cell--selected')
    deleteCells(highlightedCells)

    /**
    // clicking the selected box gets buggy. If it's already selected, no need
    if (!highlightedCells[0].classList.contains('xwd__cell--selected')) {
        clickReactComponent(highlightedCells[0].parentElement)
    }
    simulateKeyPress('Delete')

    for (let i = 0; i < highlightedCells.length - 1; i++) {
        //clickReactComponent(cell.parentElement)
        simulateKeyPress(currentDirection === "Across" ? "ArrowRight" : "ArrowDown")
        simulateKeyPress('Delete')
    }
    */
};

const deleteCells = (cells) => {
    cells.forEach(cell => {
        setTimeout(() => {
            setLocation(cell.id, currentDirection)
            simulateKeyPress('Delete')})
    })
}

const changeWord = () => {
    deleteHighlightedCells();
    setTimeout(() => setLocation(currentCellId, currentDirection), 200);
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

const setLocation = (cellId, direction = "") => {
    console.log("navigating to cell ", cellId, "current cell", currentCellId)
    clickReactComponent(document.getElementById(cellId).parentElement);

    if (direction !== currentDirection) {
        toggleDirection();
    }
};

const toggleDirection = () => {
    simulateKeyPress(" ");
    currentDirection = currentDirection === "Down" ? "Across" : "Down";
    console.log("toggled direction to", currentDirection)
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
    'ciw': () => changeWord(),
    'x': ()=> simulateKeyPress('Delete'),
    'r': ()=> {simulateKeyPress('Delete'); activateInsertMode();},
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
            //console.log('current Aria', getAria())
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