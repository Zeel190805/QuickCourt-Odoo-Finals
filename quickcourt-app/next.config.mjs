const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "mongodb", "nodemailer", "bcryptjs"],
  },
}

export default nextConfig
