import assert from "node:assert/strict";
import { test } from "node:test";

import { extractTextFromPdfFile } from "../pdfTextExtractor.js";

test("extracts text from every PDF page in order", async () => {
  const file = {
    type: "application/pdf",
    async arrayBuffer() {
      return new ArrayBuffer(8);
    },
  };
  const text = await extractTextFromPdfFile(file, {
    loadPdfDocument: async () => ({
      numPages: 2,
      async getPage(pageNumber) {
        return {
          async getTextContent() {
            return {
              items:
                pageNumber === 1
                  ? [{ str: "Page" }, { str: "one" }]
                  : [{ str: "Page" }, { str: "two" }],
            };
          },
        };
      },
    }),
  });

  assert.equal(text, "Page one\n\nPage two");
});

test("preserves PDF line breaks when text items include vertical positions", async () => {
  const file = {
    type: "application/pdf",
    async arrayBuffer() {
      return new ArrayBuffer(8);
    },
  };
  const text = await extractTextFromPdfFile(file, {
    loadPdfDocument: async () => ({
      numPages: 1,
      async getPage() {
        return {
          async getTextContent() {
            return {
              items: [
                { str: "POSTING DATE", transform: [1, 0, 0, 1, 72, 700] },
                { str: "DESCRIPTION", transform: [1, 0, 0, 1, 160, 700] },
                { str: "12/20", transform: [1, 0, 0, 1, 72, 682] },
                { str: "TD ZELLESENT JOHN", transform: [1, 0, 0, 1, 160, 682] },
                { str: "RENT PAYMENT 800.00", transform: [1, 0, 0, 1, 160, 664] },
              ],
            };
          },
        };
      },
    }),
  });

  assert.equal(
    text,
    "POSTING DATE DESCRIPTION\n12/20 TD ZELLESENT JOHN\nRENT PAYMENT 800.00"
  );
});

test("orders positioned PDF text by visible row and column", async () => {
  const file = {
    type: "application/pdf",
    async arrayBuffer() {
      return new ArrayBuffer(8);
    },
  };
  const text = await extractTextFromPdfFile(file, {
    loadPdfDocument: async () => ({
      numPages: 1,
      async getPage() {
        return {
          async getTextContent() {
            return {
              items: [
                { str: "AMOUNT", transform: [1, 0, 0, 1, 420, 700] },
                { str: "POSTING DATE", transform: [1, 0, 0, 1, 72, 700] },
                { str: "DESCRIPTION", transform: [1, 0, 0, 1, 160, 700] },
                { str: "800.00", transform: [1, 0, 0, 1, 420, 682] },
                { str: "12/20", transform: [1, 0, 0, 1, 72, 682] },
                { str: "TD ZELLESENT JOHN DOE", transform: [1, 0, 0, 1, 160, 682] },
              ],
            };
          },
        };
      },
    }),
  });

  assert.equal(
    text,
    "POSTING DATE DESCRIPTION AMOUNT\n12/20 TD ZELLESENT JOHN DOE 800.00"
  );
});

test("rejects non-PDF files before reading", async () => {
  const file = {
    type: "text/plain",
    async arrayBuffer() {
      throw new Error("Should not read this file.");
    },
  };

  await assert.rejects(
    () => extractTextFromPdfFile(file, { loadPdfDocument: async () => null }),
    /Please choose a PDF file/
  );
});
