const prisma = require('../db');

const USER_ID = 'default-user-id';

exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: USER_ID },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id, userId: USER_ID }
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type, color } = req.body;
    
    // Ensure default user exists
    let user = await prisma.user.findUnique({ where: { id: USER_ID } });
    if (!user) {
      user = await prisma.user.create({
        data: { id: USER_ID, name: 'Default User' }
      });
    }

    const category = await prisma.category.create({
      data: {
        userId: USER_ID,
        name,
        type,
        color: color || '#3b82f6'
      }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, color } = req.body;
    const category = await prisma.category.update({
      where: { id, userId: USER_ID },
      data: { name, type, color }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({
      where: { id, userId: USER_ID }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
