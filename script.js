let pdfBytesGlobal = null;
const status = document.getElementById("status");
const downloadBtn = document.getElementById("downloadBtn");
const processBtn = document.getElementById("processBtn");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const fileNameLabel = document.getElementById("fileNameLabel");

function log(msg) {
  status.textContent += msg + "\n";
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    if (file.type !== "application/pdf") {
      log("❌ Nur PDF-Dateien erlaubt.");
      fileInput.value = "";
      processBtn.classList.remove("glow");
      fileName.classList.add("hidden");
      fileNameLabel.classList.add("hidden");
    } else {
      log(`📤 Datei hochgeladen: ${file.name}`);
      processBtn.classList.add("glow");
      fileNameLabel.classList.remove("hidden");
      fileName.value = file.name;
      fileName.classList.remove("hidden");
    }
  }
});

function createPatternCanvas(type, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 0.5;

  if (type === "lines") {
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (type === "dots") {
    for (let x = 0; x < width; x += 20) {
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fillStyle = "#999";
        ctx.fill();
      }
    }
  } else if (type === "grid") {
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  return canvas;
}

async function processPDF() {
  const file = fileInput.files[0];
  const background = document.getElementById("backgroundSelect").value;
  const side = document.getElementById("sideSelect").value;
  const percent =
    parseFloat(document.getElementById("percentInput").value) || 100;

  status.textContent = "";
  downloadBtn.style.display = "none";
  downloadBtn.classList.remove("ready");
  processBtn.classList.remove("glow");

  if (!file) return log("❌ Kein PDF ausgewählt.");

  log(`📄 Lade PDF: ${file.name}`);

  const arrayBuffer = await file.arrayBuffer();
  const existingPdf = await PDFLib.PDFDocument.load(arrayBuffer);
  const newPdf = await PDFLib.PDFDocument.create();
  const pageCount = existingPdf.getPageCount();
  log(`📝 Seiten: ${pageCount}`);

  for (let i = 0; i < pageCount; i++) {
    log(`➡️ Seite ${i + 1} bearbeiten...`);

    const page = existingPdf.getPage(i);
    const { width, height } = page.getSize();
    const extraWidth = width * (percent / 100);
    const newWidth = width + extraWidth;

    const [embeddedPage] = await newPdf.embedPages([page]);
    const newPage = newPdf.addPage([newWidth, height]);

    if (background !== "white") {
      const patternCanvas = createPatternCanvas(background, extraWidth, height);
      const patternImg = await newPdf.embedPng(patternCanvas.toDataURL());
      const xPos = side === "right" ? width : 0;
      newPage.drawImage(patternImg, {
        x: xPos,
        y: 0,
        width: extraWidth,
        height: height,
      });
    }

    // Draw Trennline if checkbox is checked
    const drawLine = document.getElementById("lineCheckbox").checked;
    if (drawLine) {
      const lineX = side === "right" ? width : extraWidth;
      newPage.drawLine({
        start: { x: lineX, y: 0 },
        end: { x: lineX, y: height },
        thickness: 1,
        color: PDFLib.rgb(0.5, 0.5, 0.5), // gray line
      });
    }

    const origX = side === "right" ? 0 : extraWidth;
    newPage.drawPage(embeddedPage, {
      x: origX,
      y: 0,
      width: width,
      height: height,
    });

    await new Promise((r) => setTimeout(r, 10));
  }

  pdfBytesGlobal = await newPdf.save();
  downloadBtn.style.display = "block";
  downloadBtn.classList.add("ready");
  log("✅ Fertig! Download bereit.");
}

function downloadPDF() {
  if (!pdfBytesGlobal) return;

  const blob = new Blob([pdfBytesGlobal], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const newFileName = fileName.value || "erweitertes_pdf.pdf"; // Default name if input is empty
  const a = document.createElement("a");
  a.href = url;
  a.download = newFileName;
  a.click();
}

// Drag & Drop
const dragArea = document.getElementById("dragArea");

window.addEventListener("dragover", (e) => {
  e.preventDefault();
  dragArea.classList.add("over");
});

window.addEventListener("dragleave", () => {
  dragArea.classList.remove("over");
});

window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragArea.classList.remove("over");

  const files = e.dataTransfer.files;
  if (files.length) {
    const file = files[0];
    if (file.type !== "application/pdf") {
      log("❌ Nur PDF-Dateien erlaubt.");
      return;
    }
    fileInput.files = files;
    log(`📤 Datei hochgeladen: ${file.name}`);
    processBtn.classList.add("glow");
  }
});
