import * as fs from "node:fs";
import * as path from "node:path";
import * as opentype from "opentype.js";
import { decompress } from "wawoff2";

// Define standard types for our generated bitmaps
interface CharacterBitmap {
  character: string;
  glyphName: string | null;
  grid: number[][]; // 7x7 matrix of 0 (empty) or 1 (filled block)
}

interface FontBitmaps {
  fontName: string;
  bitmaps: CharacterBitmap[];
}

/**
 * Parses a font file buffer and extracts a precise 7x7 grid bitmap
 * for each character in the provided alphabet.
 */
function extractFontBitmaps(
  fontBuffer: Buffer | Uint8Array,
  fontLabel: string,
  alphabet: string,
): FontBitmaps {
  // Convert Node Buffer to ArrayBuffer for opentype.js compatibility
  const arrayBuffer = fontBuffer.buffer.slice(
    fontBuffer.byteOffset,
    fontBuffer.byteOffset + fontBuffer.byteLength,
  );

  const font = opentype.parse(arrayBuffer);
  const results: CharacterBitmap[] = [];

  // High/Low Blockscript are mapped to a 7x7 cell architecture per letter.
  const GRID_SIZE = 7;

  for (const char of alphabet) {
    const glyph = font.charToGlyph(char);

    // Initialize a blank 7x7 pixel grid matrix
    const grid: number[][] = Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill(0),
    );

    // Get the exact bounding box of the glyph in font design units
    const bbox = glyph.getBoundingBox();
    const glyphWidth = bbox.x2 - bbox.x1;
    const glyphHeight = bbox.y2 - bbox.y1;

    if (glyphWidth > 0 && glyphHeight > 0) {
      // Create a grid of sample test points at the center coordinates of each 7x7 cell
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          // Calculate point relative to the glyph's physical bounding box coordinates
          // Rows count from top to bottom, font coordinates y counts from bottom to top.
          const pctX = (c + 0.5) / GRID_SIZE;
          const pctY = (GRID_SIZE - 1 - r + 0.5) / GRID_SIZE;

          const testX = bbox.x1 + pctX * glyphWidth;
          const testY = bbox.y1 + pctY * glyphHeight;

          if (isPointInGlyph(glyph, testX, testY)) {
            grid[r][c] = 1;
          }
        }
      }
    }

    results.push({
      character: char,
      glyphName: glyph.name,
      grid: grid,
    });
  }

  return {
    fontName: fontLabel,
    bitmaps: results,
  };
}

/**
 * Uses a Ray-Casting algorithm to accurately test if a coordinate sits
 * inside the composite closed paths of a parsed typeface glyph.
 */
function isPointInGlyph(glyph: opentype.Glyph, x: number, y: number): boolean {
  const path = glyph.path;
  let inside = false;

  let startX = 0;
  let startY = 0;
  let currX = 0;
  let currY = 0;

  for (const cmd of path.commands) {
    let nextX = currX;
    let nextY = currY;

    switch (cmd.type) {
      case "M": // MoveTo
        startX = cmd.x;
        startY = cmd.y;
        nextX = cmd.x;
        nextY = cmd.y;
        break;
      case "L": // LineTo
        nextX = cmd.x;
        nextY = cmd.y;
        break;
      case "Q": // Quadratic Bezier Curve To
        nextX = cmd.x;
        nextY = cmd.y;
        break;
      case "C": // Cubic Bezier Curve To
        nextX = cmd.x;
        nextY = cmd.y;
        break;
      case "Z": // ClosePath
        nextX = startX;
        nextY = startY;
        break;
    }

    // Perform standard ray casting check for line intersection
    if (cmd.type !== "M") {
      const intersect =
        currY > y !== nextY > y &&
        x < ((nextX - currX) * (y - currY)) / (nextY - currY) + currX;
      if (intersect) inside = !inside;
    }

    currX = nextX;
    currY = nextY;
  }

  return inside;
}

/**
 * Prints a clean visual terminal representation of the block grid structures
 */
function printGrid(bitmap: CharacterBitmap): void {
  console.log(
    `\nCharacter: '${bitmap.character}' (Glyph: ${bitmap.glyphName})`,
  );
  for (const row of bitmap.grid) {
    const rowVisual = row.map((cell) => (cell === 1 ? "██" : "  ")).join("");
    console.log(rowVisual);
  }
}

// ============================================================================
// Main Execution Engine
// ============================================================================

async function main() {
  const currency = "₿¢$€£¥₴₽₹₪₩฿";
  const math = "+−×÷=><%";
  const numerals = "0123456789";
  const punctuation = ".,:;…!¡?¿·•*#/|\\-–—_(){}‚„“”‘’\"'°@&§©®™↑→↓←";
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const targetAlphabet = [
    currency,
    math,
    numerals,
    punctuation,
    alphabet,
    alphabet.toUpperCase(),
  ].join("");

  try {
    console.log("Reading and extracting Blockscript font files...");

    // 1. Load the binary file buffers from disk
    const highBuffer = fs.readFileSync(
      path.join(process.cwd(), "./public/blockscript/High Blockscript.woff2"),
    );
    // const lowBuffer = fs.readFileSync(
    //   path.join(process.cwd(), "./public/blockscript/Low Blockscript.woff2"),
    // );

    // 2. Compute extracted grid maps
    const highBlockscriptMaps = extractFontBitmaps(
      Buffer.from(await decompress(highBuffer)),
      "High Blockscript",
      targetAlphabet,
    );
    // const lowBlockscriptMaps = extractFontBitmaps(
    //   Buffer.from(await decompress(lowBuffer)),
    //   "Low Blockscript",
    //   targetAlphabet,
    // );

    // 3. Output clean glyph maps directly onto file
    const high = Object.fromEntries(
      highBlockscriptMaps.bitmaps.map((bitmap) => [
        bitmap.character,
        bitmap.grid.map((row) => row.join("")),
      ]),
    );
    // const low = Object.fromEntries(
    //   lowBlockscriptMaps.bitmaps.map((bitmap) => [
    //     bitmap.character,
    //     bitmap.grid.map((row) => row.join("")),
    //   ]),
    // );

    fs.writeFileSync(
      "./src/lib/glyphs-highscript.ts",
      `export const HIGHSCRIPT: Readonly<Record<string, readonly string[]>> = Object.freeze(${JSON.stringify(high, null, 2)});\n`,
      "utf-8",
    );
    // fs.writeFileSync(
    //   "./src/lib/glyphs-lowscript.ts",
    //   `export const LOWSCRIPT: Readonly<Record<string, readonly string[]>> = Object.freeze(${JSON.stringify(low, null, 2)});\n`,
    //   "utf-8",
    // );
    console.log(
      "Successfully saved full bitmaps data extraction map to blockscript_bitmaps_output.json!",
    );

    // 4. Print visual demonstration samples into the terminal logger (e.g., Letter 'A')
    console.log("\n--- VISUAL GENERATION SAMPLES ---");

    const highA = highBlockscriptMaps.bitmaps.find((b) => b.character === "A");
    if (highA) {
      console.log("\n[High Blockscript Map Sample]");
      printGrid(highA);
    }

    // const lowA = lowBlockscriptMaps.bitmaps.find((b) => b.character === "A");
    // if (lowA) {
    //   console.log("\n[Low Blockscript Map Sample]");
    //   printGrid(lowA);
    // }
  } catch (error) {
    console.error("An error occurred during bitmap extraction:", error);
  }
}

await main();
