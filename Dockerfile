# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build with environment variables passed as build args if needed, 
# but Vite env vars need to be present at build time.
# For Docker, we usually bake them in or load them at runtime via a script.
# For simplicity in this "speed prototype", we will rely on the .env file being copied 
# or args passed. 
# NOTE: Vite bakes VITE_ vars into the bundle at build time. 
# So we need to ensure .env is there or ARG are passed.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_IRCC_API_URL
ARG VITE_IRCC_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_IRCC_API_URL=$VITE_IRCC_API_URL
ENV VITE_IRCC_API_KEY=$VITE_IRCC_API_KEY

RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
