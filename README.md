# ACBR - Comic Book Reader

A comic book reader and converter for cbz, cbr, epub and pdf files.

<p align="center">
  <img width="299" height="224" src="https://raw.githubusercontent.com/binarynonsense/comic-book-reader/master/screenshots/screenshot_01.jpg"> <img width="299" height="224" src="https://raw.githubusercontent.com/binarynonsense/comic-book-reader/master/screenshots/screenshot_02.jpg"> <img width="299" height="224" src="https://raw.githubusercontent.com/binarynonsense/comic-book-reader/master/screenshots/screenshot_03.jpg">
</p>

## Features:

- Windows & GNU/Linux versions.
- Compatible file formats:
  - .cbz
  - .cbr
  - .pdf
  - .epub (images only)
- Windowed (simple UI) and full-screen (no UI) modes.
- 'Fit to width' and 'fit to height' views.
- Page rotation.
- UI available in:
  - English
  - Spanish
- Automatically restores the previous session's last opened book and page, and remembers the last 10 books' page positions.
- Tools:
  - Convert/Resize files from cbr, cbz, pdf or epub to cbz, pdf or epub.
  - Export the current page to an image file.

## Controls:

- Toolbar :
  - buttons: 'open file', 'previous page', 'next page', 'fit to width', 'fit to height', 'rotate counterclockwise', 'rotate clockwise' and 'toggle fullscreen'.
  - slider: use it to quickly go to any page in the book.
- Keys:
  - 'right arrow' or 'page down' to go the next page.
  - 'left arrow' or 'page up' to go to the previous one.
  - 'up arrow' to scroll the page up, 'down arrow' to scroll the page down.
  - 'F11' to toggle full-screen mode.
  - 'Ctrl+O' to choose a file to open.
- Mouse:
  - 'scroll wheel' scrolls the page up and down.
  - 'left-click' opens the next page if the right side of the view area is clicked and the previous page if the left side is clicked.
  - 'right-click' opens a context menu with some basic navigation options.

## Downloads

- [Linux](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Linux.zip)
- [Windows](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Windows.zip)

## Build Notes

zipfile, an optional dependency of the 'epub' module was giving me errors when building the program so I had to remove 'epub' and reinstall it with 'npm install epub --no-optional' to use the pure javascript version.

## License

ACBR's code is released under the BSD 2-Clause [license](./LICENSE). To check the licenses of the node modules and other libraries used in the project check the [licenses](./licenses/) folder.
