/*
* World of Snek - Snake Battle Royale
* Copyright (C) 2019 Jelmer van Arnhem
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict"

const args = require("minimist")(process.argv.slice(2))
const ws = require("ws")

// UTIL

const coinflip = (chance=0.5) => Math.random() < chance
const TAU = 2 * Math.PI
const PI = Math.PI
const SPEED = 5
const AREASIZE = 100
const INITIALLENGTH = 50
const INITIALSIZE = 20
const SHRINKTIMEOUT = 10000000000 // 10 seconds - in nanoseconds
const SHRINKSPEED = 10000000000 // 10 seconds - in nanoseconds

// SETTINGS

const defaultSetings = {
    maxPlayers: 69, //any integer above 0
    areaShape: "random", //random, circle, square
    wrap: "random", //random, yes, no
    playerShape: "random", //random, circle, square
    shrinkType: "random", //random, gradual, instant
    shrinkSpeed: "random", //random, fast, normal, slow
    shrinkTimeout: "random", //random, fast, normal, slow, never (not on random)
    powerupsRate: "random", //random, low, medium, high
    enabledPowerups: [
        "superspeed",
        "speedup",
        "speeddown",
        "cornerup",
        "cornerdown",
        "sizeup",
        "sizedown"
    ],
    powerupsDespawn: "random", //random, fast, slow, never (not on random)
    foodCount: "random", //random, 1, players
    port: 3000
}
const settings = JSON.parse(JSON.stringify(defaultSetings))
if (args.maxPlayers && Number(args.maxPlayers) > 1) {
    settings.maxPlayers = Number(args.maxPlayers)
}
if (args.areaShape && ["random", "circle", "square"].includes(String(args.areaShape))) {
    settings.areaShape = String(args.areaShape)
}
if (args.wrap && ["random", "yes", "no"].includes(String(args.wrap))) {
    settings.wrap = String(args.wrap)
}
if (args.playerShape && ["random", "circle", "square"].includes(String(args.playerShape))) {
    settings.playerShape = String(args.playerShape)
}
if (args.shrinkType && ["random", "gradual", "instant", "never"].includes(String(args.shrinkType))) {
    settings.shrinkType = String(args.shrinkType)
}
if (args.shrinkSpeed && ["random", "fast", "normal", "slow"].includes(String(args.shrinkSpeed))) {
    settings.shrinkSpeed = String(args.shrinkSpeed)
}
if (args.shrinkTimeout && ["random", "fast", "normal", "slow"].includes(String(args.shrinkTimeout))) {
    settings.shrinkTimeout = String(args.shrinkTimeout)
}
if (args.powerupsRate && ["random", "low", "medium", "high"].includes(String(args.powerupsRate))) {
    settings.powerupsRate = String(args.powerupsRate)
}
if (args.enabledPowerups && Array.isArray(args.enabledPowerups)) {
    settings.enabledPowerups = []
    for (const powerup of args.enabledPowerups) {
        if (defaultSetings.enabledPowerups.includes(powerup)) {
            if (!settings.enabledPowerups.includes(powerup)) {
                settings.enabledPowerups.push(powerup)
            }
        }
    }
}
if (args.powerupsDespawn && ["random", "fast", "slow", "never"].includes(String(args.powerupsDespawn))) {
    settings.powerupsDespawn = String(args.powerupsDespawn)
}
if (args.foodCount && ["random", "1", "players"].includes(String(args.foodCount))) {
    settings.foodCount = String(args.foodCount)
}
if (args.port && Number(args.port) > 0 && Number(args.port) < 100000) {
    settings.port = Number(args.port)
}

// INIT

const server = new ws.Server({
    port: settings.port
})
const clients = []
// game will be filled with proper data when starting a new game
const game = {
    state: "lobby",
    countdown: 30000000000, // 30 seconds - in nanoseconds
    players: [],
    area: {
        init: {},
        old: {},
        new: {},
        time: 0
    },
    powerups: [],
    lastwinner: null
}

// LOOPS & MAIN FUNCTIONS

const startGame = autotrigger => {
    game.players = []
    clients.forEach(c => {
        c.players.forEach(p => {
            game.players.push({
                uuid: p.uuid,
                name: p.name,
                color: p.color,
                direction: null,
                preferredMove: null,
                alive: true,
                position: [],
                powerups: []
            })
        })
    })
    if (game.players.length < 2) {
        if (autotrigger) {
            game.countdown = 30000000000 // 30 seconds - in nanoseconds
        } else {
            console.log("not enough players to start")
        }
        return
    }
    game.countdown = 1000000000 // 1 second - in nanoseconds
    console.log("starting a new game with these players:", game.players)
    game.settings = JSON.parse(JSON.stringify(settings))
    if (game.settings.areaShape === "random") {
        game.settings.areaShape = coinflip() ? "circle" : "square"
    }
    if (game.settings.playerShape === "random") {
        game.settings.playerShape = coinflip() ? "circle" : "square"
    }
    game.powerups = []
    game.area.init.x = 0
    game.area.init.y = 0
    game.area.init.s = game.settings.areaShape
    if (game.settings.areaShape === "random") {
        game.area.init.s = coinflip() ? "circle" : "square"
    }
    game.area.init.r = game.players.length * AREASIZE
    game.area.old = game.area.init
    if (game.settings.playerShape === "circle") {
        // radius 3 pixels per position, 30 default positions
        // start position depends on the number of players
        game.players.forEach((p, index) => {
            const startRotation = TAU / game.players.length * index
            const x = 0.8 * game.area.init.r * Math.cos(startRotation)
            const y = 0.8 * game.area.init.r * Math.sin(startRotation)
            p.direction = startRotation + PI
            p.size = INITIALSIZE
            p.position.push([x, y])
            for (let i = 0;i < INITIALLENGTH;i++) {
                const [oldX, oldY] = p.position[i]
                const newX = oldX + Math.cos(startRotation)
                const newY = oldY + Math.sin(startRotation)
                p.position.push([newX, newY])
            }
        })
    }
    if (game.settings.playerShape === "square") {
        game.players.forEach((p, index) => {
            const startRotation = TAU / game.players.length * index
            const x = 0.8 * game.area.init.r * Math.cos(startRotation)
            const y = 0.8 * game.area.init.r * Math.sin(startRotation)
            if (index / game.players.length < 0.25) {
                p.direction = "left"
            } else if (index / game.players.length < 0.5) {
                p.direction = "up"
            } else if (index / game.players.length < 0.75) {
                p.direction = "right"
            } else {
                p.direction = "down"
            }
            p.size = INITIALSIZE
            p.position.push([x, y])
            for (let i = 0;i < INITIALLENGTH;i++) {
                const [oldX, oldY] = p.position[i]
                if (p.direction === "left") {
                    p.position.push([oldX - 1, oldY])
                }
                if (p.direction === "right") {
                    p.position.push([oldX + 1, oldY])
                }
                if (p.direction === "up") {
                    p.position.push([oldX, oldY + 1])
                }
                if (p.direction === "down") {
                    p.position.push([oldX, oldY - 1])
                }
            }
        })
    }
    if (game.settings.shrinkTimeout !== "never") {
        let interval = SHRINKTIMEOUT
        if (game.settings.shrinkTimeout === "random") {
            if (coinflip(0.3)) {
                interval += SHRINKTIMEOUT
            }
            if (coinflip(0.3)) {
                interval += SHRINKTIMEOUT
            }
        } else if (game.settings.shrinkTimeout === "medium") {
            interval += SHRINKTIMEOUT
        } else if (game.settings.shrinkTimeout === "slow") {
            interval += SHRINKTIMEOUT * 2
        }
        game.area.time = interval
    }
    game.state = "ready"
}

const generateNewArea = () => {
    const moveX = Math.random() / 5 * game.area.old.r * Math.cos(Math.random() * TAU)
    const moveY = Math.random() / 5 * game.area.old.r * Math.sin(Math.random() * TAU)
    game.area.new.x = game.area.old.x + moveX
    game.area.new.y = game.area.old.y + moveY
    game.area.new.s = game.area.old.s
    game.area.new.r = game.area.old.r * 0.8
}

const shiftArea = () => {
    game.area.old = game.area.new
    game.area.new = {}
}

const stopGame = () => {
    console.log("game has ended")
    game.state = "lobby"
}

const processCLI = message => {
    if (message === "start") {
        if (game.state === "lobby") {
            startGame()
        } else {
            console.log("a game is already running")
        }
    } else if (message === "stop") {
        if (game.state === "game") {
            stopGame()
        } else {
            console.log("no game is running yet")
        }
    } else {
        console.log("unknown command")
    }
}
const processMessage = (clientId, message) => {
    if (message.type === "newplayer" && game.state === "lobby") {
        for (const c of clients) {
            for (const p of c.players) {
                if (p.uuid === message.uuid) {
                    return
                }
            }
        }
        console.log(`client ${clients[clientId].ip} added new player:`,
            message.uuid, message.name, message.color)
        clients[clientId].players.push({
            uuid: message.uuid,
            name: message.name,
            color: message.color,
            wins: 0
        })
    }
    if (message.type === "movement" && game.state === "game") {
        message.moves.forEach(move => {
            const playersWithCorrectUUID = game.players.filter(p => {
                return p.uuid === move.uuid
            })
            const clientOwnsThisPlayer = clients[clientId].players.filter(p => {
                return p.uuid === move.uuid
            }).length === 1
            if (playersWithCorrectUUID.length === 1 && clientOwnsThisPlayer) {
                const index = game.players.indexOf(playersWithCorrectUUID[0])
                game.players[index].preferredMove = move.dir
            }
        })
    }
}
const gameloop = delta => {
    if (game.state === "game") {
        const alivePlayers = game.players.filter(p => p.alive)
        if (alivePlayers.length < 2) {
            if (alivePlayers[0]) {
                clients.forEach(c => {
                    const winners = c.players.filter(p => p.uuid === alivePlayers[0].uuid)
                    if (winners.length === 1) {
                        console.log("the winner is:", winners[0])
                        winners[0].wins += 1
                        game.lastwinner = winners[0]
                    } else {
                        game.lastwinner = null
                    }
                })
            }
            game.state = "lobby"
        }
        game.players.forEach(p => {
            if (p.alive) {
                const pixels = delta / 100000000 * SPEED
                if (game.settings.playerShape === "circle") {
                    if (p.preferredMove === "left") {
                        p.direction -= 0.04
                    }
                    if (p.preferredMove === "right") {
                        p.direction += 0.04
                    }
                    for (let i = 0;i < pixels;i++) {
                        const [oldX, oldY] = p.position[0]
                        const newX = oldX + Math.cos(p.direction)
                        const newY = oldY + Math.sin(p.direction)
                        p.position.unshift([newX, newY])
                        p.position.pop()
                    }
                    const [oldX, oldY] = p.position[0]
                    const newX = oldX + pixels * Math.cos(p.direction)
                    const newY = oldY + pixels * Math.sin(p.direction)
                    p.position.unshift([newX, newY])
                    p.position.pop()
                }
                if (game.settings.playerShape === "square") {
                    if (["left", "right", "up", "down"].includes(p.preferredMove)) {
                        if (p.direction === "left" && p.preferredMove !== "right") {
                            p.direction = p.preferredMove
                        }
                        if (p.direction === "right" && p.preferredMove !== "left") {
                            p.direction = p.preferredMove
                        }
                        if (p.direction === "up" && p.preferredMove !== "down") {
                            p.direction = p.preferredMove
                        }
                        if (p.direction === "down" && p.preferredMove !== "up") {
                            p.direction = p.preferredMove
                        }
                    }
                    for (let i = 0;i < pixels;i++) {
                        const [oldX, oldY] = p.position[0]
                        if (p.direction === "left") {
                            p.position.unshift([oldX - 1, oldY])
                        }
                        if (p.direction === "right") {
                            p.position.unshift([oldX + 1, oldY])
                        }
                        if (p.direction === "up") {
                            p.position.unshift([oldX, oldY - 1])
                        }
                        if (p.direction === "down") {
                            p.position.unshift([oldX, oldY + 1])
                        }
                        p.position.pop()
                    }
                }
            }
        })
        game.area.time -= delta
        if (game.area.time < 0 && game.settings.shrinkTimeout !== "never") {
            if (game.area.new.x) {
                let interval = SHRINKTIMEOUT
                if (game.settings.shrinkTimeout === "random") {
                    if (coinflip(0.3)) {
                        interval += SHRINKTIMEOUT
                    }
                    if (coinflip(0.3)) {
                        interval += SHRINKTIMEOUT
                    }
                } else if (game.settings.shrinkTimeout === "medium") {
                    interval += SHRINKTIMEOUT
                } else if (game.settings.shrinkTimeout === "slow") {
                    interval += SHRINKTIMEOUT * 2
                }
                game.area.time = interval
                shiftArea()
            } else {
                let interval = SHRINKSPEED
                if (game.settings.shrinkSpeed === "random") {
                    if (coinflip(0.3)) {
                        interval += SHRINKSPEED
                    }
                    if (coinflip(0.3)) {
                        interval += SHRINKSPEED
                    }
                } else if (game.settings.shrinkSpeed === "medium") {
                    interval += SHRINKSPEED
                } else if (game.settings.shrinkSpeed === "slow") {
                    interval += SHRINKSPEED * 2
                }
                game.area.time = interval
                generateNewArea()
            }
        }
    }
    if (game.state === "ready") {
        game.countdown -= delta
        if (game.countdown < 0) {
            game.countdown = 1000000000 // 1 second - in nanoseconds
            game.state === "game"
        }
    }
    if (game.state === "lobby") {
        game.countdown -= delta
        if (game.countdown < 0) {
            game.countdown = 1000000000 // 1 second - in nanoseconds
            startGame(true)
        }
    }
}
const informClients = () => {
    if (game.state === "game" || game.state === "ready") {
        clients.forEach(c => {
            if (c.socket) {
                c.socket.send(JSON.stringify(game))
            }
        })
    }
    if (game.state === "lobby") {
        const players = []
        clients.forEach(c => {
            c.players.forEach(p => {
                players.push(p)
            })
        })
        clients.forEach(c => {
            if (c.socket) {
                c.socket.send(JSON.stringify({
                    state: "lobby",
                    players: players,
                    lastwinner: game.lastwinner
                }))
            }
        })
    }
}

// OTHER

server.on("connection", (client, req) => {
    const clientId = clients.length
    console.log("new client connected:", req.connection.remoteAddress)
    clients.push({
        players: [],
        socket: client,
        ip: req.connection.remoteAddress
    })
    client.on("message", msg => {
        try {
            // check if the message is json and contains a body type
            const message = JSON.parse(msg)
            if (message.type && typeof message.type === "string") {
                processMessage(clientId, message)
            }
        } catch (e) {
            // no action required
        }
    })
    client.on("close", () => {
        console.log("client disconnected:", req.connection.remoteAddress)
        game.players.forEach(gp => {
            clients[clientId].players.forEach(cp => {
                if (gp.uuid === cp.uuid) {
                    gp.alive = false
                }
            })
        })
        clients[clientId].players = []
        clients[clientId].socket = null
    })
})
process.openStdin().addListener("data", d => {
    processCLI(d.toString().trim())
})
let lasttimer = process.hrtime()
const timer = () => {
    // calculate delta
    const [seconds, nanoseconds] = process.hrtime(lasttimer)
    lasttimer = process.hrtime()
    const delta = seconds * 1000000000 + nanoseconds
    // call gameloop
    gameloop(delta)
}
setInterval(informClients, 10)
setInterval(timer, 10)
