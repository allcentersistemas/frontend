FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_BUILD_MODE=production
RUN npm run build -- --mode ${VITE_BUILD_MODE}

FROM nginx:1.27-alpine
# Producción (Caddy): nginx.static.conf — sin proxy API
# Docker local sin Caddy: config/nginx.conf — proxy /api-system y /api-biesse
ARG NGINX_CONF=config/nginx.static.conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
