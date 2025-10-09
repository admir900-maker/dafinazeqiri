import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig } from './settings';

let isConfigured = false;

// Configure Cloudinary with settings from database
export async function configureCloudinary() {
  if (isConfigured) return;

  const config = await getCloudinaryConfig();

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  });

  isConfigured = true;
}

// Get configured Cloudinary instance
export async function getCloudinary() {
  await configureCloudinary();
  return cloudinary;
}

// Check if Cloudinary is enabled and configured
export async function isCloudinaryEnabled(): Promise<boolean> {
  const config = await getCloudinaryConfig();
  return config.enabled && !!config.cloudName && !!config.apiKey;
}

// Get upload folder from settings
export async function getUploadFolder(): Promise<string> {
  const config = await getCloudinaryConfig();
  return config.folder || 'biletara';
}

// Default export for backward compatibility
export default cloudinary;