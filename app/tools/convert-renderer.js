const fs = window.require("fs");
const path = require("path");
const os = require("os");
const { ipcRenderer } = require("electron");

let g_mode;
let g_inputFiles = [];
let g_inputFilesIndex = 0;

let g_inputFilesID = 0;

const FileDataType = {
  NOT_SET: "not set",
  PDF: "pdf",
  IMGS: "imgs",
  ZIP: "zip",
  RAR: "rar",
  EPUB: "epub",
};

let g_cancelConversion = false;

let g_inputFilePath;
let g_inputFileType;
let g_outputScale = "100";
let g_outputQuality = "80";
let g_outputFormat = "cbz";
let g_outputFolderPath;

let g_textInputFileDiv = document.querySelector("#text-input-file");
let g_textInputFilesDiv = document.querySelector("#text-input-files");
let g_inputListDiv = document.querySelector("#input-list");
let g_inputListButton = document.querySelector("#button-add-file");
let g_outputFolderDiv = document.querySelector("#output-folder");
let g_convertButton = document.querySelector("#button-convert");
let g_scaleSlider = document.querySelector("#scale-slider");
let g_qualitySlider = document.querySelector("#quality-slider");
let g_modalInfoArea = document.querySelector("#modal-info");
let g_modalLogArea = document.querySelector("#modal-log");
let g_modalButtonContainer = document.querySelector("#modal-button-container");
let g_modalButtonClose = document.querySelector("#button-modal-close");
let g_modalButtonCancel = document.querySelector("#button-modal-cancel");
let g_modalLoadingBar = document.querySelector("#modal-loading-bar");
let g_modalTitle = document.querySelector("#modal-title");

g_localizedRemoveFromListText = "";

g_scaleSlider.addEventListener("mouseup", (event) => {
  g_outputScale = event.currentTarget.value;
  checkValidData();
});
g_qualitySlider.addEventListener("mouseup", (event) => {
  g_outputQuality = event.currentTarget.value;
  checkValidData();
});

///////////////////////////////////////////////////////////////////////////////

function checkValidData() {
  if (g_outputScale === "100") {
    g_qualitySlider.parentElement.classList.add("hide");
  } else {
    g_qualitySlider.parentElement.classList.remove("hide");
  }

  if (g_mode === 0) {
    if (g_outputFolderPath !== undefined && g_inputFiles.length > 0) {
      if (g_inputFiles[0].type === FileDataType.ZIP) {
        if (!(g_outputFormat === "cbz" && g_outputScale === "100")) {
          g_convertButton.classList.remove("disabled");
          return;
        }
      } else if (g_inputFiles[0].type === FileDataType.PDF) {
        if (!(g_outputFormat === "pdf" && g_outputScale === "100")) {
          g_convertButton.classList.remove("disabled");
          return;
        }
      } else if (g_inputFiles[0].type === FileDataType.EPUB) {
        if (!(g_outputFormat === "epub" && g_outputScale === "100")) {
          g_convertButton.classList.remove("disabled");
          return;
        }
      } else if (g_inputFiles[0].type === FileDataType.RAR) {
        g_convertButton.classList.remove("disabled");
        return;
      }
    }
    g_convertButton.classList.add("disabled");
  } else {
    // mode 1 / batch
    if (g_outputFolderPath !== undefined && g_inputFiles.length > 0) {
      g_convertButton.classList.remove("disabled");
    } else {
      g_convertButton.classList.add("disabled");
    }
  }
}

function reducePathString(input) {
  var length = 60;
  input =
    input.length > length
      ? "..." + input.substring(input.length - length, input.length)
      : input;
  return input;
}

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("set-mode", (event, mode, outputFolderPath) => {
  g_mode = mode;
  g_outputFolderPath = outputFolderPath;
  g_outputFolderDiv.innerHTML = reducePathString(g_outputFolderPath);
  // 0
  if (g_mode === 0) {
    g_inputListButton.classList.add("hide");
    g_textInputFileDiv.classList.remove("hide");
    g_textInputFilesDiv.classList.add("hide");
  } else {
    // batch conversion
    g_inputListButton.classList.remove("hide");
    g_textInputFileDiv.classList.add("hide");
    g_textInputFilesDiv.classList.remove("hide");
  }
  checkValidData();
});

