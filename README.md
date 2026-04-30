# NestJS GraphQL Starter

> Production-ready NestJS + GraphQL boilerplate with Domain-Driven Design,
> TypeORM, DataLoader (N+1 fix), and Docker support.

## 🚀 Features
- GraphQL API with strongly-typed schemas
- Domain-Driven module structure
- TypeORM with PostgreSQL
- DataLoader for batching (eliminates N+1 queries)
- JWT Authentication
- Docker + Docker Compose setup
- GitHub Actions CI/CD pipeline

## 🛠️ Tech Stack
NestJS · GraphQL · TypeORM · PostgreSQL · Docker · TypeScript · GitHub Actions

## 📦 Getting Started
```bash
# Clone and install
npm install

# Setup environment
cp .env.example .env

# Run with Docker
docker-compose up -d

# Start dev server
npm run start:dev
```

## 📁 Project Structure
```
src/
  modules/
    auth/
    users/
    finance/        ← example domain module
  common/
    decorators/
    filters/
    guards/
  config/
```

## ⚡ Performance
- DataLoader batching reduces N+1 queries
- Indexed Views for aggregation queries
- Response time optimized from ~7s → 1.2s on complex joins
