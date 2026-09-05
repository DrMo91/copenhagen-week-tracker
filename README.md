# Copenhagen Weekly Tracker

A responsive ISO week tracker covering week 36 of 2026 through week 34 of 2027.
Completed weeks are marked automatically at 00:00 Monday in
Europe/Copenhagen. The browser synchronizes with the app server every
15 minutes and falls back to device time if the server cannot be reached.

## Run with Docker Compose

    docker compose up -d --build

Open http://localhost:3000.

## Run with Docker

    docker build -t copenhagen-week-tracker .
    docker run -d --name copenhagen-week-tracker \
      --restart unless-stopped \
      -p 3000:3000 \
      -e TZ=Europe/Copenhagen \
      copenhagen-week-tracker

## Run without Docker

Node.js 22.13 or newer is required.

    npm run install:ci
    npm run build
    npm run start -- --host 0.0.0.0

The server or Docker host should have normal NTP clock synchronization enabled.
