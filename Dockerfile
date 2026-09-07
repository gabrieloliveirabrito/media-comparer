# syntax=docker/dockerfile:1

FROM node:22-bookworm AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY ./scripts/ ./scripts/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_APP_VERSION=0.0.0
ARG VITE_IMAGE_VERSION=0.0.0
ARG VITE_SITE_URL=http://localhost
ARG VITE_AUTHOR_NAME=Gabriel Oliveira Brito
ARG VITE_TWITTER_SITE=
ARG VITE_TWITTER_CREATOR=
ARG STRIP_SOURCE_MAPS=true

ENV VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_IMAGE_VERSION=$VITE_IMAGE_VERSION \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_AUTHOR_NAME=$VITE_AUTHOR_NAME \
    VITE_TWITTER_SITE=$VITE_TWITTER_SITE \
    VITE_TWITTER_CREATOR=$VITE_TWITTER_CREATOR \
    STRIP_SOURCE_MAPS=$STRIP_SOURCE_MAPS

RUN pnpm build \
 && if [ "$STRIP_SOURCE_MAPS" = "true" ]; then find dist -name '*.map' -type f -delete; fi

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
