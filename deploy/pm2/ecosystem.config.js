module.exports = {
  apps: [
    {
      name: 'printflow-web',
      cwd: '/home/printflow/print-platform/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 2, // 2 cluster workers corresponding to the 2 CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '900M', // Hard memory limit per worker for 4GB VPS bounds
      exp_backoff_restart_delay: 200,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/printflow/web-error.log',
      out_file: '/var/log/printflow/web-out.log',
      combine_logs: true,
    },
    {
      name: 'printflow-retention-worker',
      cwd: '/home/printflow/print-platform/background-worker',
      script: 'dist/retention-cleanup.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false, // Run on schedule (e.g., via cron or systemd timer)
      cron_restart: '0 2 * * *', // Daily execution at 02:00 AM UTC
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/printflow/worker-error.log',
      out_file: '/var/log/printflow/worker-out.log',
    },
  ],
};
