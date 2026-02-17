FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server.js .
# Run as non-root user to limit blast radius if exploited
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3100
CMD ["node", "server.js"]
