# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Build args for Vite env vars (baked into bundle at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_IRCC_API_URL
ARG VITE_IRCC_API_KEY
ARG VITE_CAL_USERNAME
ARG VITE_CAL_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_IRCC_API_URL=$VITE_IRCC_API_URL
ENV VITE_IRCC_API_KEY=$VITE_IRCC_API_KEY
ENV VITE_CAL_USERNAME=$VITE_CAL_USERNAME
ENV VITE_CAL_API_KEY=$VITE_CAL_API_KEY

RUN npm run build

# Production stage
FROM nginx:alpine

# Install envsubst (gettext package)
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Runtime environment variable for token
ENV SEARCH_SERVICE_TOKEN=""

EXPOSE 80

# Use envsubst to replace variables in nginx config at runtime
CMD ["/bin/sh", "-c", "envsubst '${SEARCH_SERVICE_TOKEN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
