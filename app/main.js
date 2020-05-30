const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  Menu,
  ipcMain,
} = require("electron");

const fs = require("fs");
const path = require("path");
const fileUtils = require("./file-utils");
const appMenu = require("./app-menu");

// Setup ///////////////////////////////////

let g_mainWindow;
let g_resizeEventCounter;

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  fileUtils.cleanUpTempFolder();
});

app.on("ready", () => {
  g_mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 250,
    minHeight: 200,
    resizable: true,
    frame: false,
    icon: path.join(__dirname, "assets/images/icon_256x256.png"),
    //autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
    },
    show: false,
  });

  appMenu.AddApplicationMenu();
  //mainWindow.removeMenu();
  //g_mainWindow.maximize();
  g_mainWindow.loadFile(`${__dirname}/index.html`);

  g_mainWindow.once("ready-to-show", () => {
    g_mainWindow.show();
  });

  g_mainWindow.webContents.on("did-finish-load", function () {
    // if I put the things below inside ready-to-show they aren't called
    renderTitle();
    renderPageInfo();
    //openTestCbz();
  });

  g_mainWindow.on("resize", function () {
    renderTitle();
    if (
      g_fileData.type === FileDataType.PDF &&
      g_fileData.state === FileDataState.LOADED
    ) {
      // avoid too much pdf resizing
      clearTimeout(g_resizeEventCounter);
      g_resizeEventCounter = setTimeout(onResizeEventFinished, 500);
    }
  });
});

function onResizeEventFinished() {
  g_mainWindow.webContents.send("refresh-pdf-page");
}

// Security
// ref: https://www.electronjs.org/docs/tutorial/security

app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    event.preventDefault();
  });
});

app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", async (event, navigationUrl) => {
    event.preventDefault();

    //const URL = require('url').URL
    // const parsedUrl = new URL(navigationUrl)
    // if (parsedUrl.origin !== 'https://example.com') {
    //   event.preventDefault()
    // }
  });
});

// Files ///////////////////////////////////////

const FileDataState = {
  NOT_SET: "not set",
  LOADING: "loading",
  LOADED: "loaded",
};

const FileDataType = {
  NOT_SET: "not set",
  PDF: "pdf",
  IMGS: "imgs",
  ZIP: "zip",
  RAR: "rar",
};

let g_fileData = {
  state: FileDataState.NOT_SET,
  type: FileDataType.NOT_SET,
  filePath: "",
  fileName: "",
  imgsFolderPath: "",
  pagesPaths: [],
  numPages: 0,
  currentPageIndex: 0,
};

