# Stage 1: Build the React Application
FROM node:18-alpine AS builder

# Install git so we can pull the latest branch from GitHub
RUN apk add --no-cache git

WORKDIR /app

# Clone the repository directly from the frontend branch
RUN git clone -b frontend https://github.com/Kr1sh-gupta/OpticRetail.git .

# Install dependencies and build
RUN npm install
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine

# Copy the built static files to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 inside the container
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
