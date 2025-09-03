const express = require('express');
const app = express();
const path = require('path')
const { spawn } = require('child_process');
const nodemailer = require('nodemailer');  // <--- this line was missing
require('dotenv').config();
const PORT = process.env.port || 3000 || 6000
const mongo = require('mongoose');
let admin = process.env.admin;
let AdminKey = process.env.AdminKey;

const { title } = require('process');

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'main.html'))
})
app.get('/topics', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'topics.html'))
})

app.get('/admin/panel', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'maker.html'))


})
app.get('/u/blog', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'blog.html'))


})
app.get('/u/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'))


})
app.post('/admin/login', (req, res) => {
    let { username, password } = req.body;

    console.log("Username:", username);
    console.log("Password:", password);

    if (password !== process.env.AdminKey) {
        console.log('❌ Wrong password');
        return res.status(404).json({ message: "Invalid username or password" });
    }

    console.log('✅ Login success');
    return res.status(200).json({ message: "Login successful" });
});


app.post('/api/hina-chat', (req, res) => {
  const userMessage = req.body.message;

  const pythonChild = spawn('python3', ['hina_child.py', userMessage], {
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

  // Kill child after 5 seconds if still running
  setTimeout(() => {
    pythonChild.kill('SIGTERM');
  }, 5000);
});
let mongo_connect = mongo.connect(process.env.URI || "mongodb://localhost:27017")

if (mongo_connect) {
    console.log('Db connected')
} else {
    console.log('db error')
}

let blogSchema = new mongo.Schema({
    title: String,
    content: String,
    image: String,
    createdAt: { type: Date, default: Date.now },
    summary: String
})



// POST route for contact form
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        // Transporter setup (example uses Gmail)
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'sourav2026resolution@gmail.com',   // your email
                pass: 'dntv fsyj ginj zqkl'      // use App Password, not normal password
            }
        });

        // Email options
        let mailOptions = {
            from: `"${name}" <${email}>`,
            to: 'sourav2026resolution@gmail.com',       // where you want to receive messages
            subject: 'New Contact Form Message',
            text: message,
            html: `<h3>Contact Form Submission</h3>
             <p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Message:</strong><br>${message}</p>`
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent:", { name, email, message });
        res.json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error("❌ Error sending email:", error);
        res.status(500).json({ success: false, message: 'Error sending email.' });
    }
});



const blog = mongo.model('blog', blogSchema)
app.post('/api/blog', (req, res) => {

    let blogData = req.body;
    let summaryB = blogData.summary;
    let titleB = blogData.title;
    let contentB = blogData.content;
    let imageB = blogData.image ? blogData.image : null;
    const newBlog = new blog({
        title: titleB,
        content: contentB,
        image: imageB ? imageB : "null",
        summary: summaryB
    })

    newBlog.save()
        .then(() => {
            console.log("✅ Blog saved")
            res.status(200).json({ msg: "ok" })
        })
        .catch(err => console.error("❌ Error saving blog:", err));





})
// Get blogs with pagination (only summary info for indexing)
app.get('/api/blogs', async (req, res) => {
    try {
        // Extract query params ?page=1&limit=10
        const page = parseInt(req.query.page) || 1;   // default page = 1
        const limit = parseInt(req.query.limit) || 10; // default 10 posts per request
        const skip = (page - 1) * limit;

        // Fetch only required blogs
        const blogs = await blog.find({}, {
            _id: 1,
            title: 1,
            summary: 1,
            createdAt: 1
        })
            .sort({ createdAt: -1 }) // newest first
            .skip(skip)
            .limit(limit);

        // Count total docs for frontend pagination
        const total = await blog.countDocuments();

        // Format response
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
        const singleBlog = await blog.findById(postID);

        if (!singleBlog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        res.json(singleBlog); // send whole blog object
    } catch (err) {
        console.error("❌ Error fetching blog:", err);
        res.status(500).json({ error: "Server error" });
    }
});
//redirects 
app.get('/aiova', (req, res) => {
    res.redirect('https://github.com/souravdpal/space_verse')


})
app.get('/improve', (req, res) => {
    res.redirect('https://github.com/souravdpal/improve')


})
app.get('/chat', (req, res) => {
    res.redirect('https://hina-ai.onrender.com')


})



app.listen(PORT, () => {
    console.log('http://127.0.0.1:3000')
})