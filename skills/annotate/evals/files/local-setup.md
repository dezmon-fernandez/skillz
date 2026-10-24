# Run the app locally

This guide was first written last spring when we switched test runners, and it has been updated a few times since
then by different people as the setup changed.

## Before you start
You need Node 22 and npm 10. Use nvm so the version matches the repo.

1. Run `npm i` to install the dependencies.
2. Copy `.env.example` to `.env`.
3. Run `npm start` and open http://localhost:3000.

## Environment file

Ask a teammate for the values in `.env`. The app refuses to start without them.

## Troubleshooting

- If the install fails, delete `node_modules` and run `npm i` again.
- If the page is blank, check the browser console for errors.
