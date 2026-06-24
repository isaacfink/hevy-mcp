FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production || bun install --production

FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run as the non-root user that the oven/bun image ships with.
USER bun
EXPOSE 3000

# Healthcheck hits the unauthenticated /health endpoint using Bun (always present).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "--eval", "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["bun", "run", "src/index.ts"]
