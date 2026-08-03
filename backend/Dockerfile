FROM node:24-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src

ENV NODE_ENV=production
EXPOSE 3000

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
