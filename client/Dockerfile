FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
# Relax peer-dependency checks inside the container so React 19 works with react-quill
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine AS serve

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
