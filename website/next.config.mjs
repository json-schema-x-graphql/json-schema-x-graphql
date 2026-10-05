import nextra from "nextra";

const withNextra = nextra({
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
  webpack: (config, { isServer: _isServer }) => {
    config.parallelism = 1;
    config.cache = {
      type: "filesystem",
      allowCollectingMemory: true,
    };
    return config;
  },
};

export default withNextra(nextConfig);
