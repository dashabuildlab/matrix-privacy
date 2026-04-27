FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx expo export --platform web

RUN npm install -g serve

EXPOSE 3005

CMD ["serve", "dist", "-l", "3005", "-s"]
