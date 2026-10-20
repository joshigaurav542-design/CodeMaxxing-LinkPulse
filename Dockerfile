FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install dependencies needed during build
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "run", "start"]
