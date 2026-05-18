import type { APIRoute } from "astro";
import { imageRoute } from "@/lib/routes/image";

export const GET: APIRoute = (ctx) => imageRoute(ctx, "gif");
export const HEAD: APIRoute = (ctx) => imageRoute(ctx, "gif");
