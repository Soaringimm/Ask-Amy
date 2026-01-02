# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Build args for Vite env vars (baked into bundle at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_HELP_CENTRE_URL
ARG VITE_HELP_CENTRE_TOKEN
ARG VITE_CAL_USERNAME
ARG VITE_CAL_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_HELP_CENTRE_URL=$VITE_HELP_CENTRE_URL
ENV VITE_HELP_CENTRE_TOKEN=$VITE_HELP_CENTRE_TOKEN
ENV VITE_CAL_USERNAME=$VITE_CAL_USERNAME
ENV VITE_CAL_API_KEY=$VITE_CAL_API_KEY

RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
