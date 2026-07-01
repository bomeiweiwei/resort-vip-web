FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_PROXY_API
ARG VITE_GOOGLE_MAPS_API_KEY

ENV VITE_PROXY_API=$VITE_PROXY_API
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_USE_MOCK=false

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

EXPOSE 80

ENV BACKEND_URL=http://host.docker.internal:8001

CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
