module.exports = {
  apps: [{
    name: 'sleepcore-bot',
    script: 'dist/bot/index.js',
    cwd: '/opt/sleepcore',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/sleepcore/error.log',
    out_file: '/var/log/sleepcore/out.log',
    merge_logs: true,
    time: true
  }]
};
