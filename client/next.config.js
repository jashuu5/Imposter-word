/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "export",  // builds to /client/out as static HTML/JS/CSS
  trailingSlash: true,
};

module.exports = nextConfig;
