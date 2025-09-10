import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { supabase } from '../../src/lib/supabaseClient';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = formidable({});
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ message: 'Form parse error' });

    const file = files.file?.[0];
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const fileExt = file.originalFilename?.split('.').pop()?.toLowerCase();
    if (!fileExt || !validExtensions.includes(fileExt)) {
      return res.status(400).json({ message: 'Invalid file extension' });
    }

    const fileName = `staff_${Date.now()}.${fileExt}`;
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to Supabase Storage (shopstaff-photos bucket)
    const { error } = await supabase.storage
      .from('shopstaff-photos')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype ?? undefined,
        upsert: true,
      });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('shopstaff-photos')
      .getPublicUrl(fileName);

    res.status(200).json({
      message: 'File uploaded successfully',
      url: publicUrlData.publicUrl,
      fileName,
    });
  });
}