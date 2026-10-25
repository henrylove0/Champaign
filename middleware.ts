import { next } from "@vercel/functions/middleware";
import {
  handlePreviewRequest,
  previewResponseHeaders,
} from "./server/preview-gate.ts";

export const config = { matcher: "/:path*", runtime: "nodejs" };

export default async function middleware(request: Request): Promise<Response> {
  const response = await handlePreviewRequest(request, {
    passwordHash: process.env.PREVIEW_PASSWORD_HASH,
    sessionSecret: process.env.PREVIEW_SESSION_SECRET,
  });
  return response ?? next({ headers: previewResponseHeaders() });
}
