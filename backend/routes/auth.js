const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../module/user/user.model');
const swaggerJsdoc = require('swagger-jsdoc');

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
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

function isStrongPassword(password) {
  return typeof password === 'string' && PASSWORD_REGEX.test(password);
}

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_REGEX.test(normalizeUsername(username));
}

function normalizeUsername(username) {
  return username.toLowerCase().trim();
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
}

function buildPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    hasProfilePicture: Boolean(user.profilePicture?.data)
  };
}

async function getAuthenticatedUser(req, res) {
  const token = getTokenFromRequest(req);

  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return null;
    }

    return user;
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
}


// Register
/**
 * @swagger
 *   /register:
 *     post:
 *       summary: Registrar un nuevo usuario
 *       tags: [Users]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - name
 *                 - username
 *                 - email
 *                 - password
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Juan Pérez"
 *                   description: Nombre completo del usuario (no tiene por qué ser único).
 *                 username:
 *                   type: string
 *                   example: "juanp88"
 *                   description: Nombre de usuario único. Solo letras minúsculas, números y guión bajo. Entre 3 y 30 caracteres.
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "usuario@ejemplo.com"
 *                 password:
 *                   type: string
 *                   format: password
 *                   example: "P@ssword123"
 *                   description: Mínimo 8 caracteres, una mayúscula, un número y un símbolo.
 *       responses:
 *         201:
 *           description: Usuario creado exitosamente
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: "User created"
 *                   userId:
 *                     type: string
 *                     example: "60d5ecb54f421b2d1c8e4e1a"
 *         400:
 *           description: Error de validación (campos faltantes, username inválido o en uso, contraseña débil, email en uso)
 *         500:
 *           description: Error interno del servidor
 */
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Name, username, email and password are required' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        message: 'Username must be 3–30 characters and contain only lowercase letters, numbers and underscores'
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include one uppercase letter, one number and one symbol'
      });
    }

    const normalizedUsername = normalizeUsername(username);

    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username: normalizedUsername })
    ]);

    if (emailExists)    return res.status(400).json({ message: 'Email already in use' });
    if (usernameExists) return res.status(400).json({ message: 'Username already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username: normalizedUsername,
      email,
      password: hashed
    });

    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@ejemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "P@ssword123"
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve el token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 name:
 *                   type: string
 *                   example: "Juan Pérez"
 *                 username:
 *                   type: string
 *                   example: "juanp88"
 *                 role:
 *                   type: string
 *                   enum: [user, admin]
 *                   example: "user"
 *       400:
 *         description: Credenciales inválidas (email o contraseña incorrectos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid credentials"
 *       403:
 *         description: Cuenta suspendida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Your account has been suspended"
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    // Ban check: verified identity but account is suspended
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been suspended' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, name: user.name, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
/**
 * @swagger
 * /change-password:
 *   post:
 *     summary: Cambiar la contraseña del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "OldPassword123!"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewPassword456!"
 *                 description: Mínimo 8 caracteres, una mayúscula, un número y un símbolo.
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       400:
 *         description: Error de validación (contraseña débil, campos faltantes o contraseña actual incorrecta)
 *       401:
 *         description: No autorizado (Token faltante, inválido o expirado)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await getAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include one uppercase letter, one number and one symbol'
      });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({
      message: 'Password updated successfully',
      user: buildPublicUser(user)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Change name
/**
 * @swagger
 * /change-name:
 *   post:
 *     summary: Cambiar el nombre del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Juan Pérez"
 *     responses:
 *       200:
 *         description: Nombre actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Name updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     hasProfilePicture:
 *                       type: boolean
 *       400:
 *         description: Error de validación o nombre faltante
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/change-name', async (req, res) => {
  try {
    const { name } = req.body;
    const user = await getAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedName) {
      return res.status(400).json({ message: 'Name is required' });
    }

    user.name = normalizedName;
    await user.save();

    return res.json({
      message: 'Name updated successfully',
      user: buildPublicUser(user)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Change username
/**
 * @swagger
 * /change-username:
 *   post:
 *     summary: Cambiar el nombre de usuario del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 example: "juanp88"
 *                 description: Nombre de usuario único. Solo letras minúsculas, números y guión bajo. Entre 3 y 30 caracteres.
 *     responses:
 *       200:
 *         description: Nombre de usuario actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Username updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     hasProfilePicture:
 *                       type: boolean
 *       400:
 *         description: Error de validación, username inválido o en uso
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/change-username', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await getAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        message: 'Username must be 3–30 characters and contain only lowercase letters, numbers and underscores'
      });
    }

    const normalizedUsername = normalizeUsername(username);
    const usernameExists = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });

    if (usernameExists) {
      return res.status(400).json({ message: 'Username already in use' });
    }

    user.username = normalizedUsername;
    await user.save();

    return res.json({
      message: 'Username updated successfully',
      user: buildPublicUser(user)
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Username already in use' });
    }

    return res.status(500).json({ message: 'Server error' });
  }
});

// Upload or update profile picture
/**
 * @swagger
 * /profile-picture:
 *   post:
 *     summary: Actualizar la foto de perfil del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: El archivo de imagen (Máximo 5MB)
 *     responses:
 *       200:
 *         description: Imagen de perfil actualizada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile picture updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     hasProfilePicture:
 *                       type: boolean
 *       400:
 *         description: Error en el archivo (no se envió archivo, formato inválido o demasiado grande)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File size exceeds 5MB limit"
 *       401:
 *         description: No autorizado (Token faltante o inválido)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Backward compatibility: legacy users may not have the nested field in stored documents.
    if (!user.profilePicture) {
      user.profilePicture = { data: null, contentType: null };
    }

    user.profilePicture.data = req.file.buffer;
    user.profilePicture.contentType = req.file.mimetype;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      user: buildPublicUser(user)
    });
  } catch (err) {
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
/**
 * @swagger
 * /profile-picture/{userId}:
 *   get:
 *     summary: Obtener la foto de perfil de un usuario
 *     tags: [Users]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: ID único del usuario
 *         schema:
 *           type: string
 *           example: "60d5ecb54f421b2d1c8e4e1a"
 *     responses:
 *       200:
 *         description: Imagen de perfil en formato binario
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Usuario no encontrado o el usuario no tiene foto de perfil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile picture not found"
 *       500:
 *         description: Error interno del servidor
 */
router.get('/profile-picture/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.profilePicture?.data) {
      return res.status(404).json({ message: 'Profile picture not found' });
    }

    res.contentType(user.profilePicture?.contentType || 'application/octet-stream');
    res.send(user.profilePicture.data);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete profile picture
/**
 * @swagger
 * /profile-picture:
 *   delete:
 *     summary: Eliminar la foto de perfil del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Foto de perfil eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile picture deleted successfully"
 *       401:
 *         description: No autorizado (Token faltante o inválido)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: Usuario no encontrado o no tiene foto de perfil para eliminar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile picture not found"
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/profile-picture', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    if (!user.profilePicture?.data) {
      return res.status(404).json({ message: 'Profile picture not found' });
    }

    if (!user.profilePicture) {
      user.profilePicture = { data: null, contentType: null };
    }

    user.profilePicture.data = null;
    user.profilePicture.contentType = null;
    await user.save();

    res.json({
      message: 'Profile picture deleted successfully',
      user: buildPublicUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;