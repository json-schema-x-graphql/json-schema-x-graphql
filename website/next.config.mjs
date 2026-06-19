import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
  defaultShowCopyCode: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // GitHub Pages: set basePath to the repo name unless a custom domain is used
  basePath: process.env.BASE_PATH ?? "",
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Serialize module compilation
    config.parallelism = 1;
    // Force Webpack cache to file-system in production rather than memory
    config.cache = {
      type: "filesystem",
      allowCollectingMemory: true,
    };
    return config;
  },
};

export default withNextra(nextConfig);
