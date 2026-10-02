import { NextResponse } from "next/server";
import publicManifest from "@/deployment-manifest.public.json";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    service: "exigent",
    environment: process.env.VERCEL_ENV ?? "local",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "unknown",
    deploymentUrl: process.env.VERCEL_URL ?? "unknown",
    gitCommitSha: process.env.NEXT_PUBLIC_EXIGENT_FRONTEND_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || publicManifest.frontend?.sourceCommit || "unknown",
  }, { headers: { "cache-control": "no-store" } });
}
