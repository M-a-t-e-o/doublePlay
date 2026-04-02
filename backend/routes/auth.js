const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../module/user/user.model');

// Configure multer for profile pictures
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: JPEG, PNG, GIF, WebP'), false);
    }
  }
});

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function isStrongPassword(password) {
  return typeof password === 'string' && PASSWORD_REGEX.test(password);
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!email || !password || !(name || username)) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include one uppercase letter, one number and one symbol'
      });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name || username, email, password: hashed });

    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, name: user.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include one uppercase letter, one number and one symbol'
      });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.status(500).json({ message: 'Server error' });
  }
});

// Upload or update profile picture
router.post('/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = jwt.verify(token, process.env.JWT_SECRET);

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profilePicture.data = req.file.buffer;
    user.profilePicture.contentType = req.file.mimetype;
    await user.save();

    res.json({ message: 'Profile picture updated successfully' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('File too large') || err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 5MB limit' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get profile picture by user ID
router.get('/profile-picture/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.profilePicture.data) {
      return res.status(404).json({ message: 'Profile picture not found' });
    }

    res.contentType(user.profilePicture.contentType);
    res.send(user.profilePicture.data);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete profile picture
router.delete('/profile-picture', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.profilePicture.data) {
      return res.status(404).json({ message: 'Profile picture not found' });
    }

    user.profilePicture.data = null;
    user.profilePicture.contentType = null;
    await user.save();

    res.json({ message: 'Profile picture deleted successfully' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;