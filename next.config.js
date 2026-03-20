/** @type {import('next').NextConfig} */
const basePath = process.env.NODE_ENV === "production" ? "/daiwashobo-book-order-app" : "";

const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

module.exports = nextConfig;
