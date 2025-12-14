# Multi-stage Dockerfile for gqlgen POC
# Optimized for both development and production

# Stage 1: Development
FROM golang:1.21-alpine AS development

WORKDIR /app

# Install dependencies for development
RUN apk add --no-cache git wget

# Copy go module files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Run with hot reload (using air or manual)
CMD ["go", "run", "server.go"]

# Stage 2: Builder
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Copy go module files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -o /bin/server \
    server.go

# Stage 3: Production
FROM scratch

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy binary
COPY --from=builder /bin/server /server

# Copy schemas
COPY --from=builder /app/schemas /schemas

# Expose port
EXPOSE 8080

# Health check (note: scratch doesn't have shell, cf handles this)
# HEALTHCHECK not supported in scratch

# Run server
ENTRYPOINT ["/server"]
