FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci
COPY client ./client
COPY server ./server
RUN npm run build

FROM node:22-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY games.json steam.json rawg.json f95.json ./seed/
COPY deploy/entrypoint.sh /usr/local/bin/pafhub-entrypoint
RUN chmod 644 /usr/local/bin/pafhub-entrypoint
EXPOSE 3001
ENTRYPOINT ["/bin/sh", "/usr/local/bin/pafhub-entrypoint"]

FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
