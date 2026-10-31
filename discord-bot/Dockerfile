# Build from the discord-bot folder:  docker build -t meta-bot discord-bot
# Run:  docker run -d --restart unless-stopped --env-file discord-bot/.env meta-bot
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY *.mjs ./

USER node
CMD ["node", "index.mjs"]
