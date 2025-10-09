import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCloudinary, isCloudinaryEnabled, getUploadFolder } from '@/lib/cloudinary';

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Cloudinary is enabled
    const cloudinaryEnabled = await isCloudinaryEnabled();
    if (!cloudinaryEnabled) {
      return NextResponse.json({ error: 'File upload is currently unavailable' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const requestedFolder = formData.get('folder') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get upload folder from settings
    const defaultFolder = await getUploadFolder();
    const folder = requestedFolder || defaultFolder;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get configured Cloudinary instance
    const cloudinary = await getCloudinary();

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `${defaultFolder}/${folder}`,
          transformation: [
            { width: 1920, height: 1080, crop: 'limit', quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      url: (result as CloudinaryUploadResult).secure_url,
      publicId: (result as CloudinaryUploadResult).public_id,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}