# Tempo web app: Expo web export served by unprivileged nginx.
# Build:
#   docker build \
#     --build-arg EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
#     --build-arg EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
#     --build-arg EXPO_PUBLIC_API_GATEWAY_URL=https://api.example.com \
#     -t tempo-web .
# EXPO_PUBLIC_* values are compiled into the public bundle. Never pass a secret here.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG EXPO_PUBLIC_API_GATEWAY_URL=
ARG EXPO_PUBLIC_AUTH_PROVIDERS=
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    EXPO_PUBLIC_API_GATEWAY_URL=$EXPO_PUBLIC_API_GATEWAY_URL \
    EXPO_PUBLIC_AUTH_PROVIDERS=$EXPO_PUBLIC_AUTH_PROVIDERS \
    NODE_ENV=production
RUN test -n "$EXPO_PUBLIC_SUPABASE_URL" && test -n "$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
    || (echo "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY build args are required" && exit 1)
RUN npx expo export --platform web --output-dir dist

FROM nginxinc/nginx-unprivileged:1.29-alpine
ENV CSP_EXTRA_CONNECT_SRC=""
COPY deploy/web/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
