/**
 * routes/friends.js
 *
 * Define los endpoints relacionados con la gestión de amistades entre usuarios.
 *
 * Permite buscar usuarios, enviar solicitudes de amistad, aceptar solicitudes,
 * cancelar o rechazar solicitudes pendientes, eliminar amistades existentes y
 * consultar tanto la lista de amigos como las solicitudes recibidas y enviadas.
 *
 * Todas las rutas de este módulo requieren autenticación mediante JWT.
 */
const router = require('express').Router();
const mongoose = require('mongoose');
const Friendship = require('../module/user/friendship.model');
const User = require('../module/user/user.model');
const { authRequired } = require('../middleware/auth');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authRequired);

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find an existing friendship document between two users regardless of
 * who is sender and who is receiver.
 */
function findFriendship(userA, userB) {
  return Friendship.findOne({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA }
    ]
  });
}

// ─── Search users by name or username to send friend request ────────────────
// GET /api/friends/search?query=ser
// Matches against both the full name (non-unique) and the unique username

/**
 * @swagger
 * /friends/search:
 *   get:
 *     summary: Buscar usuarios para enviar solicitud de amistad
 *     description: Busca usuarios por nombre o username, excluyendo al usuario autenticado y usuarios con relación pendiente o aceptada.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         description: Texto de búsqueda por nombre o username. Debe tener al menos 2 caracteres.
 *         schema:
 *           type: string
 *           example: ser
 *     responses:
 *       200:
 *         description: Lista de usuarios encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PublicUser'
 *       400:
 *         description: Parámetro query ausente o demasiado corto
 *       401:
 *         description: Token ausente o inválido
 *       500:
 *         description: Error interno del servidor
 */

