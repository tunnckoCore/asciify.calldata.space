import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_BLOCKSCRIPT_OPTIONS,
  type RenderBlockscriptOptions,
  renderBlockscriptImage,
} from "./src/lib/blockscript";

function parsePositiveInteger(name: string, value: string) {
  const parsed = Number.parseInt(value, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed <= 0 ||
    String(parsed) !== value.trim()
  ) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseIntegerInRange(
  name: string,
  value: string,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed < min ||
    parsed > max ||
    String(parsed) !== value.trim()
  ) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

type CliOptions = RenderBlockscriptOptions & {
  input: string | null;
  output: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    ...DEFAULT_BLOCKSCRIPT_OPTIONS,
    input: null,
    output: path.resolve("blockscript-ascii.png"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      index += 1;
      return value;
    };

    switch (arg) {
      case "--input":
      case "-i":
        options.input = next();
        break;
      case "--output":
      case "-o":
        options.output = path.resolve(next());
        break;
      case "--size":
        options.size = parsePositiveInteger(arg, next());
        break;
      case "--cell-width":
        options.cellWidth = parsePositiveInteger(arg, next());
        break;
      case "--cell-height":
        options.cellHeight = parsePositiveInteger(arg, next());
        break;
      case "--source-scale":
        options.sourceScale = parsePositiveInteger(arg, next());
        break;
      case "--grid-width":
        options.gridWidth = parsePositiveInteger(arg, next());
        break;
      case "--grid-height":
        options.gridHeight = parsePositiveInteger(arg, next());
        break;
      case "--background":
        options.background = next();
        break;
      case "--transparent-glyph":
        options.transparentGlyph = next();
        break;
      case "--transparent-mode": {
        const value = next();
        if (value !== "dim" && value !== "skip") {
          throw new Error("--transparent-mode must be dim or skip");
        }
        options.transparentMode = value;
        break;
      }
      case "--alpha-threshold":
        options.alphaThreshold = parseIntegerInRange(arg, next(), 0, 255);
        break;
      case "--circle":
        options.circle = true;
        break;
      case "--heart":
        options.heart = true;
        break;
      case "--palette":
        options.palette = true;
        break;
      case "--no-palette":
        options.palette = false;
        break;
      case "--help":
      case "-h":
        console.log(
          "Usage: bun blockscript-ascii-standalone.ts --input <image> --output <image> [--size 336] [--circle|--heart]",
        );
        process.exit(0);
      default:
        if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
        if (options.input)
          throw new Error(`Unexpected positional argument: ${arg}`);
        options.input = arg;
        break;
    }
  }

  if (!options.input) throw new Error("Provide --input <image-path>");
  return options;
}

try {
  const { input, output, ...options } = parseArgs(process.argv.slice(2));
  const bytes = await readFile(path.resolve(input));
  const result = await renderBlockscriptImage(bytes, options);
  await writeFile(output, result.image);
  console.log(
    `Wrote ${output} (${result.outputWidth}x${result.outputHeight}, ${result.image.length} bytes)`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
