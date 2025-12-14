#!/bin/bash

# Schema Unification Forest Development Environment Manager
# Unified script for managing Docker Compose deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
HASURA_COMPOSE_DIR="${PROJECT_ROOT}/dev/hasura-ddn"
HASURA_COMPOSE_FILE="${HASURA_COMPOSE_DIR}/compose.yaml"
HASURA_ENV_FILE="${HASURA_COMPOSE_DIR}/.env"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        print_error "docker-compose is not installed or not in PATH."
        exit 1
    fi
}

# Function to setup environment files
setup_environment() {
    print_info "Setting up environment files..."

    # Main docker-compose environment
    if [ ! -f "${PROJECT_ROOT}/.env" ]; then
        print_warning "No .env file found in project root. Some services may not start correctly."
        print_info "You can create one based on your needs (Keycloak, oauth2-proxy configuration)."
    fi

    # Hasura DDN environment
    if [ ! -f "${HASURA_ENV_FILE}" ]; then
        print_info "Creating default Hasura DDN environment file..."
        cat > "${HASURA_ENV_FILE}" << 'EOF'
# Hasura DDN Environment Configuration
# Copy this file and customize for your environment

# Database Configuration
POSTGRES_DB=localdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5441

# Hasura Configuration
HASURA_GRAPHQL_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/localdb
HASURA_GRAPHQL_METADATA_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_DEV_MODE=true
HASURA_GRAPHQL_ADMIN_SECRET=changeit
HASURA_GRAPHQL_CORS_DOMAIN=*
HASURA_GRAPHQL_ENABLED_LOG_TYPES=startup,http-log,webhook-log,websocket-log,query-log
HASURA_GRAPHQL_ENABLE_TELEMETRY=false

# Hasura Metadata Setup
HASURA_ENDPOINT=http://hasura:8080
HASURA_ADMIN_SECRET=changeit

# MV Refresher Configuration
MV_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/data_store_api
MV_REFRESH_INTERVAL=300

# pgAdmin Configuration (optional)
PGADMIN_DEFAULT_EMAIL=admin@local.dev
PGADMIN_DEFAULT_PASSWORD=admin
PGADMIN_PORT=5050
EOF
        print_success "Created ${HASURA_ENV_FILE}"
        print_warning "Please review and customize the environment variables in ${HASURA_ENV_FILE}"
    fi
}

# Function to start main application stack
start_main() {
    print_info "Starting main application stack..."

    cd "${PROJECT_ROOT}"

    # Check which profile to use
    if [ "$1" = "full-stack" ]; then
        print_info "Starting full-stack with authentication (Keycloak + oauth2-proxy)..."
        docker-compose --profile full-stack up -d
    elif [ "$1" = "frontend-only" ]; then
        print_info "Starting frontend-only services..."
        docker-compose --profile frontend-only up -d
    elif [ "$1" = "backend-only" ]; then
        print_info "Starting backend-only services (authentication)..."
        docker-compose --profile backend-only up -d
    else
        print_info "Starting all available services..."
        docker-compose up -d
    fi

    print_success "Main application stack started!"
    print_info "Services:"
    echo "  - Frontend (dev): http://localhost:3001"
    echo "  - Frontend (prod): http://localhost:8888"
    echo "  - Keycloak: http://localhost:8081"
    echo "  - oauth2-proxy: http://localhost:4180"
}

# Function to start Hasura DDN stack
start_hasura() {
    print_info "Starting Hasura DDN development stack..."

    cd "${HASURA_COMPOSE_DIR}"

    # Check if we should include tools
    if [ "$1" = "with-tools" ]; then
        print_info "Starting with development tools (pgAdmin)..."
        docker-compose --profile with-tools up -d
    else
        print_info "Starting core services only..."
        docker-compose --profile default up -d
    fi

    print_success "Hasura DDN stack started!"
    print_info "Services:"
    echo "  - Hasura Console: http://localhost:8080 (admin secret: changeit)"
    echo "  - PostgreSQL: localhost:5441 (user: postgres, pass: postgres)"
    if [ "$1" = "with-tools" ]; then
        echo "  - pgAdmin: http://localhost:5050 (admin@local.dev / admin)"
    fi
}

