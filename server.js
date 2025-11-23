const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploads

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Data File
const DATA_FILE = path.join(__dirname, 'posts.json');

// Helper to read posts
const readPosts = () => {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
};

// Helper to write posts
const writePosts = (posts) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
};

// Routes

// GET /api/posts
app.get('/api/posts', (req, res) => {
    const posts = readPosts();
    res.json(posts);
});

// POST /api/posts
app.post('/api/posts', upload.single('media'), (req, res) => {
    try {
        const { text } = req.body;
        const file = req.file;

        const newPost = {
            id: Date.now(),
            text: text || '',
            media: file ? `uploads/${file.filename}` : null,
            mediaType: file ? getMediaType(file.mimetype) : null,
            originalName: file ? file.originalname : null,
            timestamp: new Date().toISOString()
        };

        const posts = readPosts();
        posts.unshift(newPost); // Add to top
        writePosts(posts);

        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error processing post:', error);
        res.status(500).send('Internal Server Error: ' + error.message);
    }
});

// Helper to determine media type
function getMediaType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'document';
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
