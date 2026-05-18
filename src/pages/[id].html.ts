import type { APIRoute } from "astro";
import { htmlRoute } from "@/lib/routes/html";

export const GET: APIRoute = (ctx) => htmlRoute(ctx);
