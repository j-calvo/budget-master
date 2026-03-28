const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../prisma/dev.db');
const BACKUP_DIR = path.resolve(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

exports.createBackup = async (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Copy the database file
    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);

    res.json({
      message: 'Backup created successfully',
      backup: {
        name: backupName,
        size: stats.size,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Backup creation failed:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
};

exports.listBackups = async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json([]);
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: stats.size,
          createdAt: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(files);
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
};

exports.downloadBackup = async (req, res) => {
  try {
    const { name } = req.params;

    // Sanitize filename — prevent directory traversal
    const safeName = path.basename(name);
    if (!safeName.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid backup file' });
    }

    const backupPath = path.join(BACKUP_DIR, safeName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.download(backupPath, safeName);
  } catch (error) {
    console.error('Failed to download backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
};

exports.deleteBackup = async (req, res) => {
  try {
    const { name } = req.params;
    const safeName = path.basename(name);

    if (!safeName.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid backup file' });
    }

    const backupPath = path.join(BACKUP_DIR, safeName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    fs.unlinkSync(backupPath);
    res.json({ message: 'Backup deleted' });
  } catch (error) {
    console.error('Failed to delete backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const { name } = req.params;
    const safeName = path.basename(name);

    if (!safeName.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid backup file' });
    }

    const backupPath = path.join(BACKUP_DIR, safeName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Create a safety backup of current DB before restoring
    const safetyName = `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`;
    fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, safetyName));

    // Copy backup over current DB
    fs.copyFileSync(backupPath, DB_PATH);

    res.json({
      message: 'Database restored successfully. The server will need to be restarted.',
      safetyBackup: safetyName
    });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
};
