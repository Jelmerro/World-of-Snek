/*
* World of Snek - Snake Battle Royale
* Copyright (C) 2019-2020 Jelmer van Arnhem
* Copyright (C) 2019 M4Yt
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

const os = require("os")
const args = require("minimist")(process.argv.slice(2))
const ws = require("ws")
require("colors")

const www = require("./www")

// UTIL

const coinflip = (chance = 0.5) => Math.random() < chance
const TAU = 2 * Math.PI
const PI = Math.PI
const SPEED = 10
const AREASIZE = 300
const INITIALLENGTH = 200
const SHRINKTIMEOUT = 10000000000 // 10 seconds - in nanoseconds
const SHRINKSPEED = 10000000000 // 10 seconds - in nanoseconds
const READYCOUNTDOWN = 3000000000 // 3 seconds - in nanoseconds
const LOBBYCOUNTDOWN = 10000000000 // 10 seconds - in nanoseconds
const FOODRADIUS = 10
const POWERUPRADIUS = 20
const PLAYERRADIUS = 20
const rotationToDirection = r => {
    if (Math.sin(r) > 0 && Math.sin(r) > Math.abs(Math.cos(r))) {
        return "up"
    } else if (Math.cos(r) > 0 && Math.cos(r) > Math.abs(Math.sin(r))) {
        return "right"
    } else if (Math.sin(r) < 0 && -Math.sin(r) > Math.abs(Math.cos(r))) {
        return "down"
    } else if (Math.cos(r) < 0 && -Math.cos(r) > Math.abs(Math.sin(r))) {
        return "left"
    }
}
const distance = (x, y, x2, y2) => {
    return Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2))
}
const checkOutOfBoundsAndWrap = (player, x, y, allowWrap = true) => {
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
                if (currentPlayerShape(player) === "square") {
                    player.direction = "left"
                }
            }
            if (x > rightBorder) {
                x = x - game.area.current.r * 2 + 1
                if (currentPlayerShape(player) === "square") {
                    player.direction = "right"
                }
            }
            if (y > topBorder) {
                y = y - game.area.current.r * 2 + 1
                if (currentPlayerShape(player) === "square") {
                    player.direction = "up"
                }
            }
            if (y < bottomBorder) {
                y = y + game.area.current.r * 2 - 1
                if (currentPlayerShape(player) === "square") {
                    player.direction = "down"
                }
            }
        } else if (x < leftBorder || x > rightBorder || y > topBorder || y < bottomBorder) {
            player.alive = false
        }
        return [x, y]
    }
}
const currentPlayerShape = player => {
    if (Object.keys(player.powerups).includes("flipshape")) {
        return player.shape === "square" ? "circle" : "square"
    }
    return player.shape
}
const currentPlayerSize = player => {
    let size = PLAYERRADIUS
    if (Object.keys(player.powerups).includes("sizeup")) {
        size *= 2
    }
    if (Object.keys(player.powerups).includes("sizedown")) {
        size /= 2
    }
    return size
}
const checkForCollisions = (currentPlayer, x, y) => {
    if (Object.keys(currentPlayer.powerups).includes("ghost")) {
        return
    }
    for (const p of game.players) {
        if (!currentPlayer.alive || Object.keys(p.powerups).includes("ghost")) {
            break
        }
        for (const position of p.position) {
            if (currentPlayerShape(currentPlayer) === "square" && currentPlayerShape(p) === "square") {
                //square, square
                if (currentPlayer === p) {
                    if (typeof p.direction !== "string") {
                        break
                    }
                    let playerMovingX = x
                    let playerMovingY = y
                    if (p.direction === "up") {
                        playerMovingY += currentPlayerSize(p)
                    }
                    if (p.direction === "down") {
                        playerMovingY -= currentPlayerSize(p)
                    }
                    if (p.direction === "left") {
                        playerMovingX -= currentPlayerSize(p)
                    }
                    if (p.direction === "right") {
                        playerMovingX += currentPlayerSize(p)
                    }
                    if (Math.abs(playerMovingX - position[0]) < currentPlayerSize(p) && Math.abs(playerMovingY - position[1]) < currentPlayerSize(p)) {
                        p.alive = false
                        break
                    }
                } else if (Math.abs(x - position[0]) < currentPlayerSize(currentPlayer) + currentPlayerSize(p) && Math.abs(y - position[1]) < currentPlayerSize(currentPlayer) + currentPlayerSize(p)) {
                    currentPlayer.alive = false
                    break
                }
            }
            if (currentPlayerShape(currentPlayer) === "circle" && currentPlayerShape(p) === "circle") {
                //circle, circle
                if (currentPlayer === p) {
                    if (typeof p.direction !== "number") {
                        break
                    }
                    const playerMovingX = x + currentPlayerSize(p) * Math.cos(p.direction)
                    const playerMovingY = y + currentPlayerSize(p) * Math.sin(p.direction)
                    if (distance(playerMovingX, playerMovingY, position[0], position[1]) < currentPlayerSize(p)) {
                        p.alive = false
                        break
                    }
                } else if (distance(x, y, position[0], position[1]) < currentPlayerSize(p) + currentPlayerSize(currentPlayer)) {
                    currentPlayer.alive = false
                    break
                }
            }
            if (currentPlayerShape(currentPlayer) !== currentPlayerShape(p)) {
                //square, circle
                //note that this comparison can never be called for the same player
                //checks for that are therefor left out of this collisions calculation
                const circleX = currentPlayerShape(currentPlayer) === "circle" ? x : position[0]
                const circleY = currentPlayerShape(currentPlayer) === "circle" ? y : position[1]
                const circleR = currentPlayerShape(currentPlayer) === "circle" ? currentPlayerSize(currentPlayer) : currentPlayerSize(p)
                const squareX = currentPlayerShape(currentPlayer) === "square" ? x : position[0]
                const squareY = currentPlayerShape(currentPlayer) === "square" ? y : position[1]
                const squareR = currentPlayerShape(currentPlayer) === "square" ? currentPlayerSize(currentPlayer) : currentPlayerSize(p)
                const angle = Math.atan2(circleY - squareY, circleX - squareX) + PI
                const newX = circleX + circleR * Math.cos(angle)
                const newY = circleY + circleR * Math.sin(angle)
                if (newX > squareX - squareR) {
                    if (newX < squareX + squareR) {
                        if (newY > squareY - squareR) {
                            if (newY < squareY + squareR) {
                                currentPlayer.alive = false
                                break
                            }
                        }
                    }
                }
            }
        }
    }
}
const possiblyUsePowerup = (player, x, y) => {
    const allPowerups = JSON.parse(JSON.stringify(game.powerups))
    for (const powerup of allPowerups) {
        if (distance(x, y, powerup.x, powerup.y) < currentPlayerSize(player) + POWERUPRADIUS) {
            const pickedUp = game.powerups.filter(p => {
                return p.x === powerup.x && p.y === powerup.y
            })[0]
            game.powerups.splice(game.powerups.indexOf(pickedUp), 1)
            if (player.powerups[powerup.type]) {
                player.powerups[powerup.type] += 5000000000
            } else {
                player.powerups[powerup.type] = 5000000000
            }
        }
    }
}
const possiblyEatFood = (player, x, y) => {
    const allFood = JSON.parse(JSON.stringify(game.food))
    for (const food of allFood) {
        if (distance(x, y, food.x, food.y) < currentPlayerSize(player) + FOODRADIUS) {
            const pickedUp = game.food.filter(f => {
                return f.x === food.x && f.y === food.y
            })[0]
            game.food.splice(game.food.indexOf(pickedUp), 1)
            player.score += 1
            player.speed = player.speed + SPEED * 0.1
            const appendLength = player.position.length * 1.2 - player.position.length
            const x = player.position[player.position.length - 1][0]
            const y = player.position[player.position.length - 1][1]
            for (let _ = 0; _ < appendLength; _++) {
                player.position.push([x, y])
            }
        }
    }
}
const movePlayerIfValid = (player, x, y) => {
    const [wrappedX, wrappedY] = checkOutOfBoundsAndWrap(player, x, y)
    checkForCollisions(player, x, y)
    possiblyUsePowerup(player, x, y)
    possiblyEatFood(player, x, y)
    if (player.alive) {
        player.position.unshift([wrappedX, wrappedY])
        player.position.pop()
    }
}
const moveCircle = (player, pixels) => {
    if (typeof (player.direction) !== "number") {
        if (player.direction === "left") {
            player.direction = PI
        } else if (player.direction === "right") {
            player.direction = 0
        } else if (player.direction === "up") {
            player.direction = PI * 0.5
        } else if (player.direction === "down") {
            player.direction = PI * 1.5
        }
    }
    let cornerSpeed = 0.04
    if (Object.keys(player.powerups).includes("cornerup")) {
        cornerSpeed = 0.08
    }
    if (Object.keys(player.powerups).includes("cornerdown")) {
        cornerSpeed = 0.01
    }
    if (Object.keys(player.powerups).includes("mirrorcontrols")) {
        if (player.preferredMove === "left") {
            player.direction -= cornerSpeed
        }
        if (player.preferredMove === "right") {
            player.direction += cornerSpeed
        }
    } else {
        if (player.preferredMove === "left") {
            player.direction += cornerSpeed
        }
        if (player.preferredMove === "right") {
            player.direction -= cornerSpeed
        }
    }
    const [originalX, originalY] = player.position[0]
    const newX = originalX + pixels * Math.cos(player.direction)
    const newY = originalY + pixels * Math.sin(player.direction)
    movePlayerIfValid(player, newX, newY)
}
const moveSquare = (player, pixels) => {
    if (!["left", "right", "up", "down"].includes(player.direction)) {
        player.direction = rotationToDirection(player.direction)
    } else if (["left", "right", "up", "down"].includes(player.preferredMove)) {
        let move = `${player.preferredMove}`
        if (Object.keys(player.powerups).includes("mirrorcontrols")) {
            if (move === "left") {
                move = "right"
            } else if (move === "right") {
                move = "left"
            } else if (move === "up") {
                move = "down"
            } else if (move === "down") {
                move = "up"
            }
        }
        if (player.direction === "left" && move !== "right") {
            player.direction = move
        }
        if (player.direction === "right" && move !== "left") {
            player.direction = move
        }
        if (player.direction === "up" && move !== "down") {
            player.direction = move
        }
        if (player.direction === "down" && move !== "up") {
            player.direction = move
        }
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
    game.area.current = Object.assign({}, game.area.new)
    game.area.new = {}
    for (const player of game.players) {
        if (game.state !== "game") {
            break
        }
        checkOutOfBoundsAndWrap(player, player.position[0][0], player.position[0][1], false)
    }
}
const withinArea = e => {
    const leftBorder = game.area.current.x - game.area.current.r
    const rightBorder = game.area.current.x + game.area.current.r
    const topBorder = game.area.current.y + game.area.current.r
    const bottomBorder = game.area.current.y - game.area.current.r
    if (game.area.shape === "circle") {
        return distance(e.x, e.y, game.area.current.x, game.area.current.y) < game.area.current.r
    }
    if (game.area.shape === "square") {
        return e.x < rightBorder && e.x > leftBorder && e.y > bottomBorder && e.y < topBorder
    }
    return false
}
const generateEmptyLocation = r => {
    let x = null
    let y = null
    let collision = true
    while (collision) {
        // Pick a location within the area
        if (game.area.shape === "circle") {
            x = game.area.current.x + game.area.current.r * Math.cos(Math.random() * TAU)
            y = game.area.current.y + game.area.current.r * Math.sin(Math.random() * TAU)
        }
        if (game.area.shape === "square") {
            x = game.area.current.x + game.area.current.r * (Math.random() * 2 - 1)
            y = game.area.current.y + game.area.current.r * (Math.random() * 2 - 1)
        }
        collision = false
        for (const player of game.players) {
            for (const position of player.position) {
                // Check if the position is far away from every player
                if (distance(x, y, position[0], position[1]) < currentPlayerSize(player) + r * 2) {
                    collision = true
                    break
                }
            }
        }
    }
    return [x, y]
}
const updateFood = () => {
    let desiredFoodCount = 1
    if (game.settings.foodCount === "players") {
        desiredFoodCount = game.players.length
    }
    game.food = game.food.filter(withinArea)
    while (desiredFoodCount > game.food.length) {
        const [x, y] = generateEmptyLocation(FOODRADIUS)
        game.food.push({x, y})
        game.food = game.food.filter(withinArea)
    }
}
const updatePowerups = delta => {
    for (const powerup of game.powerups) {
        if (powerup.despawn !== undefined) {
            powerup.despawn -= delta
        }
    }
    game.powerups = game.powerups.filter(p => p.despawn > 0)
    game.players.forEach(player => {
        if (player.alive) {
            Object.keys(player.powerups).forEach(powerup => {
                player.powerups[powerup] -= delta
                if (player.powerups[powerup] < 0) {
                    delete player.powerups[powerup]
                }
            })
        } else if (player.powerups.ghost !== undefined) {
            delete player.powerups.ghost
        }
    })
    if (!game.settings.enabledPowerups || game.settings.enabledPowerups.length === 0) {
        game.powerups = []
        return
    }
    game.powerups = game.powerups.filter(withinArea)
    let chance = 1
    if (game.settings.powerupsRate === "medium") {
        chance = 5
    } else if (game.settings.powerupsRate === "high") {
        chance = 15
    }
    if (coinflip(chance * delta / 50000000000)) {
        let despawn = 10000000000
        if (game.settings.powerupsDespawn === "medium") {
            despawn += 10000000000
        }
        if (game.settings.powerupsDespawn === "slow") {
            despawn += 20000000000
        }
        const [x, y] = generateEmptyLocation(POWERUPRADIUS)
        const type = settings.enabledPowerups[Math.floor(Math.random() * settings.enabledPowerups.length)]
        game.powerups.push({x, y, type, despawn})
        game.powerups = game.powerups.filter(withinArea)
    }
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
                powerups: {},
                wins: p.wins,
                speed: SPEED,
                score: 0
            })
        })
    })
    if (game.players.length < 2) {
        if (autotrigger) {
            game.countdown = LOBBYCOUNTDOWN
        } else {
            console.log("not enough players to start".red)
        }
        return
    }
    game.countdown = READYCOUNTDOWN
    console.log("starting a new game with these players:".green)
    for (const player of game.players) {
        console.log(` - ${player.uuid} ${player.name} ${player.color}`.blue)
    }
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
    if (game.settings.powerupsRate === "random") {
        game.settings.powerupsRate = "low"
        if (coinflip(0.3)) {
            game.settings.powerupsRate = "medium"
        } else if (coinflip(0.3)) {
            game.settings.powerupsRate = "high"
        }
    }
    if (game.settings.powerupsDespawn === "random") {
        game.settings.powerupsDespawn = coinflip() ? "fast" : "slow"
    }
    game.powerups = []
    game.food = []
    game.area.init.x = 0
    game.area.init.y = 0
    if (game.settings.areaShape === "random") {
        game.area.init.s = coinflip() ? "circle" : "square"
    }
    game.area.init.r = game.players.length * AREASIZE
    game.area.current = Object.assign({}, game.area.init)
    game.area.new = {}
    if (game.settings.playerShape === "circle") {
        game.players.forEach((p, index) => {
            const startRotation = TAU / game.players.length * index
            const x = 0.7 * game.area.init.r * Math.cos(startRotation)
            const y = 0.7 * game.area.init.r * Math.sin(startRotation)
            p.direction = startRotation + PI
            p.shape = "circle"
            p.position.push([x, y])
            for (let i = 1; i < INITIALLENGTH; i++) {
                p.position.push([x + (i * Math.cos(startRotation)), y + (i * Math.sin(startRotation))])
            }
        })
    }
    if (game.settings.playerShape === "square") {
        game.players.forEach((p, index) => {
            const startRotation = TAU / game.players.length * index
            const x = 0.7 * game.area.init.r * Math.cos(startRotation)
            const y = 0.7 * game.area.init.r * Math.sin(startRotation)
            p.direction = rotationToDirection(startRotation + PI)
            p.shape = "square"
            p.position.push([x, y])
            for (let i = 1; i < INITIALLENGTH; i++) {
                if (rotationToDirection(startRotation) === "left") {
                    p.position.push([x - i, y])
                }
                if (rotationToDirection(startRotation) === "right") {
                    p.position.push([x + i, y])
                }
                if (rotationToDirection(startRotation) === "up") {
                    p.position.push([x, y + i])
                }
                if (rotationToDirection(startRotation) === "down") {
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
    console.log("game has ended".green)
    game.countdown = LOBBYCOUNTDOWN
    game.state = "lobby"
}
const commands = [
    {
        command: "game start",
        description: "Start a new game now if enough players are in the lobby",
        action: () => {
            if (game.state === "lobby") {
                startGame()
            } else {
                console.log("A game is already running".yellow)
            }
        }
    },
    {
        command: "game stop",
        description: "Stop the current game if one is running, no winner will be selected",
        action: () => {
            if (game.state === "ready") {
                console.log("The game is still starting".yellow)
            } else if (game.state === "game") {
                stopGame()
            } else {
                console.log("No game is running yet".yellow)
            }
        }
    },
    {
        command: "settings",
        description: "List all the currently active settings",
        action: () => {
            printSettings()
        }
    },
    {
        command: "settings ",
        syntax: "settings <setting> <value>",
        description: "Change a server setting, will be used when starting the next game",
        acceptsArgs: true,
        action: input => {
            const startupOnlySettings = [
                "serverPort", "websitePort", "serverOnly"
            ]
            const setting = input.split(" ")[0]
            const value = input.split(" ").slice(1).join(",")
            if (startupOnlySettings.includes(setting)) {
                console.log("This setting can only be changed when starting the server".red)
            } else {
                const newSettings = {}
                newSettings[setting] = value
                parseAndApplySettings(newSettings)
            }
        }
    },
    {
        command: "help",
        description: "Show this list of commands",
        action: () => {
            console.log("These are the possible commands:".green)
            for (const c of commands) {
                if (c.syntax) {
                    console.log(` ${"-".green} ${c.syntax.yellow} ${c.description.blue}`)
                } else {
                    console.log(` ${"-".green} ${c.command.yellow} ${c.description.blue}`)
                }
            }
        }
    },
    {
        command: "exit",
        description: "Stop all World of Snek activities and exit",
        action: () => {
            console.log("Bye".green)
            process.exit(0)
        }
    }
]
const processCLI = message => {
    const command = commands.find(c => {
        return c.command === message || (c.acceptsArgs && message.startsWith(c.command))
    })
    if (command) {
        command.action(message.replace(command.command, ""))
    } else {
        console.log("Unknown command, use 'help' for details".red)
    }
}
const processMessage = (clientId, message) => {
    message.uuid = message.uuid && message.uuid.slice(0, 100)
    message.name = message.name && message.name.slice(0, 100)
    message.color = message.color && message.color.slice(0, 100)
    message.moves = message.moves && message.moves.slice(0, 100)
    if (message.type === "newplayer" && game.state === "lobby") {
        let playerCount = 0
        for (const c of clients) {
            for (const p of c.players) {
                playerCount += 1
                if (p.uuid === message.uuid) {
                    return
                }
            }
        }
        if (playerCount >= settings.maxPlayers) {
            return
        }
        console.log(`client ${clients[clientId].ip} added new player:`.green)
        console.log(` - ${message.uuid} ${message.name} ${message.color}`.blue)
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
        for (const c of clients) {
            const winners = c.players.filter(p => p.uuid === player.uuid)
            if (winners.length === 1) {
                winners[0].wins += 1
                game.lastwinner = winners[0]
                console.log("the winner is:".green)
                console.log(` - ${winners[0].uuid} ${winners[0].name} ${winners[0].color}`.blue)
                break
            } else {
                console.log("it's a draw".green)
                game.lastwinner = null
            }
        }
    } else {
        console.log("it's a draw".green)
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
                    console.log("it's a draw".green)
                    game.lastwinner = null
                }
                stopGame()
            }
        }
        game.players.forEach(p => {
            if (p.alive) {
                let pixels = delta / 100000000 * p.speed
                if (Object.keys(p.powerups).includes("speedup")) {
                    pixels *= 1.5
                }
                if (Object.keys(p.powerups).includes("speeddown")) {
                    pixels /= 1.5
                }
                if (Object.keys(p.powerups).includes("superspeed")) {
                    pixels *= 4
                }
                if (currentPlayerShape(p) === "square") {
                    moveSquare(p, pixels)
                } else {
                    moveCircle(p, pixels)
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
        updatePowerups(delta)
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
let oldGameState = {}
const informClients = () => {
    if (game.state === "game" || game.state === "ready") {
        // Simplify the game object before sending it to all clients
        const filteredGame = JSON.parse(JSON.stringify(game))
        const gameState = JSON.parse(JSON.stringify(filteredGame))
        filteredGame.settings = undefined
        filteredGame.lastalive = undefined
        for (const area of ["init", "current", "new"]) {
            if (filteredGame.area[area].x) {
                filteredGame.area[area].x = Math.round(filteredGame.area[area].x)
                filteredGame.area[area].y = Math.round(filteredGame.area[area].y)
                filteredGame.area[area].r = Math.round(filteredGame.area[area].r)
            }
        }
        filteredGame.food = filteredGame.food.map(f => {
            return {
                x: Math.round(f.x),
                y: Math.round(f.y),
                r: Math.round(f.r)
            }
        })
        filteredGame.players.forEach(player => {
            player.direction = undefined
            player.preferredMove = undefined
            player.speed = undefined
            player.length = player.position.length
            player.position = player.position.map(pos => pos.map(Math.round))
            if (oldGameState.players) {
                const oldPlayer = oldGameState.players.find(p => p.uuid === player.uuid)
                if (oldPlayer) {
                    const oldPositions = oldPlayer.position.map(
                        pos => JSON.stringify(pos.map(Math.round)))
                    player.position = player.position.filter(
                        pos => !oldPositions.includes(JSON.stringify(pos)))
                }
            }
        })
        if (game.state === "game") {
            filteredGame.countdown = undefined
        }
        const message = JSON.stringify(filteredGame)
        clients.forEach(c => {
            setTimeout(() => {
                if (c.socket) {
                    c.socket.send(message)
                }
            }, 0)
        })
        oldGameState = gameState
    }
    if (game.state === "lobby") {
        // Send the player list and other basic info while in the lobby
        const players = []
        clients.forEach(c => {
            c.players.forEach(p => {
                players.push(p)
            })
        })
        const message = JSON.stringify({
            state: "lobby",
            countdown: game.countdown,
            players: players,
            lastwinner: game.lastwinner
        })
        clients.forEach(c => {
            setTimeout(() => {
                if (c.socket) {
                    c.socket.send(message)
                }
            }, 0)
        })
    }
}

// SETTINGS

const defaultSettings = {
    areaShape: "random",
    wrap: "random",
    playerShape: "random",
    shrinkType: "random",
    shrinkSpeed: "random",
    shrinkTimeout: "random",
    powerupsRate: "random",
    powerupsDespawn: "random",
    foodCount: "random",
    gamemode: "random",
    maxPlayers: 69,
    enabledPowerups: [
        "superspeed",
        "speedup",
        "speeddown",
        "cornerup",
        "cornerdown",
        "sizeup",
        "sizedown",
        "mirrorcontrols",
        "flipshape",
        "ghost"
    ],
    serverPort: 7635,
    websitePort: 8000,
    serverOnly: false
}
const selectOptions = {
    areaShape: ["random", "circle", "square"],
    wrap: ["random", "yes", "no"],
    playerShape: ["random", "circle", "square"],
    shrinkType: ["random", "gradual", "instant"],
    shrinkSpeed: ["random", "fast", "normal", "slow"],
    shrinkTimeout: ["random", "fast", "normal", "slow", "never"],
    powerupsRate: ["random", "low", "medium", "high"],
    powerupsDespawn: ["random", "fast", "slow", "never"],
    foodCount: ["random", "1", "players"],
    gamemode: ["random", "lastalive", "score"]
}
const settingsDescriptions = {
    areaShape: "The shape of the playing area",
    wrap: "Should player be allowed to wrap to the other side of the area",
    playerShape: "Shape of the player, this influences the movement options",
    shrinkType: "The transition type to use when shrinking the area",
    shrinkSpeed: "The amount of time it takes to complete an area shrink",
    shrinkTimeout: "The timeout period between shrinking the area",
    powerupsRate: "The rate at which new powerups will appear in the area",
    powerupsDespawn: "The speed at which powerups in the area will despawn",
    foodCount: "The number of food elements in the area at a single moment",
    gamemode: "Which strategy will determine the winner of the game?",
    maxPlayers: "The maximum amount of players to join the server",
    enabledPowerups: "A list of powerups that will be enabled on the server\n  You can specify the same powerup multiple times to increase the number of occurrences",
    serverPort: "Port number of the World of Snek server application",
    websitePort: "Port number of the client website",
    serverOnly: "When provided, no website will be hosted, only runs the server"
}
const printSettings = () => {
    console.log("Current settings:".yellow, JSON.stringify(settings, null, 2).yellow)
}
if (args.help) {
    console.log("World of Snek - Server help\n".green)
    console.log("You can start the server without arguments to get started,".blue)
    console.log("or pass any of these arguments listed to change the settings\n".blue)
    for (const setting of Object.keys(defaultSettings)) {
        console.log(`--${setting}`.green, "\n  default:", String(defaultSettings[setting]).yellow)
        console.log(`  ${settingsDescriptions[setting]}`)
        if (selectOptions[setting]) {
            console.log("  Options:", String(selectOptions[setting]).blue)
        }
        console.log()
    }
    process.exit(0)
}
if (args._ && args._.length > 0) {
    console.log(`Trailing arguments: ${args._}`.red)
    console.log("Use --help to see the list of options".blue)
    process.exit(1)
}
const settings = JSON.parse(JSON.stringify(defaultSettings))
const parseAndApplySettings = (newSettings, exitOnFail = false) => {
    for (const arg of Object.keys(newSettings)) {
        if (!Object.keys(defaultSettings).includes(arg) && !["serverOnly", "_"].includes(arg)) {
            console.log(`Unknown setting: ${arg}`.red)
            if (exitOnFail) {
                console.log("Use --help to see the list of options".blue)
                process.exit(1)
            }
        }
    }
    for (const option of Object.keys(selectOptions)) {
        if (newSettings[option]) {
            if (selectOptions[option].includes(String(newSettings[option]))) {
                settings[option] = String(newSettings[option])
            } else {
                console.log(`Setting '${option}' must be set to one of: ${selectOptions[option]}`.red)
                if (exitOnFail) {
                    console.log("Use --help to see the list of options".blue)
                    process.exit(1)
                }
            }
        }
    }
    if (newSettings.maxPlayers) {
        if (Number(newSettings.maxPlayers) > 1) {
            settings.maxPlayers = Number(newSettings.maxPlayers)
        } else {
            console.log("Maximum number of players must be at least 2".red)
            if (exitOnFail) {
                console.log("Use --help to see the list of options".blue)
                process.exit(1)
            }
        }
    }
    if (newSettings.enabledPowerups) {
        settings.enabledPowerups = []
        for (const powerup of newSettings.enabledPowerups.split(/[, ]+/)) {
            if (defaultSettings.enabledPowerups.includes(powerup)) {
                settings.enabledPowerups.push(powerup)
            } else {
                console.log(`Ignoring unknown powerup '${powerup}'`.yellow)
            }
        }
    }
    if (newSettings.serverPort) {
        if (Number(newSettings.serverPort) > 0 && Number(newSettings.serverPort) < 100000) {
            settings.serverPort = Number(newSettings.serverPort)
        } else {
            console.log("Invalid server port number, can't start the server".red)
            process.exit(1)
        }
    }
    if (newSettings.websitePort) {
        if (Number(newSettings.websitePort) > 0 && Number(newSettings.websitePort) < 100000) {
            settings.websitePort = Number(newSettings.websitePort)
        } else {
            console.log("Invalid website port number, can't host the website, skipping server".red)
            process.exit(1)
        }
    }
    if (settings.serverPort === settings.websitePort) {
        console.log("Port numbers can not be the same!".red)
        process.exit(1)
    }
    settings.serverOnly = !!newSettings.serverOnly
}
parseAndApplySettings(args, true)

// INIT

const clients = []
// game will be filled with proper data when starting a new game
const game = {
    state: "lobby",
    countdown: LOBBYCOUNTDOWN,
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

if (!module.parent) {
    const server = new ws.Server({
        port: settings.serverPort
    })
    server.on("connection", (client, req) => {
        const clientId = clients.length
        console.log("new client connected:".green, req.connection.remoteAddress.green)
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
            console.log("client disconnected:".red, req.connection.remoteAddress.red)
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
    if (!settings.serverOnly) {
        www(settings.websitePort)
        console.log("Client started!".green)
        const interfaces = os.networkInterfaces()
        Object.keys(interfaces).forEach(i => {
            interfaces[i].forEach(l => {
                console.log(` - http://${l.address}:${settings.websitePort}`.blue)
            })
        })
        console.log("")
    }
    printSettings()
    console.log("\nServer started!".green)
    console.log(" - You can interact with the server by typing commands!\n".blue)
}
