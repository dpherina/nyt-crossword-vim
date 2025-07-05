# nyt-crossword-vim
Tampermonkey script to add vim mode to the New York Times Crossword web interface

Currently implemented:
`i` - insert mode
`Meta` - normal mode

`hjkl` - arrow functionality
`w` - next work
`W` - previous word

`g{number}a` go to clue {number} across
`g{number}d` go to clue {number} down
`g{number}g` go to clue {number}, no direction change
(`g#a` and `g#d` are alittle buggy, they sometimes take you to letter 2 in a word if the direction didn't change)

Future plans:
Color indicator for modes
`b`,`e` functionality
Alternate keys like `ctrl+[` for normal mode
`ESC` (tough becuase NYT already maps this to rebus)
`ciw`/`diw`
`/` to search through clues
