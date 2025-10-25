// run: pm2 start ecosystem.config.js --env production|development --watch
module.exports = {
  apps: [
    {
      name: "api",
      instances: 1,
      script: "./src/index.js",
      watch: ["src/api", "src/services", "src/utils", "src/config.js"],
      ignore_watch: ["node_modules", "src/public"],
      watch_options: {
        followSymlinks: false
      },
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "development",
      }
    },
    {
      name: "queue",
      script: "./src/queue.js",
      // node_args: '-r dotenv/config',
      watch: ["src/services", "src/app"],
      // watch_delay: 1000,
      ignore_watch: ["node_modules", "src/public"],
      watch_options: {
        followSymlinks: false
      },
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "development",
      }
    },
    {
      name: "queue_multithread",
      script: "./src/queue_multithread.js",
      // node_args: '-r dotenv/config',
      watch: ["src/services", "src/app"],
      // watch_delay: 1000,
      ignore_watch: ["node_modules", "src/public"],
      watch_options: {
        followSymlinks: false
      },
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    },
    // {
    //   name: "socket",
    //   script: "./src/socket.js",
    //   // node_args: '-r dotenv/config',
    //   watch: ["src/services", "src/app"],
    //   // watch_delay: 1000,
    //   ignore_watch: ["node_modules", "src/public"],
    //   watch_options: {
    //     followSymlinks: false
    //   },
    //   env: {
    //     NODE_ENV: "development",
    //   },
    //   env_production: {
    //     NODE_ENV: "production",
    //   }
    // },
  ]
};
