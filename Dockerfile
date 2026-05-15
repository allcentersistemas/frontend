FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_BUILD_MODE=production
RUN npm run build -- --mode ${VITE_BUILD_MODE}

FROM nginx:1.27-alpine
# Producción: Caddy enruta APIs; nginx solo sirve la SPA
COPY config/nginx.static.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
