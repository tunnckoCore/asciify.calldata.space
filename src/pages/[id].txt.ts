import type { APIRoute } from "astro";
import { txtRoute } from "@/lib/routes/datauri";

export const GET: APIRoute = (ctx) => txtRoute(ctx);
