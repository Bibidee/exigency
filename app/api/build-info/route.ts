import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    service: "exigent",
    environment: process.env.VERCEL_ENV ?? "local",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "unknown",
    deploymentUrl: process.env.VERCEL_URL ?? "unknown",
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.EXIGENT_FRONTEND_COMMIT ?? "unknown",
  }, { headers: { "cache-control": "no-store" } });
}
