World of Snek
=============

### Snake Battle Royale

# Features

- Multiplayer version of Snake with Battle Royale elements
- Separate server and client to allow local, LAN and online multiplayer
- Shrinking area with configurable timeout speed and transition type
- Area shape and player shape can be circles or squares
- Allow or disable wrapping from one side of the area to the other
- Last snake crawling or longest snake to win the match

## Planned

- Optional powerups to spice up the match

# How to play

- Connect to a server (see "Server configuration" on how to create one yourself)
- Open the configuration screen using "Escape"
- Add as many players as you want
- You will be part of the next match once that is started

# Server configuration

To start the server, simply run `node start` from the server folder.
You might need to install the dependencies first, using `npm install`.

There are many settings that can be changed for running a server,
including the area shrinking and the shapes used for the players and area.
For the full list of options, run `node start --help` in the server folder.

## License

World of Snek is made by [Jelmer van Arnhem](https://github.com/Jelmerro) and [M4Y](https://github.com/M4Yt).
You can use and copy it under the terms of the GPL-3.0 or later,
see the [LICENSE](LICENSE) file for exact terms.

### Server dependencies

- [ws](https://github.com/websockets/ws)
- [minimist](https://github.com/substack/minimist)
- [colors](https://github.com/Marak/colors.js)

### Client dependencies

- [p5.js](https://github.com/processing/p5.js)
- [materialize](https://github.com/Dogfalo/materialize).
