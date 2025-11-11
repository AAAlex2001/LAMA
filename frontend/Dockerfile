FROM node:20-alpine AS base

WORKDIR /app

# ----------------------------
# Install production dependencies
# ----------------------------
FROM base AS deps

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------
# Build application
# ----------------------------
FROM base AS builder

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ----------------------------
# Production image
# ----------------------------
FROM base AS runner

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]