function openFile() {
  let filePath = fileUtils.chooseFile(g_mainWindow)[0];
  //`${currentPageIndex + 1}/${currentPages.length}`;
  console.log("open file request:" + filePath);

  let fileExtension = path.extname(filePath);
  if (fileExtension === ".pdf") {
    g_fileData.state = FileDataState.LOADING;
    g_fileData.type = FileDataType.PDF;
    g_fileData.filePath = filePath;
    g_fileData.fileName = path.basename(filePath);
    g_fileData.imgsFolderPath = "";
    g_fileData.pagesPaths = [];
    g_fileData.numPages = 0;
    g_fileData.currentPageIndex = 0;
    g_mainWindow.webContents.send("load-pdf", filePath);
    renderTitle();
  } else {
    let imgsFolderPath = undefined;
    if (fileExtension === ".cbr") {
      //imgsFolderPath = fileUtils.extractRar(filePath);
      let pagesPaths = fileUtils.getRarEntriesList(filePath);
      if (pagesPaths !== undefined && pagesPaths.length > 0) {
        g_fileData.state = FileDataState.LOADED;
        g_fileData.type = FileDataType.RAR;
        g_fileData.filePath = filePath;
        g_fileData.fileName = path.basename(filePath);
        g_fileData.pagesPaths = pagesPaths;
        g_fileData.imgsFolderPath = "";
        g_fileData.numPages = pagesPaths.length;
        g_fileData.currentPageIndex = 0;
        goToFirstPage();
      }
    } else if (fileExtension === ".cbz") {
      //imgsFolderPath = fileUtils.extractZip(filePath);
      let pagesPaths = fileUtils.getZipEntriesList(filePath);
      if (pagesPaths !== undefined && pagesPaths.length > 0) {
        g_fileData.state = FileDataState.LOADED;
        g_fileData.type = FileDataType.ZIP;
        g_fileData.filePath = filePath;
        g_fileData.fileName = path.basename(filePath);
        g_fileData.pagesPaths = pagesPaths;
        g_fileData.imgsFolderPath = "";
        g_fileData.numPages = pagesPaths.length;
        g_fileData.currentPageIndex = 0;
        goToFirstPage();
      }
      return;
    } else {
      console.log("not a valid file");
      return;
    }
    if (imgsFolderPath === undefined) return;

    let pagesPaths = fileUtils.getImageFilesInFolderRecursive(imgsFolderPath);
    if (pagesPaths !== undefined && pagesPaths.length > 0) {
      g_fileData.state = FileDataState.LOADED;
      g_fileData.type = FileDataType.IMGS;
      g_fileData.filePath = filePath;
      g_fileData.fileName = path.basename(filePath);
      g_fileData.pagesPaths = pagesPaths;
      g_fileData.imgsFolderPath = imgsFolderPath;
      g_fileData.numPages = pagesPaths.length;
      g_fileData.currentPageIndex = 0;
      goToFirstPage();
    }
  }
}
exports.openFile = openFile;

// Renderer /////////////////////////////////////////

function renderTitle() {
  let title = generateTitle();
  g_mainWindow.setTitle(title);
  g_mainWindow.webContents.send("update-title", title);
}

function renderPageInfo(pageNum, numPages) {
  g_mainWindow.webContents.send(
    "render-page-info",
    g_fileData.currentPageIndex,
    g_fileData.numPages
  );
}

function getMimeType(filePath) {
  let mimeType = path.basename(filePath);
  return mimeType;
}

function renderImageFile(filePath) {
  if (!path.isAbsolute(filePath)) {
    // FIXME: mae it absolute somehow?
    return;
  }
  renderTitle();
  let data64 = fs.readFileSync(filePath).toString("base64");
  let img64 = "data:image/" + getMimeType(filePath) + ";base64," + data64;
  g_mainWindow.webContents.send("render-img", img64);
}

function renderZipEntry(zipPath, entryName) {
  renderTitle();
  let data64 = fileUtils
    .extractZipEntryData(zipPath, entryName)
    .toString("base64");
  let mimeType = "jpeg";
  let img64 = "data:image/" + getMimeType(entryName) + ";base64," + data64;
  g_mainWindow.webContents.send("render-img", img64);
}

function renderRarEntry(rarPath, entryName) {
  renderTitle();
  let data64 = fileUtils
    .extractRarEntryData(rarPath, entryName)
    .toString("base64");
  //console.log("data: " + data64);
  let mimeType = "jpeg";
  let img64 = "data:image/" + getMimeType(entryName) + ";base64," + data64;
  g_mainWindow.webContents.send("render-img", img64);
}

function renderPdfPage(pageNum) {
  renderTitle();
  g_mainWindow.webContents.send("render-pdf-page", pageNum + 1); // pdf.j counts from 1
}

/////////////////////////////////////////////////

function generateTitle() {
  let title = "---";
  if (g_fileData.state === FileDataState.NOT_SET) {
    title = "Comic Book Reader - ACBR";
  } else if (g_mainWindow.getSize()[0] <= 800) {
    title = "ACBR";
  } else {
    title = `${g_fileData.fileName}`;
    var length = 50;
    title =
      title.length > length
        ? title.substring(0, length - 3) + "..."
        : title.substring(0, length);
    title += " - ACBR";
  }
  return title;
}

function setFullScreen(value) {
  g_mainWindow.setFullScreen(value);
  g_mainWindow.webContents.send("show-menu-bar", !value);
}

