// ==UserScript==
// @name         NYT Crossword Mods
// @namespace    http://tampermonkey.net/
// @version      1.3
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
let currentCellId = "";
let currentDirection = "";
let startingCellId = "";
const SELECTED_CELL_CLASSNAME = "xwd__cell--selected";
const YELLOW = '#ffda00';
const GREEN = '#50f000';
const LIGHTGREEN = "#9effbc";

const clearCommandBuffer = () => {
    console.log("clearing command buffer")
    commandBuffer = "";
};

const setCustomSheet = (css) => {
    deleteCustomSheet();
    const mySheet = document.createElement('style', {
        is: "customStyleSheet"
    });
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
    element.dispatchEvent(new Event('click', {
        bubbles: true,
        cancelable: true
    }))
};

const simulateKeyPress = (keycode, options) => {
    const crosswordWrapper = document.getElementsByClassName("xwd__franklin")[0];
    crosswordWrapper.dispatchEvent(new KeyboardEvent('keydown', {
        'key': keycode,
        'bubbles': true,
        ...options
    }))
};

const getCellOfHint = (number) => {
    const hintStarts = [...document.querySelectorAll('[text-anchor="start"]')];
    const target = hintStarts.find((hs) => hs.textContent === number)
    return target.parentElement.firstElementChild.id;
};

const getHighlightedCells = () => [...document.getElementsByClassName("xwd__cell--highlighted")];

const deleteHighlightedCells = () => {
    deleteCells(getHighlightedCells())
};

const deleteCells = (cells) => {
    cells.forEach(cell => {
        setTimeout(() => {
            // I think this was happening too fast for react to catch up. Adding a microtask helped
            setLocation(cell.id, currentDirection)
            simulateKeyPress('Delete')
        })
    })
}

const changeWord = () => {
    deleteHighlightedCells();
    setTimeout(() => {
        activateInsertMode();
        simulateKeyPress('Home');
    })

};

const deleteWord = () => {
    deleteHighlightedCells();
    // clicks and keypresses don't seem to sync nicely, so it helps to put a slight delay on the click
    setTimeout(() => setLocation(startingCellId, currentDirection));
}

const isKeyAlphanumberic = (key) => {
    return key.length === 1 && key.match(/^([a-z]|[A-Z]|[0-9])$/i);
};

const isKeyNumeric = (key) => {
    return key.length === 1 && key.match(/^([0-9])$/i);
};


const initState = () => {
    const currentCellElement = document.getElementsByClassName('xwd__cell--selected')[0];
    currentCellId = currentCellElement.id;
    startingCellId = currentCellId
    currentDirection = currentCellElement.getAttribute('aria-label').match(/^\d+(A|D):.+$/)[1] === 'D' ? 'Down' : 'Across';
    console.log('Current Cell: ', currentCellId);
    console.log('Direction: ', currentDirection);
};


const setLocation = (cellId, direction = "") => {
    console.log("navigating to cell ", cellId, "current cell", currentCellId)
    if (cellId !== currentCellId) {
        clickReactComponent(document.getElementById(cellId).parentElement);
        currentCellId = cellId;
    }

    if (direction !== "" && direction !== currentDirection) {
        toggleDirection();
    }
};

const toggleDirection = () => {
    simulateKeyPress(" ");
    currentDirection = currentDirection === "Down" ? "Across" : "Down";
    console.log("toggled direction to", currentDirection)
}


const goCommand = (matches) => {
    const [_, number, directionCode] = matches;
    const targetCell = getCellOfHint(number)

    let direction = currentDirection;
    switch (directionCode) {
        case 'a':
            direction = 'Across';
            break;
        case 'd':
            direction = 'Down';
            break;
    }

    setLocation(targetCell, direction);
}

const deleteCommand = (matches) => {
    const [_, commandCode] = matches;

    if (commandCode === 'c' || commandCode === 'cc') {
        changeWord()
    }
    if (commandCode === 'd' || commandCode === 'dd') {
        deleteWord()
    }

}

const appendCommand = () => {
    const hightlightedCells = getHighlightedCells();
    const blanks = hightlightedCells.filter((cell) => cell.parentElement.lastChild.textContent === "");
    setLocation(blanks[0].id)
    activateInsertMode();
}

const regexCommandMap = {
    '^i$': (_) => activateInsertMode(),
    '^j$': (_) => simulateKeyPress('ArrowDown'),
    '^k$': (_) => simulateKeyPress('ArrowUp'),
    '^l$': (_) => simulateKeyPress('ArrowRight'),
    '^h$': (_) => simulateKeyPress('ArrowLeft'),
    '^w$': (_) => simulateKeyPress('Tab'),
    '^W$': (_) => simulateKeyPress('Tab', {
        'shiftKey': true
    }),
    '^x$': (_) => simulateKeyPress('Delete'),
    '^r$': (_) => {
        simulateKeyPress('Delete');
        activateInsertMode();
    },
    '^A$': (_) => appendCommand(),
    '^g([0-9]+)([adg])$': (matches) => goCommand(matches),
    '^(cc|dd)$': (matches) => deleteCommand(matches),
    '^([cd])[ia]w$': (matches) => deleteCommand(matches),
    // these two don't actually work like this in vim. they need to also tab
    '^e$': (_) => simulateKeyPress('End'),
    '^b$': (_) => simulateKeyPress('Home'),
}

const partialCommands = ['^g[0-9]*$', '^[cd][ia]?$'];

const processNormalMode = (event) => {
    if (event.key === 'Meta' || (event.key === '[' && event.ctrlKey) || event.key === '`') {
        clearCommandBuffer();
        setCursorColor(GREEN);
        return;
    }

    // allows us to refresh the page
    if (!(event.metaKey)) {
        event.preventDefault();
    }

    if (!isKeyAlphanumberic(event.key)) return;

    commandBuffer = commandBuffer.concat(event.key);
    console.log("command buffer: ", commandBuffer);

    let matchesCommand = false;
    Object.entries(regexCommandMap).forEach(([pattern, command]) => {
        const matches = commandBuffer.match(pattern);
        if (matches) {
            console.log('executing: ', commandBuffer);
            setCursorColor(GREEN);
            command(matches)
            clearCommandBuffer();
            matchesCommand = true;
            return;
        }
    })

    if (matchesCommand) return;

    let matchesPartial = false;
    partialCommands.forEach((pattern) => {
        console.log(commandBuffer, pattern);
        const matches = commandBuffer.match(pattern);
        if (matches) {
            setCursorColor('LIGHTGREEN')
            matchesPartial = true;
        }
    })
    if (!matchesPartial) clearCommandBuffer();
};

setCursorColor(GREEN);

(function() {
    'use strict';

    document.onkeydown = function(event) {
        console.log("---");
        console.log("keypress: ", event.key, event.ctrlKey)
        initState();
        if (event.key === '`') {
            event.preventDefault();
        }

        if (event.key === 'Alt') {
            var pencil = document.getElementsByClassName("xwd__toolbar_icon--pencil")[0] ?? document.getElementsByClassName("xwd__toolbar_icon--pencil-active")[0];
            pencil.click();
        };

        if (isNavMode) {

            processNormalMode(event);
        }

        if (!isNavMode) {
            if (event.key === 'Meta' || (event.key === '[' && event.ctrlKey) || event.key === '`') {
                isNavMode = true;
                setCursorColor(GREEN);
                console.log("normal mode on")
            }
        }
    };
})();