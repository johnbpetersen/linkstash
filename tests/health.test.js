const fs = require('fs');
const path = require('path');

describe('Health Check', () => {
  const projectRoot = path.join(__dirname, '..');

  test('package.json exists and has required fields', () => {
    const packagePath = path.join(projectRoot, 'package.json');
    expect(fs.existsSync(packagePath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(packageJson.name).toBe('linkstash');
    expect(packageJson.description).toBeTruthy();
    expect(packageJson.main).toBe('process.js');
    expect(packageJson.scripts.test).toMatch(/jest/);
    expect(packageJson.scripts.dev).toBeTruthy();
    expect(packageJson.dependencies).toHaveProperty('node-fetch');
    expect(packageJson.dependencies).toHaveProperty('cheerio');
    expect(packageJson.dependencies).toHaveProperty('uuid');
    expect(packageJson.devDependencies).toHaveProperty('jest');
  });

  test('all required files exist', () => {
    const requiredFiles = [
      'process.js',
      'index.html',
      'links.json',
      'input.txt'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('Node version is >= 16', () => {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    expect(majorVersion).toBeGreaterThanOrEqual(16);
  });
});
