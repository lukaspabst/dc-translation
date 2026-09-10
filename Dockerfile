FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
