import type { APIRoute } from "astro";
import { imageRoute } from "@/lib/routes/image";

export const GET: APIRoute = (ctx) => imageRoute(ctx, "png");
