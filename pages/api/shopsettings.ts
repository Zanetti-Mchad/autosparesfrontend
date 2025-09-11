import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File as FormidableFile } from 'formidable';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { supabase } from '../../src/lib/supabaseClient';

// Promisify pipeline for async/await
const pipelineAsync = promisify(pipeline);

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // Parse form data
    const form = new IncomingForm();
    interface FormFields {
      [key: string]: unknown;
    }

    interface FormFiles {
      file?: FormidableFile[];
      [key: string]: unknown;
    }

    const [fields, files] = await new Promise<[FormFields, FormFiles]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    // Validate file type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const fileMimeType = file.mimetype || '';
    
    if (!validMimeTypes.includes(fileMimeType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid file type. Only images are allowed.' 
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.originalFilename?.split('.').pop() || 'jpg';
    const fileName = `business_${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const fileStream = createReadStream(file.filepath);
    
    // Check if Supabase client is available
    if (!supabase) {
      return res.status(500).json({ 
        success: false,
        message: 'Storage service not configured',
        error: 'Missing Supabase configuration' 
      });
    }
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('shopsettings-photo')
      .upload(`photos/${fileName}`, fileStream, {
        contentType: file.mimetype || 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to upload to storage',
        error: uploadError.message 
      });
    }

    // Get public URL
    if (!supabase) {
      return res.status(500).json({ 
        success: false,
        message: 'Storage service not configured',
        error: 'Missing Supabase configuration' 
      });
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('shopsettings-photo')
      .getPublicUrl(`photos/${fileName}`);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileName,
      filePath: publicUrl,
      mimeType: file.mimetype,
      size: file.size
    });
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}