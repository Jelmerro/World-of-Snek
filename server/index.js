/*
* World of Snek - Snake Battle Royale
* Copyright (C) 2019 M4Yt
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
const SPEED = 10
const AREASIZE = 300
const INITIALLENGTH = 200
const INITIALSIZE = 20
const SHRINKTIMEOUT = 10000000000 // 10 seconds - in nanoseconds
const SHRINKSPEED = 10000000000 // 10 seconds - in nanoseconds
const READYCOUNTDOWN = 3000000000 // 3 seconds - in nanoseconds
const rotationToDirection = r => {
    if (Math.sin(r) > 0 && Math.sin(r) > Math.abs(Math.cos(r))) {
        return "down"
    } else if (Math.cos(r) > 0 && Math.cos(r) > Math.abs(Math.sin(r))) {
        return "left"
    } else if (Math.sin(r) < 0 && -Math.sin(r) > Math.abs(Math.cos(r))) {
        return "up"
    } else if (Math.cos(r) < 0 && -Math.cos(r) > Math.abs(Math.sin(r))) {
        return "right"
    }
    console.log("THIS SHOULDN'T HAPPEN! POSSIBLE TODO: FIX THE CHECKS ABOVE!")
    console.log("rotation value with an issue:", r)
    return ["down", "left", "up", "right"][Math.floor(Math.random) * 4]
}
const distance = (x, y, x2, y2) => {
    return Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2))
}
const checkOutOfBoundsAndWrap = (player, x, y, allowWrap=true) => {
    if (game.area.shape === "circle") {
        if (distance(x, y, game.area.current.x, game.area.current.y) > game.area.current.r) {
            if (game.wrap && allowWrap) {
                let newX = game.area.current.x + game.area.current.x - x
                let newY = game.area.current.y + game.area.current.y - y
                if (newX > 0) {
                    newX = newX - 1
                }
                if (newX < 0) {
                    newX = newX + 1
                }
                if (newY > 0) {
                    newY = newY - 1
                }
                if (newY < 0) {
                    newY = newY + 1
                }
                x = newX
                y = newY
            } else {
                player.alive = false
            }
        }
        return [x, y]
    }
    if (game.area.shape === "square") {
        const leftBorder = game.area.current.x - game.area.current.r
        const rightBorder = game.area.current.x + game.area.current.r
        const topBorder = game.area.current.y + game.area.current.r
        const bottomBorder = game.area.current.y - game.area.current.r
        if (game.wrap && allowWrap) {
            if (x < leftBorder) {
                x = x + game.area.current.r * 2 - 1
                if (player.shape === "square") {
                    player.direction = "left"
                }
            }
            if (x > rightBorder) {
                x = x - game.area.current.r * 2 + 1
                if (player.shape === "square") {
                    player.direction = "right"
                }
            }
            if (y > topBorder) {
                y = y - game.area.current.r * 2 + 1
                if (player.shape === "square") {
                    player.direction = "up"
                }
            }
            if (y < bottomBorder) {
                y = y + game.area.current.r * 2 - 1
                if (player.shape === "square") {
                    player.direction = "down"
                }
            }
        } else if (x < leftBorder || x > rightBorder || y > topBorder || y < bottomBorder) {
            player.alive = false
        }
        return [x, y]
    }
}
const checkForCollisions = (currentPlayer, x, y) => {
    for (const p of game.players) {
        if (!currentPlayer.alive) {
            break
        }
        for (const position of p.position) {
            if (currentPlayer.shape === "square") {
                if (p.shape === "square") {
                    //square, square
                    if (currentPlayer === p) {
                        let playerMovingX = x
                        let playerMovingY = y
                        if (p.direction === "up") {
                            playerMovingY += 20
                        }
                        if (p.direction === "down") {
                            playerMovingY -= 20
                        }
                        if (p.direction === "left") {
                            playerMovingX -= 20
                        }
                        if (p.direction === "right") {
                            playerMovingX += 20
                        }
                        if (Math.abs(playerMovingX - position[0]) < p.size && Math.abs(playerMovingY - position[1]) < p.size) {
                            p.alive = false
                            break
                        }
                    } else if (Math.abs(x - position[0]) < currentPlayer.size + p.size && Math.abs(y - position[1]) < currentPlayer.size + p.size) {
                        currentPlayer.alive = false
                        break
                    }
                }
                if (p.shape === "circle") {
                    //square, circle
                }
            }
            if (currentPlayer.shape === "circle") {
                if (p.shape === "square") {
                    //circle, square
                }
                if (p.shape === "circle") {
                    //circle, circle
                    if (currentPlayer === p) {
                        const playerMovingX = x + 20 * Math.cos(p.direction)
                        const playerMovingY = y + 20 * Math.sin(p.direction)
                        if (distance(playerMovingX, playerMovingY, position[0], position[1]) < p.size) {
                            p.alive = false
                            break
                        }
                    } else if (distance(x, y, position[0], position[1]) < p.size + currentPlayer.size) {
                        currentPlayer.alive = false
                        break
                    }
                }
            }
        }
    }
}
const possiblyEatFood = (player, x, y) => {
    const allFood = JSON.parse(JSON.stringify(game.food))
    for (const food of allFood) {
        if (distance(x, y, food.x, food.y) < player.size + food.r) {
            const pickedUp = game.food.filter(f => {
                return f.x === food.x && f.y === food.y
            })[0]
            game.food.splice(game.food.indexOf(pickedUp), 1)
            player.score += 1
            player.speed *= 1.1
            const appendLength = player.position.length * 1.2 - player.position.length
            const x = player.position[player.position.length - 1][0]
            const y = player.position[player.position.length - 1][1]
            for (let _ = 0;_ < appendLength;_++) {
                player.position.push([x, y])
            }
        }
    }
}
const movePlayerIfValid = (player, x, y) => {
    const [wrappedX, wrappedY] = checkOutOfBoundsAndWrap(player, x, y)
    checkForCollisions(player, x, y)
    possiblyEatFood(player, x, y)
    if (player.alive) {
        player.position.unshift([wrappedX, wrappedY])
        player.position.pop()
    }
}
const moveCircle = (player, pixels) => {
    if (typeof(player.direction) !== "number") {
        //TODO verify these numbers once they are actually used
        if (player.direction === "left") {
            player.direction = PI * 1.5
        } else if (player.direction === "right") {
            player.direction = PI * 0.5
        } else if (player.direction === "up") {
            player.direction = 0
        } else if (player.direction === "down") {
            player.direction = PI
        } else {
            player.direction = 0
        }
    }
    let cornerSpeed = 0.04
    if (player.powerups.includes("cornerup")) {
        cornerSpeed = 0.1
    }
    if (player.powerups.includes("cornerdown")) {
        cornerSpeed = 0.01
    }
    if (player.preferredMove === "left") {
        player.direction += cornerSpeed
    }
    if (player.preferredMove === "right") {
        player.direction -= cornerSpeed
    }
    const [originalX, originalY] = player.position[0]
    const newX = originalX + pixels * Math.cos(player.direction)
    const newY = originalY + pixels * Math.sin(player.direction)
    movePlayerIfValid(player, newX, newY)
}
const moveSquare = (player, pixels) => {
    if (["left", "right", "up", "down"].includes(player.preferredMove)) {
        if (player.direction === "left" && player.preferredMove !== "right") {
            player.direction = player.preferredMove
        }
        if (player.direction === "right" && player.preferredMove !== "left") {
            player.direction = player.preferredMove
        }
        if (player.direction === "up" && player.preferredMove !== "down") {
            player.direction = player.preferredMove
        }
        if (player.direction === "down" && player.preferredMove !== "up") {
            player.direction = player.preferredMove
        }
    } else if (!["left", "right", "up", "down"].includes(player.direction)) {
        player.direction = rotationToDirection(player.direction)
    }
    const [originalX, originalY] = player.position[0]
    let newX = originalX
    let newY = originalY
    if (player.direction === "left") {
        newX -= pixels
    }
    if (player.direction === "right") {
        newX += pixels
    }
    if (player.direction === "up") {
        newY += pixels
    }
    if (player.direction === "down") {
        newY -= pixels
    }
    movePlayerIfValid(player, newX, newY)
}
const generateNewArea = () => {
    const moveX = Math.random() / 5 * game.area.current.r * Math.cos(Math.random() * TAU)
    const moveY = Math.random() / 5 * game.area.current.r * Math.sin(Math.random() * TAU)
    game.area.new.x = game.area.current.x + moveX
    game.area.new.y = game.area.current.y + moveY
    game.area.new.r = game.area.current.r * 0.8
    if (game.settings.shrinkType === "random") {
        game.area.type = coinflip() ? "gradual" : "instant"
    } else {
        game.area.type = game.settings.shrinkType
    }
}
const shiftArea = () => {
    game.area.current = game.area.new
    game.area.new = {}
    for (const player of game.players) {
        if (game.state !== "game") {
            break
        }
        checkOutOfBoundsAndWrap(player, player.position[0][0], player.position[0][1], false)
    }
}
const updateFood = () => {
    let desiredFoodCount = 1
    if (game.settings.foodCount === "players") {
        desiredFoodCount = game.players.length
    }
    const leftBorder = game.area.current.x - game.area.current.r
    const rightBorder = game.area.current.x + game.area.current.r
    const topBorder = game.area.current.y + game.area.current.r
    const bottomBorder = game.area.current.y - game.area.current.r
    game.food = game.food.filter(f => {
        if (game.area.shape === "circle") {
            return distance(f.x, f.y, game.area.current.x, game.area.current.y) < game.area.current.r
        }
        if (game.area.shape === "square") {
            return f.x < rightBorder && f.x > leftBorder && f.y > bottomBorder && f.y < topBorder
        }
        return false
    })
    const foodRadius = 10
    while (desiredFoodCount > game.food.length) {
        let x = null
        let y = null
        let collision = true
        while (collision) {
            if (game.area.shape === "circle") {
                x = game.area.current.x + game.area.current.r * Math.cos(Math.random() * TAU)
                y = game.area.current.y + game.area.current.r * Math.sin(Math.random() * TAU)
            }
            if (game.area.shape === "square") {
                x = game.area.current.x + game.area.current.r * Math.random()
                y = game.area.current.x + game.area.current.r * Math.random()
            }
            collision = false
            for (const player of game.players) {
                for (const position of player.position) {
                    if (distance(x, y, position[0], position[1]) < player.size + foodRadius * 3) {
                        collision = true
                        break
                    }
                }
            }
        }
        game.food.push({
            x: x,
            y: y,
            r: foodRadius
        })
    }
}

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
    gamemode: "random", //random, lastalive, score
    port: 7635
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
if (args.gamemode && ["random", "lastalive", "score"].includes(String(args.gamemode))) {
    settings.gamemode = String(args.gamemode)
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
        current: {},
        new: {},
        time: 0,
        shape: null,
        type: null
    },
    powerups: [],
    food: [],
    lastwinner: null,
    lastalive: null,
    wrap: null
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
                powerups: [],
                wins: p.wins,
                speed: SPEED,
                score: 0
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
    game.countdown = READYCOUNTDOWN
    console.log("starting a new game with these players:", game.players)
    game.settings = JSON.parse(JSON.stringify(settings))
    if (game.settings.areaShape === "random") {
        game.settings.areaShape = coinflip() ? "circle" : "square"
    }
    game.area.shape = game.settings.areaShape
    if (game.settings.playerShape === "random") {
        game.settings.playerShape = coinflip() ? "circle" : "square"
    }
    if (game.settings.foodCount === "random") {
        game.settings.foodCount = coinflip() ? "1" : "players"
    }
    game.wrap = game.settings.wrap === "yes"
    if (game.settings.wrap === "random") {
        game.wrap = coinflip()
    }
    if (game.settings.gamemode === "random") {
        game.settings.gamemode = coinflip() ? "lastalive" : "score"
    }
    game.area.type = game.settings.shrinkType
    if (game.settings.shrinkType === "random") {
        game.area.type = coinflip() ? "gradual" : "instant"
    }
    game.powerups = []
    game.area.init.x = 0
    game.area.init.y = 0
    if (game.settings.areaShape === "random") {
        game.area.init.s = coinflip() ? "circle" : "square"
    }
    game.area.init.r = game.players.length * AREASIZE
    game.area.current = Object.assign({}, game.area.init)
    if (game.settings.playerShape === "circle") {
        game.players.forEach((p, index) => {
            const startRotation = TAU / game.players.length * index
            const x = 0.7 * game.area.init.r * Math.cos(startRotation)
            const y = 0.7 * game.area.init.r * Math.sin(startRotation)
            p.direction = startRotation + PI
            p.size = INITIALSIZE
            p.shape = "circle"
            p.position.push([x, y])
            for (let i = 1;i < INITIALLENGTH;i++) {
                p.position.push([x + (i * Math.cos(startRotation)), y + (i * Math.sin(startRotation))])
            }
        })
    }
    if (game.settings.playerShape === "square") {
        game.players.forEach((p, index) => {
            const startRotation = TAU / game.players.length * index
            const x = 0.7 * game.area.init.r * Math.cos(startRotation)
            const y = 0.7 * game.area.init.r * Math.sin(startRotation)
            p.direction = rotationToDirection(startRotation)
            p.size = INITIALSIZE
            p.shape = "square"
            p.position.push([x, y])
            for (let i = 1;i < INITIALLENGTH;i++) {
                if (rotationToDirection(startRotation + PI) === "left") {
                    p.position.push([x - i, y])
                }
                if (rotationToDirection(startRotation + PI) === "right") {
                    p.position.push([x + i, y])
                }
                if (rotationToDirection(startRotation + PI) === "up") {
                    p.position.push([x, y + i])
                }
                if (rotationToDirection(startRotation + PI) === "down") {
                    p.position.push([x, y - i])
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

const stopGame = () => {
    console.log("game has ended")
    game.countdown = 30000000000 // 30 seconds - in nanoseconds
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
        if (game.state === "ready") {
            console.log("the game is still starting")
        } else if (game.state === "game") {
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
                if (p.uuid === message.uuid.slice(0, 100)) {
                    return
                }
            }
        }
        console.log(`client ${clients[clientId].ip} added new player:`,
            message.uuid.slice(0, 100), message.name.slice(0, 100),
            message.color.slice(0, 100))
        clients[clientId].players.push({
            uuid: message.uuid.slice(0, 100),
            name: message.name.slice(0, 100),
            color: message.color.slice(0, 100),
            wins: 0
        })
    }
    if (message.type === "movement" && game.state === "game") {
        message.moves.slice(0, 100).forEach(move => {
            const playersWithCorrectUUID = game.players.filter(p => {
                return p.uuid === move.uuid.slice(0, 100)
            })
            const clientOwnsThisPlayer = clients[clientId].players.filter(p => {
                return p.uuid === move.uuid.slice(0, 100)
            }).length === 1
            if (playersWithCorrectUUID.length === 1 && clientOwnsThisPlayer) {
                const index = game.players.indexOf(playersWithCorrectUUID[0])
                game.players[index].preferredMove = move.dir.slice(0, 100)
            }
        })
    }
}
const announceWinner = player => {
    if (player) {
        clients.forEach(c => {
            const winners = c.players.filter(p => p.uuid === player.uuid)
            if (winners.length === 1) {
                winners[0].wins += 1
                game.lastwinner = winners[0]
                console.log("the winner is:", winners[0])
            } else {
                console.log("it's a draw")
                game.lastwinner = null
            }
        })
    } else {
        console.log("it's a draw")
        game.lastwinner = null
    }
}
const gameloop = delta => {
    if (game.state === "game") {
        const alivePlayers = game.players.filter(p => p.alive)
        if (game.settings.gamemode === "lastalive" && alivePlayers.length < 2) {
            announceWinner(alivePlayers[0])
            stopGame()
        }
        if (game.settings.gamemode === "score") {
            if (alivePlayers.length === 1) {
                game.lastalive = alivePlayers[0]
            } else if (alivePlayers.length === 0) {
                let highestScoringPlayers = game.players.sort((a, b) => {
                    return b.score - a.score
                })
                highestScoringPlayers = highestScoringPlayers.filter(p => {
                    return p.score === highestScoringPlayers[0].score
                })
                if (highestScoringPlayers.includes(game.lastalive)) {
                    announceWinner(game.lastalive)
                } else if (highestScoringPlayers.length === 1) {
                    announceWinner(highestScoringPlayers[0])
                } else {
                    console.log("it's a draw")
                    game.lastwinner = null
                }
                stopGame()
            }
        }
        game.players.forEach(p => {
            if (p.alive) {
                const pixels = delta / 100000000 * p.speed
                if (p.shape === "circle") {
                    moveCircle(p, pixels)
                }
                if (p.shape === "square") {
                    moveSquare(p, pixels)
                }
            }
        })
        game.area.time -= delta
        if (game.settings.shrinkTimeout !== "never") {
            if (game.area.time < 0) {
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
                    if (game.area.type === "gradual") {
                        game.area.new = {}
                    } else {
                        shiftArea()
                    }
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
            } else if (game.area.type === "gradual" && game.area.new.x) {
                const totalXDistance = game.area.new.x - game.area.current.x
                const speedX = totalXDistance / game.area.time * delta
                game.area.current.x += speedX
                const totalYDistance = game.area.new.y - game.area.current.y
                const speedY = totalYDistance / game.area.time * delta
                game.area.current.y += speedY
                const totalRDistance = game.area.new.r - game.area.current.r
                const speedR = totalRDistance / game.area.time * delta
                game.area.current.r += speedR
            }
        }
        updateFood()
    }
    if (game.state === "ready") {
        if (game.countdown < 0) {
            game.countdown = READYCOUNTDOWN
            game.state = "game"
        }
    }
    if (game.state === "lobby") {
        if (game.countdown < 0) {
            game.countdown = READYCOUNTDOWN
            startGame(true)
        }
    }
    game.countdown -= delta
}
const informClients = () => {
    if (game.state === "game" || game.state === "ready") {
        const filteredGame = Object.assign({}, game)
        filteredGame.settings = undefined
        if (game.state === "game") {
            filteredGame.countdown = undefined
        }
        clients.forEach(c => {
            if (c.socket) {
                c.socket.send(JSON.stringify(filteredGame))
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
                    countdown: game.countdown,
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
