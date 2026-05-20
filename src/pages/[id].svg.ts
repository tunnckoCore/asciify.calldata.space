import type { APIRoute } from "astro";
import { svgRoute } from "@/lib/routes/svg";

export const GET: APIRoute = (ctx) => svgRoute(ctx);
export const HEAD: APIRoute = (ctx) => svgRoute(ctx);
