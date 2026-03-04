FROM node:20-alpine

WORKDIR /app

# Copy dependency manifest and install production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy the rest of the server source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/server.js"]