ipcRenderer.on(
  "update-localization",
  (event, title, localization, tooltipsLocalization) => {
    console.log("update-localization");
    document.title = title;
    for (let index = 0; index < localization.length; index++) {
      const element = localization[index];
      const domElement = document.querySelector("#" + element.id);
      if (domElement !== null) {
        domElement.innerHTML = element.text;
      }
    }

    for (let index = 0; index < tooltipsLocalization.length; index++) {
      console.log("index: " + index);
      const element = tooltipsLocalization[index];
      const domElement = document.querySelector("#" + element.id);
      if (domElement !== null) {
        domElement.title = element.text;
      }
      if (element.id === "tooltip-remove-from-list") {
        // not the most efficient way to do this
        g_localizedRemoveFromListText = element.text;
      }
    }
  }
);

ipcRenderer.on("add-file", (event, filePath, fileType) => {
  if (filePath === undefined || fileType === undefined) return;

  for (let index = 0; index < g_inputFiles.length; index++) {
    if (g_inputFiles[index].path === filePath) {
      return;
    }
  }
  let id = g_inputFilesID++; // not the best solution, but if it works...
  g_inputFiles.push({
    id: id,
    path: filePath,
    type: fileType,
  });

  g_inputListDiv.innerHTML +=
    "<li class='collection-item'><div>" +
    reducePathString(filePath) +
    (g_mode === 1
      ? "<a style='cursor: pointer;' onclick='renderer.onRemoveFile(this, " +
        id +
        ")' class='secondary-content'><i class='fas fa-window-close' title='" +
        g_localizedRemoveFromListText +
        "'></i></a>"
      : "") +
    "</div></li>";

  checkValidData();
});

function onRemoveFile(element, id) {
  element.parentElement.parentElement.parentElement.removeChild(
    element.parentElement.parentElement
  );
  let removeIndex;
  for (let index = 0; index < g_inputFiles.length; index++) {
    if (g_inputFiles[index].id === id) {
      removeIndex = index;
      break;
    }
  }
  if (removeIndex !== undefined) {
    g_inputFiles.splice(removeIndex, 1);
    checkValidData();
  }
}
exports.onRemoveFile = onRemoveFile;

ipcRenderer.on("change-output-folder", (event, folderPath) => {
  g_outputFolderPath = folderPath;
  g_outputFolderDiv.innerHTML = reducePathString(g_outputFolderPath);
  checkValidData();
});

///////////////////////////////////////////////////////////////////////////////

function onChooseInputFile() {
  ipcRenderer.send("convert-choose-file");
}
exports.onChooseInputFile = onChooseInputFile;

function onChooseOutputFolder() {
  ipcRenderer.send(
    "convert-choose-folder",
    g_inputFilePath,
    g_outputFolderPath
  );
}
exports.onChooseOutputFolder = onChooseOutputFolder;

function outputFormatChanged(selectObject) {
  g_outputFormat = selectObject.value;
  checkValidData();
}
exports.outputFormatChanged = outputFormatChanged;

function onConvert(resetCounter = true) {
  g_cancelConversion = false;
  g_modalButtonCancel.classList.remove("hide");
  g_modalButtonClose.classList.add("hide");
  {
    g_modalButtonClose.classList.add("green");
    g_modalButtonClose.classList.remove("red");
  }
  g_modalLoadingBar.classList.remove("hide");

  if (resetCounter) {
    g_inputFilesIndex = 0;
    g_numErrors = 0;
    updateTextLog("", false);
  }

  g_inputFilePath = g_inputFiles[g_inputFilesIndex].path;
  g_inputFileType = g_inputFiles[g_inputFilesIndex].type;

  ipcRenderer.send(
    "convert-start-conversion",
    g_inputFilePath,
    g_inputFileType,
    g_inputFilesIndex + 1,
    g_inputFiles.length
  );
}
exports.onConvert = onConvert;

function onCancelConversion() {
  console.log("onCancelConversion");
  if (g_cancelConversion === true) return; // already canceling?
  g_cancelConversion = true;
  g_modalButtonCancel.classList.add("hide");
  ipcRenderer.send("convert-cancel-conversion");
}
exports.onCancelConversion = onCancelConversion;

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("convert-update-text-title", (event, text) => {
  updateTextTitle(text);
});

