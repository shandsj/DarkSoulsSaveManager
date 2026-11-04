const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { initializeStorage } = require('../app/platform/storage');

test('creates per-user directories when no legacy data exists', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dssm-storage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = initializeStorage({ userDataPath: path.join(root, 'user-data') });
  assert.ok(fs.statSync(result.userDataPath).isDirectory());
  assert.ok(fs.statSync(result.savesPath).isDirectory());
  assert.equal(fs.existsSync(result.settingsPath), false);
});

test('migrates legacy settings and backups without deleting the originals', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dssm-migrate-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const legacy = path.join(root, 'legacy');
  const userData = path.join(root, 'user-data');
  fs.mkdirSync(path.join(legacy, 'saves'), { recursive: true });
  fs.writeFileSync(path.join(legacy, 'saves', 'slot.bak'), 'backup-data');
  fs.writeFileSync(path.join(legacy, 'settings.json'), JSON.stringify({
    settings: { saveDirectory: 'saves/' },
    saves: []
  }));

  const result = initializeStorage({ userDataPath: userData, legacyDirectory: legacy });
  const migrated = JSON.parse(fs.readFileSync(result.settingsPath, 'utf8'));
  assert.equal(migrated.settings.saveDirectory, result.savesPath);
  assert.equal(fs.readFileSync(path.join(result.savesPath, 'slot.bak'), 'utf8'), 'backup-data');
  assert.ok(fs.existsSync(path.join(legacy, 'settings.json')));
  assert.ok(fs.existsSync(path.join(legacy, 'saves', 'slot.bak')));
});

test('does not overwrite existing user settings or backups', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dssm-preserve-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const legacy = path.join(root, 'legacy');
  const userData = path.join(root, 'user-data');
  fs.mkdirSync(path.join(legacy, 'saves'), { recursive: true });
  fs.mkdirSync(path.join(userData, 'saves'), { recursive: true });
  fs.writeFileSync(path.join(legacy, 'saves', 'slot.bak'), 'old');
  fs.writeFileSync(path.join(userData, 'saves', 'slot.bak'), 'new');
  fs.writeFileSync(path.join(legacy, 'settings.json'), '{"legacy":true}');
  fs.writeFileSync(path.join(userData, 'settings.json'), '{"current":true}');

  const result = initializeStorage({ userDataPath: userData, legacyDirectory: legacy });
  assert.equal(fs.readFileSync(result.settingsPath, 'utf8'), '{"current":true}');
  assert.equal(fs.readFileSync(path.join(result.savesPath, 'slot.bak'), 'utf8'), 'new');
});
