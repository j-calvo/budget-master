const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const { seedFamilyData } = require('../utils/seeder');

exports.register = async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let familyId;
    let role;

    // Use transaction to ensure both user and family setup happens atomically
    const result = await prisma.$transaction(async (tx) => {
      if (inviteCode) {
        // Join existing family
        const family = await tx.family.findUnique({ where: { inviteCode } });
        if (!family) {
          throw new Error('Invalid invite code');
        }
        familyId = family.id;
        role = 'MEMBER'; // the invite defaults to MEMBER. Owner is ADMIN
      } else {
        // Create new family
        const newInviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const family = await tx.family.create({
          data: {
            name: `${name}'s Family`,
            inviteCode: newInviteCode,
            settings: {
              create: { language: 'es', defaultCurrency: 'CRC', theme: 'light' }
            }
          }
        });
        familyId = family.id;
        role = 'ADMIN';

        // Seed default data for the NEW family
        await seedFamilyData(tx, familyId);
      }

      const user = await tx.user.create({
        data: { name, email, password: hashedPassword }
      });

      await tx.familyMember.create({
        data: { userId: user.id, familyId, role }
      });

      return { user, familyId, role };
    });

    // Generate JWT
    const token = jwt.sign(
      { id: result.user.id, email: result.user.email, familyId: result.familyId, role: result.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.role, familyId: result.familyId } });
  } catch (error) {
    if (error.message === 'Invalid invite code') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { familyMembers: true }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.familyMembers.length === 0) {
      return res.status(403).json({ error: 'User does not belong to any family account' });
    }

    const membership = user.familyMembers[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, familyId: membership.familyId, role: membership.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: membership.role, familyId: membership.familyId } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
