// ==UserScript==
// @name         NYT Crossword Mods
// @namespace    http://tampermonkey.net/
// @version      1.1
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
- indicator for insert vs normal mode
- e/b functionality

*/


let isNavMode = true;
let isListenMode = false;
let listenerBuffer = "";
const SELECTED_CELL_CLASSNAME="xwd__cell--selected";
const YELLOW = '#ffda00';
const GREEN = '#20f560';


const clickReactComponent = (element) => {
    console.log('clicking tile')
    const keys = Object.keys(element);
    const reactPropsKeyString = keys.find((k) => k.includes('__reactProps'))
    element[reactPropsKeyString].onClick();
}

const clearListener = () => {
    console.log("clearing listener")
    isListenMode = false;
    listenerBuffer = "";
}

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


setCursorColor(GREEN);


(function() {
    'use strict';


    document.onkeydown = function(event) {
        console.log(event.key)
        console.log('buffer', listenerBuffer)
        console.log('isListenMode', isListenMode)

        const crosswordWrapper = document.getElementsByClassName("xwd__franklin")[0];
        const simulateKeyPress = (keycode, options) => crosswordWrapper.dispatchEvent(new KeyboardEvent('keydown', {'key': keycode, 'bubbles':true, ...options}));

        const hintStarts = [...document.querySelectorAll('[text-anchor="start"]')];

        //[...document.querySelectorAll('[text-anchor="start"]')][1].parentElement.__reactProps$w8nwkxia2r.onClick();

        if (event.key == 'Alt'){
            var pencil = document.getElementsByClassName("xwd__toolbar_icon--pencil")[0] ?? document.getElementsByClassName("xwd__toolbar_icon--pencil-active")[0];
            pencil.click();
        };
        if (isNavMode) {
            if (isListenMode && '0123456789'.includes(event.key)) {
                listenerBuffer = listenerBuffer.concat(event.key);
            }

            if (event.key == 'i') {
                isNavMode = false;
                setCursorColor(YELLOW);
                console.log("normal mode off")
            }
            if (event.key === 'j') {
                console.log('j pressed');
                simulateKeyPress('ArrowDown');
            }
            if (event.key === 'k') {
                simulateKeyPress('ArrowUp');
            }
            if (event.key === 'l') {
                simulateKeyPress('ArrowRight');
            }
            if (event.key === 'h') {
                simulateKeyPress('ArrowLeft');
            }
            if (event.key === 'w') {
                simulateKeyPress('Tab');
            }
            if (event.key === 'W') {
                simulateKeyPress('Tab', {'shiftKey':true});
            }
            if (event.key === 'g') {
                if (listenerBuffer.length === 0) {
                    console.log("nothing in buffer, entering listen mode");
                    isListenMode = true;
                    return;
                }
                console.log("buffer has value ", listenerBuffer);
                console.log('attempting jump');
                const target = hintStarts.find((hs) => hs.textContent === listenerBuffer)
                clickReactComponent(target.parentElement);
                clearListener();

            }
            if (event.key === 'a' && listenerBuffer.length > 0) {
                console.log('attempting jump');

                const target = hintStarts.find((hs) => hs.textContent === listenerBuffer)
                clickReactComponent(target.parentElement);
                simulateKeyPress('ArrowRight');

                clearListener();
            }

            if (event.key === 'd' && listenerBuffer.length > 0) {
                console.log('attempting jump');

                const target = hintStarts.find((hs) => hs.textContent === listenerBuffer)
                clickReactComponent(target.parentElement);
                simulateKeyPress('ArrowDown');

                clearListener();
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

    document.addEventListener("keypress", function (evt) {
        if (evt.which < 48 || evt.which > 57)
        {
            if (isNavMode) {
                evt.preventDefault();
            } else {
                return true;
            }
        }
    });

})();