const db = require('../config/db');
const { cloudinary, uploadLargeVideoToCloudinary } = require('../config/cloudinary');

// ── GET ACTIVITY FILES ────────────────────────────────────────────────────────
exports.getActivities = async (req, res) => {
  try {
    const { chapter_id } = req.query;
    let sql = 'SELECT af.*, c.title AS chapter_title FROM activity_files af LEFT JOIN chapters c ON c.id=af.chapter_id WHERE 1=1';
    const params = [];
    if (chapter_id) { sql += ' AND af.chapter_id=?'; params.push(chapter_id); }
    sql += ' ORDER BY af.created_at DESC';
    const [rows] = await db.execute(sql, params);
    res.json({ activities: rows });
  } catch (err) {
    console.error("Error in getActivities:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── UPLOAD ACTIVITY FILE ──────────────────────────────────────────────────────
exports.uploadActivity = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!req.user || !req.user.id) return res.status(401).json({ message: 'Unauthorized' });

    const { chapter_id, title } = req.body;
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const size = req.file.size ? parseFloat((req.file.size / (1024 * 1024)).toFixed(2)) : null;

    let cloudinaryUrl = '';
    let cloudinaryId = '';

    // Route to chunked uploader if it's a video file
    if (ext === 'mp4') {
      const result = await uploadLargeVideoToCloudinary(req.file.buffer, 'mms/videos');
      cloudinaryUrl = result.secure_url;
      cloudinaryId = result.public_id;
    } else {
      // Standard upload logic for documents or photos using memory storage buffers
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const resourceType = ['png', 'jpeg', 'jpg', 'gif', 'webp'].includes(ext) ? 'image' : 'raw';
      
      const result = await cloudinary.uploader.upload(base64File, {
        folder: resourceType === 'image' ? 'mms/images' : 'mms/documents',
        resource_type: resourceType
      });
      cloudinaryUrl = result.secure_url;
      cloudinaryId = result.public_id;
    }

    const [result] = await db.execute(
      'INSERT INTO activity_files (chapter_id,title,file_type,cloudinary_url,cloudinary_id,file_size_mb,uploaded_by) VALUES (?,?,?,?,?,?,?)',
      [chapter_id || null, title || req.file.originalname, ext, cloudinaryUrl, cloudinaryId, size, req.user.id]
    );
    res.status(201).json({ message: 'File uploaded', id: result.insertId, url: cloudinaryUrl });
  } catch (err) {
    console.error("❌ uploadActivity system crash:", err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

// ── DELETE ACTIVITY FILE ──────────────────────────────────────────────────────
exports.deleteActivity = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM activity_files WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    
    const fileType = rows.file_type.toLowerCase();
    let resourceType = 'raw';
    if (['png', 'jpeg', 'jpg', 'gif', 'webp'].includes(fileType)) {
      resourceType = 'image';
    } else if (['mp4'].includes(fileType)) {
      resourceType = 'video';
    }

    await cloudinary.uploader.destroy(rows[0].cloudinary_id, { resource_type: resourceType });
    await db.execute('DELETE FROM activity_files WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error("Error in deleteActivity:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET SUBMISSIONS ───────────────────────────────────────────────────────────
exports.getSubmissions = async (req, res) => {
  try {
    const isInstructor = req.user.role === 'instructor';
    let sql = `SELECT s.*, u.name AS student_name, u.section, c.title AS chapter_title
               FROM submissions s
               JOIN users u ON u.id = s.student_id
               LEFT JOIN chapters c ON c.id = s.chapter_id WHERE 1=1`;
    const params = [];
    if (!isInstructor) { sql += ' AND s.student_id=?'; params.push(req.user.id); }
    sql += ' ORDER BY s.submitted_at DESC';
    const [rows] = await db.execute(sql, params);
    res.json({ submissions: rows });
  } catch (err) {
    console.error("Error in getSubmissions:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── STUDENT SUBMIT ACTIVITY ───────────────────────────────────────────────────
exports.submitActivity = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!req.user || !req.user.id) return res.status(401).json({ message: 'Unauthorized' });

    const { chapter_id, activity_id, title, notes } = req.body;
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    let cloudinaryUrl = '';
    let cloudinaryId = '';

    // Handle large video submissions using the chunked uploader utility
    if (ext === 'mp4') {
      const result = await uploadLargeVideoToCloudinary(req.file.buffer, 'mms/submissions/videos');
      cloudinaryUrl = result.secure_url;
      cloudinaryId = result.public_id;
    } else {
      // Standard upload logic for student documents or images
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const resourceType = ['png', 'jpeg', 'jpg', 'gif', 'webp'].includes(ext) ? 'image' : 'raw';
      
      const result = await cloudinary.uploader.upload(base64File, {
        folder: resourceType === 'image' ? 'mms/images' : 'mms/documents',
        resource_type: resourceType
      });
      cloudinaryUrl = result.secure_url;
      cloudinaryId = result.public_id;
    }

    const [result] = await db.execute(
      'INSERT INTO submissions (student_id,chapter_id,activity_id,title,cloudinary_url,cloudinary_id,file_type,notes) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, chapter_id || null, activity_id || null, title || req.file.originalname,
       cloudinaryUrl, cloudinaryId, ext, notes || null]
    );
    res.status(201).json({ message: 'Submitted successfully', id: result.insertId });
  } catch (err) {
    console.error("submitActivity system crash:", err);
    res.status(500).json({ message: 'Submission failed', error: err.message });
  }
};

// ── GRADE SUBMISSION ──────────────────────────────────────────────────────────
exports.gradeSubmission = async (req, res) => {
  try {
    const { score, feedback } = req.body;
    await db.execute(
      'UPDATE submissions SET score=?, feedback=?, graded_by=?, graded_at=NOW() WHERE id=?',
      [score, feedback || null, req.user.id, req.params.id]
    );
    res.json({ message: 'Graded successfully' });
  } catch (err) {
    console.error("Error in gradeSubmission:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // 1. Stream the chunks from memory buffer directly to Cloudinary
    const result = await uploadLargeVideoToCloudinary(req.file.buffer, 'mms/chapters/videos');
    
    // 2. Extract values safely to guarantee they are never 'undefined'
    const videoUrl = result.secure_url || null;
    const cloudinaryId = result.public_id || null;
    
    // Calculate the size in MB cleanly from memory properties
    const size = req.file.size ? parseFloat((req.file.size / (1024 * 1024)).toFixed(2)) : null;
    
    // Pull any text bodies sent along with the form
    const { title, chapter_id } = req.body;

    // 3. SAFE DATABASE INSERT (Will match whatever order your table expects)
    // Adjust column names and order below to match your exact table structure if different!
    const [dbResult] = await db.execute(
      'INSERT INTO chapter_videos (chapter_id, title, video_url, cloudinary_id, file_size_mb) VALUES (?, ?, ?, ?, ?)',
      [
        chapter_id || null, 
        title || req.file.originalname, 
        videoUrl, 
        cloudinaryId, 
        size
      ]
    );

    res.status(201).json({ 
      message: 'Video uploaded successfully', 
      id: dbResult.insertId,
      url: videoUrl 
    });

  } catch (err) {
    console.error("❌ Chapter video upload crash:", err);
    res.status(500).json({ message: 'Video upload failed', error: err.message });
  }
};