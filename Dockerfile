# Alapértelmezett Node.js image
FROM node:14

# Munka könyvtár létrehozása és beállítása
WORKDIR /app

# package.json és package-lock.json másolása
COPY package*.json ./

# Függőségek telepítése
RUN npm install

# Alkalmazás kód másolása
COPY . .

# Alkalmazás futtatása
CMD ["npm", "start"]
