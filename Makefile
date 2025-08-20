# DukuAI Development Makefile

.PHONY: help build up down logs shell-backend shell-frontend test clean

# Default target
help:
	@echo "DukuAI Development Commands:"
	@echo ""
	@echo "  build          Build all Docker images"
	@echo "  up             Start all services"
	@echo "  down           Stop all services"
	@echo "  restart        Restart all services"
	@echo "  logs           Show logs for all services"
	@echo "  logs-backend   Show backend logs"
	@echo "  logs-frontend  Show frontend logs"
	@echo "  logs-db        Show database logs"
	@echo "  shell-backend  Access backend container shell"
	@echo "  shell-frontend Access frontend container shell"
	@echo "  shell-db       Access database container shell"
	@echo "  test-backend   Run backend tests"
	@echo "  test-frontend  Run frontend tests"
	@echo "  clean          Clean up containers and volumes"
	@echo "  reset          Reset everything (clean + build + up)"
	@echo ""

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# Restart all services
restart: down up

# Show logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f db

# Access container shells
shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

shell-db:
	docker-compose exec db psql -U dukuai_user -d dukuai_db

# Run tests
test-backend:
	docker-compose exec backend python -m pytest

test-frontend:
	docker-compose exec frontend npm test

# Clean up
clean:
	docker-compose down -v
	docker system prune -f

# Reset everything
reset: clean build up
	@echo "Application reset complete!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

# Development commands
dev-setup:
	@echo "Setting up development environment..."
	@cp environment.example .env
	@echo "Please edit .env file with your configuration"
	@echo "Then run: make build && make up"

# Database commands
db-migrate:
	docker-compose exec backend alembic upgrade head

db-reset:
	docker-compose exec backend alembic downgrade base
	docker-compose exec backend alembic upgrade head

# Monitoring
status:
	docker-compose ps

health:
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health || echo "Backend not responding"
	@curl -s http://localhost:3000 > /dev/null && echo "Frontend: OK" || echo "Frontend not responding"
