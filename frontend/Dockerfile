# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# TailwindとViteを統合して起動（別プロセスのwatchを避ける）
CMD ["npm", "run", "dev"] 