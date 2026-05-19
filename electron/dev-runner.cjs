const { spawn } = require('child_process');
const http = require('http');
const electronPath = require('electron');

const port = Number(process.env.PORT || 3000);
const appUrl = `http://localhost:${port}`;
const petUrl = process.env.MIAO_DESKTOP_DEV_URL || `${appUrl}/desktop-pet`;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tick, 500);
      });
      req.setTimeout(1200, () => {
        req.destroy();
      });
    };
    tick();
  });
}

const server = spawn(npmCommand, ['run', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
  },
});

let desktop = null;

waitForServer(appUrl)
  .then(() => {
    desktop = spawn(electronPath, ['electron/main.cjs'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        MIAO_APP_URL: appUrl,
        MIAO_DESKTOP_DEV_URL: petUrl,
      },
    });
    desktop.on('exit', (code) => {
      server.kill();
      process.exit(code || 0);
    });
  })
  .catch((error) => {
    console.error(error);
    server.kill();
    process.exit(1);
  });

function shutdown() {
  if (desktop) desktop.kill();
  server.kill();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
