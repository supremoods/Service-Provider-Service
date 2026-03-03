FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# Install dependencies in a dedicated stage
FROM base AS deps
COPY package.json ./
RUN bun install

# Build / prepare stage (copy source)
FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Production image: copy only prod node_modules and source
FROM oven/bun:1-alpine AS release
WORKDIR /usr/src/app

# Copy only production node_modules to keep image lean
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app .

USER bun
EXPOSE 5000
ENTRYPOINT ["bun", "run", "index.ts"]