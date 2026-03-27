const prisma = require('../db');

exports.getFamilyDetails = async (req, res) => {
  try {
    const family = await prisma.family.findUnique({
      where: { id: req.user.familyId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });
    res.json(family);
  } catch (error) {
    console.error('getFamilyDetails error:', error);
    res.status(500).json({ error: 'Failed to fetch family details' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Admins cannot remove themselves via this endpoint to avoid orphan families
    if (memberId === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    await prisma.familyMember.delete({
      where: { userId_familyId: { userId: memberId, familyId: req.user.familyId } }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('removeMember error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

exports.generateNewInviteCode = async (req, res) => {
  try {
    const newInviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const family = await prisma.family.update({
      where: { id: req.user.familyId },
      data: { inviteCode: newInviteCode }
    });
    res.json({ inviteCode: family.inviteCode });
  } catch (error) {
    console.error('generateNewInviteCode error:', error);
    res.status(500).json({ error: 'Failed to generate new invite code' });
  }
};
