FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_APP_URL=http://panel.ogtasis.com
ARG VITE_LANDING_URL=http://ogtasis.com
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_LANDING_URL=$VITE_LANDING_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
