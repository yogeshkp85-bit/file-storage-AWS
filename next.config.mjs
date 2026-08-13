/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    MY_AWS_REGION: process.env.MY_AWS_REGION || "",
    MY_AWS_ACCESS_KEY_ID: process.env.MY_AWS_ACCESS_KEY_ID || "",
    MY_AWS_SECRET_ACCESS_KEY: process.env.MY_AWS_SECRET_ACCESS_KEY || "",
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || "",
  }
}

export default nextConfig
