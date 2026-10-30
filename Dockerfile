# syntax=docker/dockerfile:1
FROM node:20-slim

WORKDIR /app

# Copy dependency specifications
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install --production

# Copy source files
COPY . .

ENV PORT=5050
EXPOSE 5050

CMD ["node", "backend/server.js"]
