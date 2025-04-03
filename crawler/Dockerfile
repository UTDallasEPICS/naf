# Use a Node.js base image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Google Chrome and ChromeDriver
RUN apt-get update && apt-get install -y wget curl unzip \
    && wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo 'deb [signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main' | tee /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y google-chrome-stable \
    && curl -sS -o /tmp/chromedriver.zip https://chromedriver.storage.googleapis.com/$(curl -sS https://chromedriver.storage.googleapis.com/LATEST_RELEASE)/chromedriver_linux64.zip \
    && unzip /tmp/chromedriver.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/chromedriver

# Copy rest of the app files
# COPY . .

# Build TypeScript
# RUN npm run build

# Start the application
CMD ["npm", "run", "start"]
