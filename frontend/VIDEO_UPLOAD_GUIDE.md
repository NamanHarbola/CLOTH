# Video Upload Guide for LUXE3D

## 🚨 Important: File Size Limits

Due to browser localStorage limitations, the current system has these limits:
- **Images**: Max 10MB
- **Videos**: Max 5MB

**Why?** localStorage can only store 5-10MB total, and files are converted to base64 (increases size by ~33%).

---

## 📹 How to Compress Your Video

### Option 1: Online Tools (Easiest)
1. **CloudConvert** (https://cloudconvert.com/mp4-converter)
   - Upload your video
   - Set quality to "Medium" or "Low"
   - Download compressed version

2. **FreeConvert** (https://www.freeconvert.com/video-compressor)
   - Upload video
   - Choose target size (e.g., 4MB)
   - Download

3. **Clideo** (https://clideo.com/compress-video)
   - Drag and drop video
   - Automatic compression
   - Download result

### Option 2: HandBrake (Desktop App - Best Quality)
1. Download HandBrake: https://handbrake.fr/
2. Open your video file
3. Settings:
   - **Preset**: "Fast 480p30" or "Fast 720p30"
   - **Video Codec**: H.264
   - **Quality**: RF 28-30 (higher = smaller file)
   - **Frame Rate**: 30 fps
4. Click "Start Encode"
5. Result should be under 5MB

### Option 3: FFmpeg (Command Line - Most Control)

**Compress to under 5MB:**
```bash
ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset fast -vf "scale=1280:720" -an output.mp4
```

**For even smaller files:**
```bash
ffmpeg -i input.mp4 -vcodec libx264 -crf 35 -preset fast -vf "scale=854:480" -b:a 64k output.mp4
```

**Parameters Explained:**
- `-crf 28-35`: Quality (higher = smaller file)
- `-vf "scale=1280:720"`: Resolution (lower = smaller)
- `-preset fast`: Encoding speed
- `-an`: Remove audio (reduces size significantly)
- `-b:a 64k`: Audio bitrate (if keeping audio)

### Option 4: Adobe Premiere / Final Cut Pro
1. Export Settings:
   - Format: H.264
   - Resolution: 1280x720 or 1920x1080
   - Bitrate: 2-3 Mbps
   - Frame Rate: 30 fps
2. Export and check file size

---

## 💡 Tips for Smaller Video Files

### 1. Reduce Resolution
- **Full HD**: 1920x1080 (largest)
- **HD**: 1280x720 (recommended)
- **SD**: 854x480 (smallest, still good)

### 2. Reduce Duration
- Keep hero videos under 15 seconds
- Loop creates the effect of longer video
- Shorter = much smaller file size

### 3. Remove Audio
- Hero videos don't need sound (muted by default)
- Audio can be 30-50% of file size
- Use `-an` flag in FFmpeg

### 4. Reduce Frame Rate
- 60fps → 30fps = 50% smaller
- 30fps is smooth enough for hero videos

### 5. Increase Compression
- CRF 23 = High quality, larger file
- CRF 28 = Good quality, medium file
- CRF 35 = Lower quality, small file

---

## 📊 Recommended Video Specs for Hero

**Optimal Settings:**
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1280x720 or 1920x1080
- **Duration**: 10-15 seconds
- **Frame Rate**: 30 fps
- **Audio**: None (remove it)
- **Bitrate**: 2-3 Mbps
- **Target Size**: 3-5 MB

**Example FFmpeg Command:**
```bash
ffmpeg -i input.mp4 \
  -vcodec libx264 \
  -crf 28 \
  -preset fast \
  -vf "scale=1280:720" \
  -r 30 \
  -t 15 \
  -an \
  hero-compressed.mp4
```

---

## 🚀 Production Solution

**Current**: localStorage (5-10MB limit)
**For Production**: Use backend file storage

### Recommended Implementation:

1. **Backend API Endpoint:**
```javascript
POST /api/upload/hero
- Accepts multipart/form-data
- Stores file in cloud storage (AWS S3, Cloudinary, etc.)
- Returns public URL
- No size limit (within reason)
```

2. **Frontend Update:**
```javascript
const handleHeroUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload/hero', {
    method: 'POST',
    body: formData
  });
  
  const { url } = await response.json();
  
  // Save URL to database (not localStorage)
  await saveHeroContent({ type: 'video', url });
};
```

3. **Cloud Storage Options:**
- **AWS S3**: Cheap, reliable, unlimited storage
- **Cloudinary**: Automatic optimization, CDN
- **DigitalOcean Spaces**: Simple, affordable
- **Vercel Blob**: Easy integration if using Vercel

### Cloudinary Example (Recommended):
```javascript
// Backend
const cloudinary = require('cloudinary').v2;

app.post('/api/upload/hero', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto',
      folder: 'hero',
      transformation: [
        { width: 1920, height: 1080, crop: 'fill' },
        { quality: 'auto:good' }
      ]
    });
    
    res.json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

**Benefits:**
- No file size limits
- Automatic optimization
- CDN delivery (faster)
- Video transcoding
- Multiple formats (WebM, MP4, etc.)

---

## 🎬 Quick Reference

**Current System (localStorage):**
✅ Works immediately, no backend needed
✅ Good for images and short videos
❌ 5MB limit for videos
❌ 10MB limit for images
❌ Data stored in browser only

**Production System (Backend + Cloud):**
✅ No practical size limits
✅ Automatic optimization
✅ CDN delivery (faster loading)
✅ Works across all browsers/devices
⚠️ Requires backend development
⚠️ Monthly cloud storage costs (~$5-20/month)

---

## 📝 Checklist for Uploading Video

- [ ] Video is under 5MB
- [ ] Resolution is 720p or 1080p
- [ ] Duration is 10-15 seconds
- [ ] Format is MP4
- [ ] Audio is removed (optional but recommended)
- [ ] File has been tested locally
- [ ] Compressed using one of the methods above

---

## 🆘 Troubleshooting

**Error: "File too large"**
- Compress video using methods above
- Target 3-4MB for best results

**Error: "QuotaExceededError"**
- File is too large even after compression
- Try lower resolution (720p → 480p)
- Reduce duration (30s → 15s)
- Remove audio completely

**Video doesn't play**
- Ensure format is MP4 with H.264 codec
- Try re-encoding with FFmpeg
- Check browser console for errors

**Video is blurry**
- Increase bitrate (2-3 Mbps minimum)
- Use higher resolution source
- Reduce compression (lower CRF value)

---

## 📧 Need Help?

If you're having trouble compressing your video:
1. Check the file size with `ls -lh filename.mp4`
2. Use HandBrake with "Fast 720p30" preset
3. If still too large, use FFmpeg command above
4. For production, implement backend storage (recommended)

**For Production Backend:** See `/app/frontend/PRODUCTION_READY.md` for full implementation guide.
