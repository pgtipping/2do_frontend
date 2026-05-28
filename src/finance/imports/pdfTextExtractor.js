async function loadPdfDocumentWithPdfJs(pdfBytes) {
  const pdfjs = await import("pdfjs-dist/build/pdf.min.js");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.js?url");

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  return pdfjs.getDocument({ data: pdfBytes }).promise;
}

function normalizeExtractedPageText(items) {
  const hasPositionData = items.some((item) => Array.isArray(item.transform));

  if (!hasPositionData) {
    return items
      .map((item) => item.str)
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const positionedItems = items
    .filter((item) => item.str)
    .map((item) => ({
      text: item.str,
      xPosition: item.transform?.[4] || 0,
      yPosition: item.transform?.[5] || 0,
    }))
    .sort((firstItem, secondItem) => {
      const yDifference = secondItem.yPosition - firstItem.yPosition;

      if (Math.abs(yDifference) > 2) {
        return yDifference;
      }

      return firstItem.xPosition - secondItem.xPosition;
    });

  const lines = [];

  positionedItems.forEach((item) => {
    const currentLine = lines.at(-1);

    if (!currentLine || Math.abs(currentLine.yPosition - item.yPosition) > 2) {
      lines.push({
        yPosition: item.yPosition,
        textParts: [item],
      });
      return;
    }

    currentLine.textParts.push(item);
  });

  return lines
    .map((line) =>
      line.textParts
        .sort((firstPart, secondPart) => firstPart.xPosition - secondPart.xPosition)
        .map((part) => part.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

export async function extractTextFromPdfFile(
  file,
  { loadPdfDocument = loadPdfDocumentWithPdfJs } = {}
) {
  if (!file || file.type !== "application/pdf") {
    throw new Error("Please choose a PDF file.");
  }

  const pdfBytes = await file.arrayBuffer();
  const pdfDocument = await loadPdfDocument(pdfBytes);
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    pages.push(normalizeExtractedPageText(textContent.items));
  }

  return pages.filter(Boolean).join("\n\n");
}
