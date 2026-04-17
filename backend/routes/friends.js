const router = require('express').Router();
const mongoose = require('mongoose');
const Friendship = require('../module/user/friendship.model');
const User = require('../module/user/user.model');
const { authRequired } = require('../middleware/auth');

// All routes require authentication
router.use(authRequired);

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
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

// ─── Send friend request ─────────────────────────────────────────────────────
// POST /api/friends/request/:userId
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
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const friendships = await Friendship.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: 'accepted'
    }).populate('sender', 'name')
      .populate('receiver', 'name');

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
router.get('/requests/received', async (req, res) => {
  try {
    const requests = await Friendship.find({
      receiver: req.userId,
      status: 'pending'
    }).populate('sender', 'name');

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Pending requests sent ───────────────────────────────────────────────────
// GET /api/friends/requests/sent
router.get('/requests/sent', async (req, res) => {
  try {
    const requests = await Friendship.find({
      sender: req.userId,
      status: 'pending'
    }).populate('receiver', 'name email profilePicture');

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;