FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && npx prisma generate
CMD ["/entrypoint.sh"]
