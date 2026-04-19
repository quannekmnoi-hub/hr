const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const appDir = path.join(__dirname, 'candidate-manager')

if (!fs.existsSync(appDir)) {
  console.error(`[launcher] Missing app directory: ${appDir}`)
  process.exit(1)
}

const isBuild = process.argv.includes('--build')
const runScript = isBuild ? 'build' : 'dev'
const child = process.platform === 'win32'
  ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run ${runScript}`], {
      cwd: appDir,
      stdio: 'inherit',
      shell: false,
    })
  : spawn('npm', ['run', runScript], {
      cwd: appDir,
      stdio: 'inherit',
      shell: false,
    })

child.on('error', (error) => {
  console.error('[launcher] Failed to start app:', error.message)
  process.exit(1)
})

child.on('close', (code) => {
  process.exit(code ?? 0)
})
