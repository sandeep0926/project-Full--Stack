FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY src ./src

RUN npm ci --only=production

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/server.js"]

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
