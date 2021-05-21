# World of Snek 🐍 Snake Battle Royale

#### With local play, LAN, online multiplayer, powerups and more

# Features

- Multiplayer version of Snake with Battle Royale elements
- Separate server and client to allow local, LAN and online multiplayer
- Shrinking area with configurable timeout speed and transition type
- Area shape and player shape can be circles or squares
- Allow or disable wrapping from one side of the area to the other
- Last snake crawling or longest snake to win the match
- Optional powerups to spice up the match
- Highly configurable server with interactive configuration

# How to play

- Connect to a server (see "Server configuration" on how to create one yourself)
- Open the configuration screen using "Escape"
- Add as many players as you want
- You will be part of the next match once that is started

# Server configuration

- Go to the server folder in any terminal
- `npm i && node start`

You can change the settings while running the server with interactive commands,
or use the command line arguments to configure them: `node start --help`.
By default, the client will also be hosted when starting the server,
for which the local ip addresses will be listed.

# Code structure

This project follows the crawling snake™ code structure.
To find the function or variable you are looking for,
you have to crawl through half of the code and back like a snake.
This code structure offers no advantages over other structures,
but it's the default option when hacking stuff together until it works.

`(in other words, there is no design, much like this readme actually)`

There is actually an eslint config included,
but even so the code is "riddled" with overcomplex and laughable code 🐍

# License

World of Snek is made by [Jelmer van Arnhem](https://github.com/Jelmerro) and [M4Y](https://github.com/M4Yt).
You can use and copy it under the terms of the GPL-3.0 or later,
see the [LICENSE](LICENSE) file for exact terms.

### Server dependencies

- [ws](https://github.com/websockets/ws)
- [minimist](https://github.com/substack/minimist)
- [colors](https://github.com/Marak/colors.js)

### Client dependencies

- [p5.js](https://github.com/processing/p5.js)
- [materialize](https://github.com/Dogfalo/materialize)
