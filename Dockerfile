# Alap kép kiválasztása, amely tartalmazza a legújabb Node.js verziót
FROM node:20-alpine

# Alkalmazás könyvtár létrehozása
WORKDIR /app

# Függőségek telepítéséhez szükséges fájlok másolása
COPY package.json ./

# npm frissítése a legújabb verzióra
RUN npm install -g npm@10.8.2

# Függőségek telepítése
RUN npm install

# Sérülékenységek javítása
RUN npm audit fix --force

# Alkalmazás fájlok másolása
COPY . .

# Alkalmazás futtatása
CMD ["npm", "start"]
