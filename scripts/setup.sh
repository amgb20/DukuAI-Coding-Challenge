#!/bin/bash

# DukuAI Development Setup Script

set -e

echo "🚀 Setting up DukuAI development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp environment.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please review and update the .env file with your specific configuration"
else
    echo "✅ Environment file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis

# Set permissions for data directories
chmod 755 data/postgres
chmod 755 data/redis

echo "✅ Directories created with proper permissions"

# Build Docker images
echo "🏗️  Building Docker images..."
docker-compose build

echo "✅ Docker images built successfully"

# Start services
echo "🔄 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check database
if docker-compose exec -T db pg_isready -U dukuai_user -d dukuai_db > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "❌ Database is not ready"
fi

# Check backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API is ready"
else
    echo "⏳ Backend API is starting up..."
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is ready"
else
    echo "⏳ Frontend is starting up..."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   Nginx:     http://localhost:80"
echo ""
echo "📋 Useful commands:"
echo "   View logs:           docker-compose logs -f"
echo "   Stop services:       docker-compose down"
echo "   Restart services:    docker-compose restart"
echo "   Backend shell:       docker-compose exec backend bash"
echo "   Frontend shell:      docker-compose exec frontend sh"
echo "   Database shell:      docker-compose exec db psql -U dukuai_user -d dukuai_db"
echo ""
echo "💡 For more commands, run: make help"
echo ""
echo "Happy coding! 🚀"
