module.exports = {
  apps: [
    {
      name: "metawellness-wa-listener",
      script: "index.mjs",
      cwd: __dirname,
      interpreter: "node",
      node_args: "--env-file-if-exists=.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 10000,
      max_restarts: 20,
      max_memory_restart: "400M",
      time: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
