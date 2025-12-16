FROM node:20-slim

WORKDIR /app

# Install git for dependencies that might need it
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Default command to keep container running for exec
CMD ["tail", "-f", "/dev/null"]