router.get('/search', async (req, res) => {
  try {
    const currentUserId = req.userId;
    const rawQuery = req.query.query;

    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return res.status(400).json({ message: 'Query parameter "query" is required' });
    }

    const search = rawQuery.trim();

    if (search.length < 2) {
      return res.status(400).json({ message: 'Search must contain at least 2 characters' });
    }

    const escapedSearch = escapeRegex(search);

    const relatedFriendships = await Friendship.find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId }
      ],
      status: { $in: ['pending', 'accepted'] }
    }).select('sender receiver');

    const excludedUserIds = new Set([String(currentUserId)]);

    for (const friendship of relatedFriendships) {
      const senderId = String(friendship.sender);
      const receiverId = String(friendship.receiver);

      if (senderId !== String(currentUserId)) excludedUserIds.add(senderId);
      if (receiverId !== String(currentUserId)) excludedUserIds.add(receiverId);
    }

    // Search by full name OR unique username
    const users = await User.find({
      _id: { $nin: Array.from(excludedUserIds) },
      $or: [
        { name:     { $regex: escapedSearch, $options: 'i' } },
        { username: { $regex: escapedSearch, $options: 'i' } }
      ]
    })
      .select('_id name username profilePicture')
      .sort({ name: 1 })
      .limit(20);

    const result = users.map(user => ({
      id:             user._id,
      name:           user.name,
      username:       user.username,
      profilePicture: user.profilePicture
    }));

    res.json(result);
  } catch (err) {
    logger.error('Error searching users', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Send friend request ─────────────────────────────────────────────────────
// POST /api/friends/request/:userId

/**
 * @swagger
 * /friends/request/{userId}:
 *   post:
 *     summary: Enviar solicitud de amistad
 *     description: Envía una solicitud de amistad al usuario indicado. Si existe una solicitud pendiente inversa, se acepta automáticamente.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: ID del usuario destinatario.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1a
 *     responses:
 *       201:
 *         description: Solicitud enviada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Friend request sent
 *                 friendship:
 *                   $ref: '#/components/schemas/Friendship'
 *       200:
 *         description: Solicitud inversa encontrada y amistad aceptada automáticamente
 *       400:
 *         description: ID inválido, solicitud duplicada o intento de solicitud a uno mismo
 *       401:
 *         description: Token ausente o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */

router.post('/request/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const senderId = req.userId;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (userId === senderId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await findFriendship(senderId, userId);
    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user' });
      }
      // pending in either direction
      if (String(existing.sender) === senderId) {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      // The other user already sent a request to us — auto-accept
      existing.status = 'accepted';
      await existing.save();
      return res.json({ message: 'Friend request accepted (mutual request found)', friendship: existing });
    }

    const friendship = await Friendship.create({ sender: senderId, receiver: userId });
    res.status(201).json({ message: 'Friend request sent', friendship });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Accept friend request ───────────────────────────────────────────────────
// PUT /api/friends/accept/:requestId

/**
 * @swagger
 * /friends/accept/{requestId}:
 *   put:
 *     summary: Aceptar una solicitud de amistad
 *     description: Acepta una solicitud pendiente. Solo el usuario receptor puede aceptar la solicitud.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: requestId
 *         in: path
 *         required: true
 *         description: ID de la solicitud de amistad.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1d
 *     responses:
 *       200:
 *         description: Solicitud aceptada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Friend request accepted
 *                 friendship:
 *                   $ref: '#/components/schemas/Friendship'
 *       400:
 *         description: ID inválido o solicitud ya aceptada
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: El usuario autenticado no puede aceptar esta solicitud
 *       404:
 *         description: Solicitud no encontrada
 *       500:
 *         description: Error interno del servidor
 */

router.put('/accept/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const friendship = await Friendship.findById(requestId);
    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Only the receiver can accept
    if (String(friendship.receiver) !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (friendship.status === 'accepted') {
      return res.status(400).json({ message: 'Friend request already accepted' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ message: 'Friend request accepted', friendship });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Reject / cancel a pending request ──────────────────────────────────────
// DELETE /api/friends/request/:requestId
// Both the sender (cancel) and the receiver (reject) can use this endpoint

/**
 * @swagger
 * /friends/request/{requestId}:
 *   delete:
 *     summary: Cancelar o rechazar una solicitud de amistad
 *     description: Permite al emisor cancelar una solicitud pendiente o al receptor rechazarla.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: requestId
 *         in: path
 *         required: true
 *         description: ID de la solicitud de amistad.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1d
 *     responses:
 *       200:
 *         description: Solicitud cancelada o rechazada correctamente
 *       400:
 *         description: ID inválido o solicitud ya aceptada
 *       401:
 *         description: Token ausente o inválido
 *       403:
 *         description: El usuario autenticado no participa en la solicitud
 *       404:
 *         description: Solicitud no encontrada
 *       500:
 *         description: Error interno del servidor
 */

router.delete('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const friendship = await Friendship.findById(requestId);
    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    const isSender   = String(friendship.sender)   === userId;
    const isReceiver = String(friendship.receiver) === userId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (friendship.status === 'accepted') {
      return res.status(400).json({ message: 'Cannot reject an already accepted friendship. Use DELETE /api/friends/:userId instead' });
    }

    await friendship.deleteOne();
    res.json({ message: isSender ? 'Friend request cancelled' : 'Friend request rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Remove a friend ─────────────────────────────────────────────────────────
// DELETE /api/friends/:userId

/**
 * @swagger
 * /friends/{userId}:
 *   delete:
 *     summary: Eliminar una amistad
 *     description: Elimina la relación de amistad aceptada entre el usuario autenticado y el usuario indicado.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: ID del amigo a eliminar.
 *         schema:
 *           type: string
 *           example: 60d5ecb54f421b2d1c8e4e1a
 *     responses:
 *       200:
 *         description: Amistad eliminada correctamente
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token ausente o inválido
 *       404:
 *         description: Amistad no encontrada
 *       500:
 *         description: Error interno del servidor
 */

router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.userId;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const friendship = await findFriendship(currentUser, userId);
    if (!friendship || friendship.status !== 'accepted') {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    await friendship.deleteOne();
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── List accepted friends ───────────────────────────────────────────────────
// GET /api/friends

/**
 * @swagger
 * /friends:
 *   get:
 *     summary: Listar amigos aceptados
 *     description: Devuelve la lista de amistades aceptadas del usuario autenticado.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de amigos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   friendshipId:
 *                     type: string
 *                   since:
 *                     type: string
 *                     format: date-time
 *                   user:
 *                     $ref: '#/components/schemas/PublicUser'
 *       401:
 *         description: Token ausente o inválido
 *       500:
 *         description: Error interno del servidor
 */

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const friendships = await Friendship.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: 'accepted'
    }).populate('sender', 'name username profilePicture')
      .populate('receiver', 'name username profilePicture');

    // Return the friend (the other side of the relationship)
    const friends = friendships.map(f => {
      const isSender = String(f.sender._id) === userId;
      return {
        friendshipId: f._id,
        since: f.updatedAt,
        user: isSender ? f.receiver : f.sender
      };
    });

    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Pending requests received ───────────────────────────────────────────────
// GET /api/friends/requests/received

/**
 * @swagger
 * /friends/requests/received:
 *   get:
 *     summary: Listar solicitudes de amistad recibidas
 *     description: Devuelve las solicitudes pendientes recibidas por el usuario autenticado.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solicitudes recibidas pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Friendship'
 *       401:
 *         description: Token ausente o inválido
 *       500:
 *         description: Error interno del servidor
 */

router.get('/requests/received', async (req, res) => {
  try {
    const requests = await Friendship.find({
      receiver: req.userId,
      status: 'pending'
    }).populate('sender', 'name username profilePicture');

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Pending requests sent ───────────────────────────────────────────────────
// GET /api/friends/requests/sent

/**
 * @swagger
 * /friends/requests/sent:
 *   get:
 *     summary: Listar solicitudes de amistad enviadas
 *     description: Devuelve las solicitudes pendientes enviadas por el usuario autenticado.
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solicitudes enviadas pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Friendship'
 *       401:
 *         description: Token ausente o inválido
 *       500:
 *         description: Error interno del servidor
 */

router.get('/requests/sent', async (req, res) => {
  try {
    const requests = await Friendship.find({
      sender: req.userId,
      status: 'pending'
    }).populate('receiver', 'name username email profilePicture');

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;