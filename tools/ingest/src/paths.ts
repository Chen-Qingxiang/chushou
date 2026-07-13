import path from "node:path";

export function repoPath(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}

export const curatedRoot = (): string => repoPath("data", "curated");
export const generatedRoot = (): string => repoPath("data", "generated");
export const reportRoot = (): string => repoPath("docs", "reports");
