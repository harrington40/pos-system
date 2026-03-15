/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // React Compiler — auto-memoizes components & hooks (no useMemo/useCallback needed)
    reactCompiler: true,
  },
  // Silence the "multiple lockfiles" workspace root inference warning
  outputFileTracingRoot: "/mnt/c/Users/harri/designProject2020/receptionist-ai",
};

export default nextConfig;
