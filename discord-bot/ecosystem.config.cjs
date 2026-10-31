module.exports = {
  apps: [
    {
      name: "metawellness-discord-bot",
      script: "index.mjs",
      cwd: __dirname,
      interpreter: "node",
      node_args: "--env-file-if-exists=.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: "300M",
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