function toggleFullScreen() {
  setFullScreen(!g_mainWindow.isFullScreen());
}
exports.toggleFullScreen = toggleFullScreen;

let isScrollBarVisible = true;
function toggleScrollBar() {
  isScrollBarVisible = !isScrollBarVisible;
  g_mainWindow.webContents.send("set-scrollbar", isScrollBarVisible);
}
exports.toggleScrollBar = toggleScrollBar;

function toggleDevTools() {
  g_mainWindow.toggleDevTools();
}
exports.toggleDevTools = toggleDevTools;

function setFitToWidth() {}
exports.setFitToWidth = setFitToWidth;

function setFitToHeight() {}
exports.setFitToHeight = setFitToHeight;

function setSinglePage() {}
exports.setSinglePage = setSinglePage;

function setDoublePage() {}
exports.setDoublePage = setDoublePage;

// NAVIGATION //////////////////////////////

function goToPage(pageNum) {
  if (
    g_fileData.state !== FileDataState.LOADED ||
    g_fileData.type === FileDataType.NOT_SET
  ) {
    return;
  }
  if (pageNum < 0 || pageNum >= g_fileData.numPages) return;
  g_fileData.currentPageIndex = pageNum;
  if (g_fileData.type === FileDataType.IMGS) {
    renderImageFile(g_fileData.pagesPaths[g_fileData.currentPageIndex]);
  } else if (g_fileData.type === FileDataType.PDF) {
    renderPdfPage(g_fileData.currentPageIndex);
  } else if (g_fileData.type === FileDataType.ZIP) {
    renderZipEntry(
      g_fileData.filePath,
      g_fileData.pagesPaths[g_fileData.currentPageIndex]
    );
  } else if (g_fileData.type === FileDataType.RAR) {
    renderRarEntry(
      g_fileData.filePath,
      g_fileData.pagesPaths[g_fileData.currentPageIndex]
    );
  }
  renderPageInfo();
}

function goToFirstPage() {
  goToPage(0);
}

function goToNextPage() {
  if (g_fileData.currentPageIndex + 1 < g_fileData.numPages) {
    g_fileData.currentPageIndex++;
    goToPage(g_fileData.currentPageIndex);
  }
}

function goToPreviousPage() {
  if (g_fileData.currentPageIndex - 1 >= 0) {
    g_fileData.currentPageIndex--;
    goToPage(g_fileData.currentPageIndex);
  }
}

// IPC RECEIVED /////////////////////////////

ipcMain.on("pdf-loaded", (event, loadedCorrectly, filePath, numPages) => {
  g_fileData.state = FileDataState.LOADED;
  // TODO double check loaded on is the one loading?
  g_fileData.numPages = numPages;
  renderPageInfo();
});

ipcMain.on("escape-pressed", (event) => {
  if (g_mainWindow.isFullScreen()) {
    setFullScreen(false);
  }
});

ipcMain.on("mouse-click", (event, arg) => {
  if (arg === true) {
    // left click
    goToNextPage();
  } else {
    // right click
    goToPreviousPage();
  }
});

ipcMain.on("toolbar-button-clicked", (event, name) => {
  switch (name) {
    case "toolbar-button-next":
      goToNextPage();
      break;
    case "toolbar-button-prev":
      goToPreviousPage();
      break;
  }
});

ipcMain.on("toolbar-slider-changed", (event, value) => {
  value -= 1; // from 1 based to 0 based
  if (g_fileData.state === FileDataState.LOADED) {
    if (value !== g_fileData.currentPageIndex) {
      goToPage(value);
      return;
    }
  }
  renderPageInfo();
});

// function updateMenu() {
//   mainWindow.webContents.send("update-menu", appMenu.getMenu());
// }
// exports.updateMenu = updateMenu;

// let shortcut = "PageDown";
// const ret = globalShortcut.register(shortcut, () => {
//   console.log("page down");
// });

// if (!ret) {
//   console.log("error adding global shortcut");
// } else {
//   console.log("global shortcut added: " + shortcut);
// }