function updateTextTitle(text) {
  g_modalTitle.innerHTML = text;
}

ipcRenderer.on("convert-update-text-log", (event, text) => {
  updateTextLog(text);
});

function updateTextLog(text, append = true) {
  if (append) {
    g_modalLogArea.innerHTML += "\n" + text;
  } else {
    g_modalLogArea.innerHTML = text;
  }
  g_modalLogArea.scrollTop = g_modalLogArea.scrollHeight;
}

ipcRenderer.on("convert-update-text-info", (event, text) => {
  g_modalInfoArea.innerHTML = text;
});

//////////////////////////

ipcRenderer.on("convert-extract-pdf-images", (event, tempFolder, logText) => {
  extractPDFImages(tempFolder, logText);
});

ipcRenderer.on("convert-images-extracted", (event) => {
  ipcRenderer.send(
    "convert-resize-images",
    g_inputFilePath,
    g_outputScale,
    g_outputQuality,
    g_outputFormat,
    g_outputFolderPath
  );
});

ipcRenderer.on("convert-finished-ok", (event) => {
  if (g_inputFilesIndex < g_inputFiles.length - 1) {
    g_inputFilesIndex++;
    onConvert(false);
  } else {
    ipcRenderer.send(
      "convert-end-conversion",
      false,
      g_inputFiles.length,
      g_numErrors,
      g_inputFilesIndex + 1
    );
  }
});

ipcRenderer.on("convert-finished-error", (event) => {
  g_modalButtonCancel.classList.add("hide"); // just in case
  g_modalButtonClose.classList.remove("hide");
  {
    g_modalButtonClose.classList.remove("green");
    g_modalButtonClose.classList.add("red");
  }
  g_modalLoadingBar.classList.add("hide");
  g_numErrors++;
});

ipcRenderer.on("convert-finished-canceled", (event) => {
  g_modalButtonCancel.classList.add("hide");
  g_modalButtonClose.classList.remove("hide");
  {
    g_modalButtonClose.classList.remove("green");
    g_modalButtonClose.classList.add("red");
  }
  g_modalLoadingBar.classList.add("hide");
  ipcRenderer.send(
    "convert-end-conversion",
    true,
    g_inputFiles.length,
    g_numErrors,
    g_inputFilesIndex // last one wasn't converted or error
  );
});

ipcRenderer.on("convert-show-result", (event) => {
  g_modalButtonCancel.classList.add("hide");
  g_modalButtonClose.classList.remove("hide");
  g_modalLoadingBar.classList.add("hide");
});

///////////////////////////////////////////////////////////////////////////////
// PDF ////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const pdfjsLib = require("../assets/libs/pdfjs/build/pdf.js");

async function extractPDFImages(folderPath, logText) {
  try {
    // ref: https://kevinnadro.com/blog/parsing-pdfs-in-javascript/
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "../assets/libs/pdfjs/build/pdf.worker.js";
    //pdfjsLib.disableWorker = true;
    const pdf = await pdfjsLib.getDocument(g_inputFilePath).promise;
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (g_cancelConversion) {
        pdf.cleanup();
        pdf.destroy();
        ipcRenderer.send("convert-pdf-images-extracted", true);
        return;
      }
      let page = await pdf.getPage(pageNum);

      // RENDER
      const canvas = document.createElement("canvas");
      let viewport = page.getViewport({
        scale: 300 / 72,
      }); // defines the size in pixels(72DPI)
      let context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport: viewport }).promise;

      let filePath = path.join(folderPath, pageNum + ".jpg");
      var img = canvas.toDataURL("image/jpeg", 0.75);
      var data = img.replace(/^data:image\/\w+;base64,/, "");
      var buf = Buffer.from(data, "base64");
      fs.writeFileSync(filePath, buf, "binary");
      updateTextLog(logText + pageNum + " / " + pdf.numPages);

      page.cleanup();
    }
    pdf.cleanup();
    pdf.destroy();
    ipcRenderer.send("convert-pdf-images-extracted", false);
  } catch (err) {
    ipcRenderer.send("convert-stop-error", err);
  }
}
