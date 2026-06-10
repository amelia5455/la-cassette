import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo lives beside other lockfiles; pin the tracing root to this project.
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
