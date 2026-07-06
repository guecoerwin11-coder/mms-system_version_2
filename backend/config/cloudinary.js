const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Image / document storage configurations (Kept for small, non-video assets)
const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    if (isImage) {
      return { folder: 'mms/images', resource_type: 'image', allowed_formats: ['png', 'jpeg', 'jpg'] };
    } else {
      const parts = file.originalname.split('.');
      const ext = parts.pop().toLowerCase();
      const baseName = parts.join('.').replace(/[^a-zA-Z0-9]/g, '_'); 
      return { folder: 'mms/documents', resource_type: 'raw', public_id: `${baseName}-${Date.now()}.${ext}` };
    }
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'mms/avatars', resource_type: 'image', allowed_formats: ['png','jpeg','jpg'] },
});

// Standard file filters
const documentFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const ext = file.originalname.split('.').pop().toLowerCase();
  const allowedDocs = ['pdf', 'ppt', 'pptx', 'doc', 'docx'];
  const allowedVideos = ['mp4']; 

  if (isImage || allowedDocs.includes(ext) || allowedVideos.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid format. Allowed: images, mp4, pdf, ppt, pptx, doc, docx'), false);
  }
};

// Use local memory buffer tracking to handle massive file payloads safely
const uploadFile = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max restriction boundary
  fileFilter: documentFilter 
});

const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadExcel  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── REFACTORED: OPTIMIZED CHUNKED UPLOADER VIA LOCAL TEMP FILE ──────────────────
const uploadLargeVideoToCloudinary = (fileBuffer, folderPath) => {
  return new Promise((resolve, reject) => {
    // 1. Create a unique temporary filename in your system's temp folder
    const tempDir = process.env.TMPDIR || process.env.TMP || '/tmp';
    // Ensure temp directory exists for local environments
    if (!fs.existsSync(tempDir)) {
      try { fs.mkdirSync(tempDir); } catch(e) {}
    }
    
    const tempFilePath = path.join(tempDir, `upload-${Date.now()}.mp4`);

    // 2. Write the memory buffer onto the disk space temporarily
    fs.writeFile(tempFilePath, fileBuffer, (writeErr) => {
      if (writeErr) return reject(writeErr);

      // 3. Trigger Cloudinary's native automated large-file chunking engine
      cloudinary.uploader.upload_large(
        tempFilePath,
        {
          folder: folderPath,
          resource_type: 'video',
          chunk_size: 6 * 1024 * 1024, // 6MB chunks to stay safe on free tier boundaries
          timeout: 600000 // 10-minute network response timeout window
        },
        (uploadErr, result) => {
          // 4. Always delete the temporary disk file after processing to prevent server leaks
          fs.unlink(tempFilePath, () => {});

          if (uploadErr) return reject(uploadErr);
          resolve(result);
        }
      );
    });
  });
};

module.exports = { 
  cloudinary, 
  uploadFile, 
  uploadVideo: uploadFile, 
  uploadAvatar, 
  uploadExcel, 
  uploadLargeVideoToCloudinary 
};
