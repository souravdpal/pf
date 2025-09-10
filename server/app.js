const express = require('express');
const app = express();
const path = require('path');
const { spawn } = require('child_process');
const nodemailer = require('nodemailer');
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const mongo = require('mongoose');

const admin = process.env.ADMIN;
const AdminKey = process.env.ADMIN_KEY;

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'main.html'));
});

app.get('/topics', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'topics.html'));
});

app.get('/admin/panel', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'maker.html'));
});

app.get('/u/blog', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'blog.html'));
});

app.get('/u/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.post('/admin/login', (req, res) => {
    let { username, password } = req.body;

    console.log("Username:", username);
    console.log("Password:", password);

    if (password !== process.env.ADMIN_KEY) {
        console.log('❌ Wrong password');
        return res.status(404).json({ message: "Invalid username or password" });
    }

    console.log('✅ Login success');
    return res.status(200).json({ message: "Login successful" });
});

app.post('/api/hina-chat', (req, res) => {
    const userMessage = req.body.message;
    const visitor_id = req.body.key;

    const pythonChild = spawn('python3', ['child.py',visitor_id,userMessage], {
        env: { ...process.env, GROQ_API_KEY: process.env.GROQ_API_KEY }
    });

    let aiReply = '';

    pythonChild.stdout.on('data', (data) => {
        aiReply += data.toString();
    });

    pythonChild.stderr.on('data', (data) => {
        console.error('Python error:', data.toString());
    });

    pythonChild.on('close', () => {
        res.json({ reply: aiReply });
    });

    setTimeout(() => {
        pythonChild.kill('SIGTERM');
    }, 5000);
});

// MongoDB connection
mongo.connect(process.env.URI || "mongodb://localhost:27017")
    .then(() => console.log('Db connected'))
    .catch(err => console.error('db error:', err));

// Blog schema
const blogSchema = new mongo.Schema({
    title: String,
    content: String,
    image: String,
    createdAt: { type: Date, default: Date.now },
    summary: String
});

const Blog = mongo.model('blog', blogSchema);

// POST route for contact form
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let mailOptions = {
            from: `"${name}" <${email}>`,
            to: process.env.EMAIL_USER,
            subject: 'New Contact Form Message',
            text: message,
            html: `<h3>Contact Form Submission</h3>
                   <p><strong>Name:</strong> ${name}</p>
                   <p><strong>Email:</strong> ${email}</p>
                   <p><strong>Message:</strong><br>${message}</p>`
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent:", { name, email, message });
        res.json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error("❌ Error sending email:", error);
        res.status(500).json({ success: false, message: 'Error sending email.' });
    }
});

// POST route for blog
app.post('/api/blog', async (req, res) => {
    try {
        const { title, summary, content } = req.body;

        const newBlog = new Blog({
            title,
            content,
            image: null, // No featured image; images are embedded in content
            summary
        });

        await newBlog.save();
        console.log("✅ Blog saved");
        res.status(200).json({ msg: "Blog post created successfully" });
    } catch (err) {
        console.error("❌ Error saving blog:", err);
        res.status(500).json({ msg: "Error saving blog" });
    }
});

// Get blogs with pagination
app.get('/api/blogs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const blogs = await Blog.find({}, {
            _id: 1,
            title: 1,
            summary: 1,
            createdAt: 1
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments();

        const formatted = blogs.map(b => ({
            blogId: b._id,
            title: b.title,
            summary: b.summary,
            publishedOn: b.createdAt
        }));

        res.status(200).json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            blogs: formatted
        });
    } catch (err) {
        console.error("❌ Error fetching blogs:", err);
        res.status(500).json({ msg: "Error fetching blogs" });
    }
});

// GET a single blog by ID
app.get('/blog/:postID', async (req, res) => {
    try {
        const postID = req.params.postID;
        const singleBlog = await Blog.findById(postID);

        if (!singleBlog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        res.json(singleBlog);
    } catch (err) {
        console.error("❌ Error fetching blog:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Redirects
app.get('/aiova', (req, res) => {
    res.redirect('https://github.com/souravdpal/space_verse');
});

app.get('/improve', (req, res) => {
    res.redirect('https://github.com/souravdpal/improve');
});

app.get('/chat', (req, res) => {
    res.redirect('https://hina-ai.onrender.com');
});

app.listen(PORT, () => {
    console.log(`http://127.0.0.1:${PORT}`);
});