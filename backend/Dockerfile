FROM node:24-alpine

RUN apk add --no-cache dumb-init su-exec

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src
COPY docker/entrypoint.sh /usr/local/bin/portal-entrypoint
RUN chmod 0755 /usr/local/bin/portal-entrypoint \
  && mkdir -p /app/data \
  && chown -R node:node /app/data

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/portal-entrypoint"]
CMD ["node", "src/server.js"]
