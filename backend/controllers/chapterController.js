const db = require('../config/db');
const { cloudinary, uploadLargeVideoToCloudinary } = require('../config/cloudinary');

// ── GET ALL CHAPTERS───
exports.getChapters = async (req, res) => {
  try {
    const [chapters] = await db.execute(
      'SELECT * FROM chapters ORDER BY number'
    );
    for (const ch of chapters) {
      const [videos] = await db.execute(
        'SELECT * FROM chapter_videos WHERE chapter_id=?', [ch.id]
      );
      const [slides] = await db.execute(
        'SELECT * FROM chapter_slides WHERE chapter_id=? ORDER BY slide_order', [ch.id]
      );
      ch.videos = videos;
      ch.slides = slides;
    }
    res.json({ chapters });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET SINGLE CHAPTER─
exports.getChapter = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM chapters WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Chapter not found' });
    const ch = rows[0];
    const [videos] = await db.execute('SELECT * FROM chapter_videos WHERE chapter_id=?', [ch.id]);
    const [slides] = await db.execute('SELECT * FROM chapter_slides WHERE chapter_id=? ORDER BY slide_order', [ch.id]);
    ch.videos = videos;
    ch.slides = slides;
    res.json({ chapter: ch });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET ALL ASSESSMENT VIDEOS (joined with chapter info) 
exports.getAssessmentVideos = async (req, res) => {
  try {
    const [videos] = await db.execute(`
      SELECT
        cv.id,
        cv.title,
        cv.cloudinary_url,
        cv.cloudinary_id,
        cv.file_size_mb,
        cv.chapter_id,
        c.number  AS chapter_number,
        c.title   AS chapter_title
      FROM chapter_videos cv
      INNER JOIN chapters c ON c.id = cv.chapter_id
      ORDER BY c.number, cv.id
    `);
    res.json({ videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── UPDATE CHAPTER CONTENT ─────────
exports.updateChapter = async (req, res) => {
  try {
    const { title, description, content } = req.body;
    await db.execute(
      'UPDATE chapters SET title=?, description=?, content=? WHERE id=?',
      [title, description, content, req.params.id]
    );
    res.json({ message: 'Chapter updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── UPLOAD CHAPTER VIDEO (FIXED: Integrated Chunked Memory Streaming Uploader) ──
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file' });
    
    const { chapter_id, title } = req.body;

    // Stream chunks directly from the server memory buffer to bypass Cloudinary's 100MB limit
    const result = await uploadLargeVideoToCloudinary(req.file.buffer, 'mms/videos');
    
    // Safely extract the chunked streaming output properties
    const url = result.secure_url || null;
    const cid = result.public_id || null;
    
    // Calculate final file size safely from memory bytes capacity
    const size = req.file.size ? parseFloat((req.file.size / (1024 * 1024)).toFixed(2)) : null;

    // Secure database execution map using pure Javascript null types instead of undefined references
    const [resultDb] = await db.execute(
      'INSERT INTO chapter_videos (chapter_id,title,cloudinary_url,cloudinary_id,file_size_mb) VALUES (?,?,?,?,?)',
      [
        chapter_id || null, 
        title || req.file.originalname || null, 
        url, 
        cid, 
        size
      ]
    );

    res.status(201).json({ 
      message: 'Video uploaded', 
      video: { id: resultDb.insertId, url, title: title || req.file.originalname } 
    });
  } catch (err) {
    console.error("❌ uploadVideo system block crash error:", err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

// ── DELETE CHAPTER VIDEO
exports.deleteVideo = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM chapter_videos WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    await cloudinary.uploader.destroy(rows[0].cloudinary_id, { resource_type: 'video' });
    await db.execute('DELETE FROM chapter_videos WHERE id=?', [req.params.id]);
    res.json({ message: 'Video deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── UPLOAD SLIDE (PPT or PDF file for a chapter) 
exports.uploadSlide = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const { chapter_id, slide_order, title, content } = req.body;

    // Reconstruct raw document file buffer to base64 string because slide routes share the memory file filter
    const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const isImage = req.file.mimetype.startsWith('image/');
    
    let folderLocation = 'mms/documents';
    let resType = 'raw';
    let options = { resource_type: resType };

    if (isImage) {
      folderLocation = 'mms/images';
      resType = 'image';
      options = { folder: folderLocation, resource_type: resType };
    } else {
      const parts = req.file.originalname.split('.');
      const ext = parts.pop().toLowerCase();
      const baseName = parts.join('.').replace(/[^a-zA-Z0-9]/g, '_'); 
      options = { folder: folderLocation, resource_type: resType, public_id: `${baseName}-${Date.now()}.${ext}` };
    }

    const uploadResult = await cloudinary.uploader.upload(base64File, options);

    const [result] = await db.execute(
      'INSERT INTO chapter_slides (chapter_id,slide_order,title,content,image_url) VALUES (?,?,?,?,?)',
      [chapter_id || null, slide_order || 1, title || req.file.originalname, content || null, uploadResult.secure_url]
    );

    res.status(201).json({
      message: 'Slide uploaded',
      slide: { id: result.insertId, title: title || req.file.originalname, image_url: uploadResult.secure_url },
    });
  } catch (err) {
    console.error("❌ uploadSlide system crash:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── FIXED DELETE SLIDE CONTROLLER 
exports.deleteSlide = async (req, res) => {
  try {
    const slideId = req.params.id;
    console.log(`[Backend] Attempting to delete slide ID: ${slideId}`);

    const [rows] = await db.execute('SELECT * FROM chapter_slides WHERE id = ?', [slideId]);
    
    if (!rows || rows.length === 0) {
      console.log(`[Backend] Slide ID ${slideId} not found in database.`);
      return res.status(404).json({ message: 'Slide not found' });
    }

    const slide = rows[0]; 

    if (slide.image_url && slide.image_url.includes('cloudinary.com')) {
      try {
        const urlParts = slide.image_url.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1]; 
        const cleanPublicId = filenameWithExt.substring(0, filenameWithExt.lastIndexOf('.'));
        const targetedCloudinaryId = `mms/documents/${cleanPublicId}`;
        
        await cloudinary.uploader.destroy(targetedCloudinaryId, { resource_type: 'raw' });
      } catch (cloudinaryError) {
        console.error('[Backend] Cloudinary deletion skipped:', cloudinaryError.message);
      }
    }

    await db.execute('DELETE FROM chapter_slides WHERE id = ?', [slideId]);
    return res.json({ message: 'Slide deleted successfully' });

  } catch (err) {
    console.error('[Backend Engine Crash]:', err); 
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── TRACK PROGRESS
exports.markProgress = async (req, res) => {
  try {
    const { chapter_id } = req.body;
    await db.execute(
      `INSERT INTO chapter_progress (student_id,chapter_id,completed,last_viewed)
       VALUES (?,?,1,NOW())
       ON DUPLICATE KEY UPDATE completed=1, last_viewed=NOW()`,
      [req.user.id, chapter_id]
    );
    res.json({ message: 'Progress saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET STUDENT PROGRESS
exports.getProgress = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.id;
    const [rows] = await db.execute(
      'SELECT * FROM chapter_progress WHERE student_id=?', [studentId]
    );
    const pct = rows.length ? Math.round((rows.filter(r => r.completed).length / 6) * 100) : 0;
    res.json({ progress: rows, percentage: pct });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
