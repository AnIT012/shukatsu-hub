/** @type {import('next').NextConfig} */
const nextConfig = {
  // 個人用ローカルツール。型チェックは有効、ESLint はビルドを止めない。
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
