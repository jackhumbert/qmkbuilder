# Keyboard Firmware Builder

## Setup

To set up the project for development, run `npm install` in the root of the project to install dependencies.

Create a `local.json` file in `src/const`, in the format:

    {
		"API": "URL to server /build route",
		"PRESETS": "URL to static/presets folder"
	}

With the default setup, you can use this:

    {
        "API": "http://localhost:5004/build",
        "PRESETS": "http://localhost:8000/presets/"
    }

## Compiling

To compile, run `npm run build`. 

`npm run serve-front` will serve the frontend at http://localhost:8000, and `npm run serve-back` will run the backend at http://localhost:5004 - both are required (two separate terminals).

## Deploying

To deploy a production version of the application, run `npm run deploy`.