# Function to stop services
stop_services() {
    print_info "Stopping all services..."

    # Stop main stack
    if [ -f "${MAIN_COMPOSE_FILE}" ]; then
        cd "${PROJECT_ROOT}"
        docker-compose down
        print_success "Main application stack stopped."
    fi

    # Stop Hasura stack
    if [ -f "${HASURA_COMPOSE_FILE}" ]; then
        cd "${HASURA_COMPOSE_DIR}"
        docker-compose down
        print_success "Hasura DDN stack stopped."
    fi
}

# Function to show status
show_status() {
    print_info "Service Status:"

    echo ""
    print_info "Main Application Stack:"
    if [ -f "${MAIN_COMPOSE_FILE}" ]; then
        cd "${PROJECT_ROOT}"
        docker-compose ps
    else
        print_warning "No docker-compose.yml found in project root."
    fi

    echo ""
    print_info "Hasura DDN Stack:"
    if [ -f "${HASURA_COMPOSE_FILE}" ]; then
        cd "${HASURA_COMPOSE_DIR}"
        docker-compose ps
    else
        print_warning "No compose.yaml found in dev/hasura-ddn/."
    fi
}

# Function to show logs
show_logs() {
    if [ "$1" = "main" ]; then
        print_info "Showing main application logs..."
        cd "${PROJECT_ROOT}"
        docker-compose logs -f
    elif [ "$1" = "hasura" ]; then
        print_info "Showing Hasura DDN logs..."
        cd "${HASURA_COMPOSE_DIR}"
        docker-compose logs -f
    else
        print_error "Please specify 'main' or 'hasura' for logs."
        exit 1
    fi
}

# Function to clean up
cleanup() {
    print_info "Cleaning up containers, volumes, and networks..."

    # Clean main stack
    if [ -f "${MAIN_COMPOSE_FILE}" ]; then
        cd "${PROJECT_ROOT}"
        docker-compose down -v --remove-orphans
        print_success "Main application stack cleaned."
    fi

    # Clean Hasura stack
    if [ -f "${HASURA_COMPOSE_FILE}" ]; then
        cd "${HASURA_COMPOSE_DIR}"
        docker-compose down -v --remove-orphans
        print_success "Hasura DDN stack cleaned."
    fi

    # Remove unused Docker resources
    print_info "Removing unused Docker resources..."
    docker system prune -f
    print_success "Cleanup completed."
}

# Function to show help
show_help() {
    cat << EOF
Schema Unification Forest Development Environment Manager

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    setup           Setup environment files and prerequisites
    start-main      Start main application stack
                     Options: full-stack, frontend-only, backend-only
    start-hasura    Start Hasura DDN development stack
                     Options: with-tools (includes pgAdmin)
    stop            Stop all services
    status          Show status of all services
    logs            Show logs for services
                     Options: main, hasura
    cleanup         Clean up containers, volumes, and networks
    help            Show this help message

EXAMPLES:
    $0 setup
    $0 start-main full-stack
    $0 start-hasura with-tools
    $0 status
    $0 logs main
    $0 stop
    $0 cleanup

SERVICES:
    Main Application:
        - Frontend (dev): http://localhost:3001
        - Frontend (prod): http://localhost:8888
        - Keycloak: http://localhost:8081
        - oauth2-proxy: http://localhost:4180

    Hasura DDN:
        - Hasura Console: http://localhost:8080
        - PostgreSQL: localhost:5441
        - pgAdmin: http://localhost:5050 (when using with-tools)

EOF
}

# Main script logic
main() {
    check_docker
    check_docker_compose

    case "${1:-help}" in
        setup)
            setup_environment
            ;;
        start-main)
            start_main "$2"
            ;;
        start-hasura)
            start_hasura "$2"
            ;;
        stop)
            stop_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"