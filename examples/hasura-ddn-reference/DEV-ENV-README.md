# Development Environment Manager

A unified script for managing Docker Compose deployments in the Schema Unification Forest project.

## Quick Start

```bash
# Setup environment (first time only)
./dev-env.sh setup

# Start full-stack development environment
./dev-env.sh start-main full-stack

# Start Hasura DDN development stack with tools
./dev-env.sh start-hasura with-tools

# Check status of all services
./dev-env.sh status

# Stop all services
./dev-env.sh stop
```

## Available Commands

### Setup

```bash
./dev-env.sh setup
```

- Creates necessary environment files
- Sets up default configurations for Hasura DDN

### Start Services

#### Main Application Stack

```bash
# Full stack with authentication
./dev-env.sh start-main full-stack

# Frontend only (development)
./dev-env.sh start-main frontend-only

# Backend only (authentication services)
./dev-env.sh start-main backend-only
```

#### Hasura DDN Stack

```bash
# Core services only
./dev-env.sh start-hasura

# With development tools (pgAdmin)
./dev-env.sh start-hasura with-tools
```

### Monitoring

```bash
# Check status of all services
./dev-env.sh status

# View logs for main application
./dev-env.sh logs main

# View logs for Hasura DDN
./dev-env.sh logs hasura
```

### Cleanup

```bash
# Stop all services
./dev-env.sh stop

# Clean up containers, volumes, and networks
./dev-env.sh cleanup
```

## Service URLs

### Main Application Stack

- **Frontend (dev)**: <http://localhost:3001>
- **Frontend (prod)**: <http://localhost:8888>
- **Keycloak**: <http://localhost:8081>
- **oauth2-proxy**: <http://localhost:4180>

### Hasura DDN Stack

- **Hasura Console**: <http://localhost:8080> (admin secret: `changeit`)
- **PostgreSQL**: localhost:5441 (user: `postgres`, pass: `postgres`)
- **pgAdmin**: <http://localhost:5050> (admin@local.dev / admin) - _when using `with-tools`_

## Environment Configuration

### Main Application

The main `docker-compose.yml` uses profiles to control which services start:

- `full-stack`: All services including authentication
- `frontend-only`: Just the JSON viewer frontend
- `backend-only`: Just authentication services (Keycloak, oauth2-proxy)

### Hasura DDN

Configuration is managed via `dev/hasura-ddn/.env`. Key variables:

- Database connection settings
- Hasura admin secret and console settings
- pgAdmin credentials (when using tools)
- Materialized view refresh intervals

## Troubleshooting

### Docker Issues

- Ensure Docker Desktop is running
- Check that ports 3001, 8080, 8081, 4180, 5050, 5441 are available

### Hasura DDN Issues

- The DDN CLI has compatibility issues with HML v2 format
- Use the Docker Compose setup for local development while CLI issues are resolved
- Check `dev/hasura-ddn/.env` for correct database URLs

### Environment Setup

- Run `./dev-env.sh setup` to create necessary environment files
- Customize `.env` files for your specific environment needs

## Development Workflow

1. **Initial Setup**: `./dev-env.sh setup`
2. **Start Services**: `./dev-env.sh start-main full-stack` and `./dev-env.sh start-hasura with-tools`
3. **Develop**: Make changes to code, hot-reload will work automatically
4. **Monitor**: Use `./dev-env.sh status` and `./dev-env.sh logs` as needed
5. **Clean Up**: `./dev-env.sh stop` when done

## Integration with CI/CD

This script is designed for local development. For production deployments:

- Use the individual `docker-compose.yml` files
- Configure environment variables appropriately
- Consider using Docker Swarm or Kubernetes for orchestration
