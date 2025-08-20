#!/bin/bash

# DukuAI Development Helper Script

set -e

command=${1:-help}

case $command in
    "start")
        echo "🚀 Starting development environment..."
        docker-compose up -d
        echo "✅ Services started!"
        echo "Frontend: http://localhost:3000"
        echo "Backend: http://localhost:8000"
        echo "API Docs: http://localhost:8000/docs"
        ;;
    
    "stop")
        echo "🛑 Stopping development environment..."
        docker-compose down
        echo "✅ Services stopped!"
        ;;
    
    "restart")
        echo "🔄 Restarting development environment..."
        docker-compose down
        docker-compose up -d
        echo "✅ Services restarted!"
        ;;
    
    "logs")
        service=${2:-all}
        if [ "$service" = "all" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f "$service"
        fi
        ;;
    
    "build")
        echo "🏗️  Building Docker images..."
        docker-compose build
        echo "✅ Build complete!"
        ;;
    
    "clean")
        echo "🧹 Cleaning up containers and volumes..."
        docker-compose down -v
        docker system prune -f
        echo "✅ Cleanup complete!"
        ;;
    
    "reset")
        echo "🔄 Resetting environment..."
        docker-compose down -v
        docker-compose build
        docker-compose up -d
        echo "✅ Environment reset complete!"
        ;;
    
    "test")
        service=${2:-backend}
        case $service in
            "backend")
                echo "🧪 Running backend tests..."
                docker-compose exec backend python -m pytest
                ;;
            "frontend")
                echo "🧪 Running frontend tests..."
                docker-compose exec frontend npm test -- --watchAll=false
                ;;
            *)
                echo "❌ Unknown test service: $service"
                echo "Available options: backend, frontend"
                ;;
        esac
        ;;
    
    "shell")
        service=${2:-backend}
        case $service in
            "backend")
                docker-compose exec backend bash
                ;;
            "frontend")
                docker-compose exec frontend sh
                ;;
            "db")
                docker-compose exec db psql -U dukuai_user -d dukuai_db
                ;;
            *)
                echo "❌ Unknown service: $service"
                echo "Available options: backend, frontend, db"
                ;;
        esac
        ;;
    
    "status")
        echo "📊 Service Status:"
        docker-compose ps
        echo ""
        echo "🏥 Health Checks:"
        
        # Check backend
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo "✅ Backend: Healthy"
        else
            echo "❌ Backend: Not responding"
        fi
        
        # Check frontend
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Frontend: Healthy"
        else
            echo "❌ Frontend: Not responding"
        fi
        
        # Check database
        if docker-compose exec -T db pg_isready -U dukuai_user -d dukuai_db > /dev/null 2>&1; then
            echo "✅ Database: Ready"
        else
            echo "❌ Database: Not ready"
        fi
        ;;
    
    "help"|*)
        echo "DukuAI Development Helper"
        echo ""
        echo "Usage: ./scripts/dev.sh <command> [options]"
        echo ""
        echo "Commands:"
        echo "  start              Start development environment"
        echo "  stop               Stop development environment"
        echo "  restart            Restart development environment"
        echo "  logs [service]     Show logs (default: all services)"
        echo "  build              Build Docker images"
        echo "  clean              Clean up containers and volumes"
        echo "  reset              Reset entire environment"
        echo "  test [service]     Run tests (backend|frontend)"
        echo "  shell [service]    Access service shell (backend|frontend|db)"
        echo "  status             Show service status and health"
        echo "  help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./scripts/dev.sh start"
        echo "  ./scripts/dev.sh logs backend"
        echo "  ./scripts/dev.sh test frontend"
        echo "  ./scripts/dev.sh shell db"
        ;;
esac
