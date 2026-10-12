FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .

FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

USER nodeuser
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
