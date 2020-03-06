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

/* global resizeCanvas windowWidth windowHeight background translate stroke
circle text textSize textAlign fill square rectMode noFill noStroke scale
strokeWeight updatePlayerList updateAreaShrink showElement hideElement
playerlist areaShrink preferredIP preferredPort connectModal M controls
updateServerSettings updatePlayerSettings dynamicScaling maxEntities
spectatorDisplay */

let socket, serverIP, serverPort
const defaultIP = location.hostname || "localhost"
const defaultPort = 7635
let gameData = {
    state: "connecting"
}
let windowScale = 1
let lastCenter = [0, 0]
let totalEntities
const localPlayers = []

function setup() {
    resizeCanvas(windowWidth, windowHeight)
    // try to connect websocket
    try {
        connectSocket()
    } catch (e) {
        M.toast({html: "Failed to connect to server"})
        connectModal.open()
    }
    // localPlayers.push(makeNewPlayer("May", "#FFA500", controls.Arrows))
    // localPlayers.push(makeNewPlayer("The cooler May", "#00FFFF", controls.WASD))
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight)
}

function draw() {
    background(0)
    fill(255)
    noStroke()
    textAlign("center")
    textSize(64)
    rectMode("center")
    translate(windowWidth/2, windowHeight/2)
    if (gameData.state === "connecting") {
        hideElement(playerlist)
        hideElement(areaShrink)
        text("Ze blutüth device is ready to pair", 0, 0)
    }
    if (gameData.state === "lobby") {
        hideElement(playerlist)
        hideElement(areaShrink)
        const countdown = Math.abs(Math.ceil(gameData.countdown / 1000000000))
        // dividing to get seconds from nanoseconds
        translate(0, 64-windowHeight/2)
        text(`Welcome to the lobby! Next game in ${countdown}s`, 0, 16)
        translate(0, 120)
        if (gameData.lastwinner) {
            text(`${gameData.lastwinner.name} won this round!`, 0, 16)
        } else {
            text("It's a draw!", 0, 16)
        }
        gameData.players.forEach(player => {
            translate(0, 80)
            fill(player.color)
            const winOrWins = player.wins === 1 ? "win" : "wins"
            text(`${player.name} - ${player.wins} ${winOrWins}`, 0, 16)
        })
        localPlayers.forEach(player => {
            sendPlayerToServer(player)
        })
    }
    if (["ready", "game"].includes(gameData.state)) {
        scaleGame()
        drawAreas()
        drawFood()
        drawPowerups()
        drawPlayers()
        showElement(playerlist)
        updatePlayerList(gameData.players)
    }
    if (gameData.state === "ready") {
        scale(1, -1) // flip y back to render text
        const countdown = Math.abs(Math.ceil(gameData.countdown / 1000000000))
        // dividing to get seconds from nanoseconds
        const scaledSize = gameData.area.init.r/10
        textSize(scaledSize)
        fill(255)
        translate(0, -scaledSize*.5)
        text("Get ready!", 0, 16)
        translate(0, scaledSize)
        if (countdown > 2) {
            fill("green")
        } else if (countdown > 1) {
            fill("orange")
        } else {
            fill("red")
        }
        text(countdown, 0, 16)
    }
    if (gameData.state === "game") {
        // overlay area countdown
        const timeToNewArea = gameData.area.time
        if (gameData.area.new.x) {
            const countdown = Math.abs(Math.ceil(timeToNewArea / 1000000000))
            // dividing to get seconds from nanoseconds
            showElement(areaShrink)
            updateAreaShrink(countdown)
        } else {
            hideElement(areaShrink)
        }
        // send player moves to server
        const moves = []
        localPlayers.forEach(player => {
            player.controls.nextMove = ""
            if (player.controls.upPressed) {
                player.controls.nextMove = "up"
            }
            if (player.controls.downPressed) {
                player.controls.nextMove = "down"
            }
            if (player.controls.leftPressed && !player.controls.rightPressed) {
                player.controls.nextMove = "left"
            }
            if (player.controls.rightPressed && !player.controls.leftPressed) {
                player.controls.nextMove = "right"
            }
            moves.push({
                uuid: player.uuid,
                dir: player.controls.nextMove
            })
        })
        sendMovesToServer(moves)
    }
}

/* this function was made by broofa and is licensed under cc by-sa 3.0
https://stackoverflow.com/a/2117523 */
function genUuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

function connectSocket() {
    serverIP = preferredIP || defaultIP
    serverPort = preferredPort || defaultPort
    socket = new WebSocket(`ws://${serverIP}:${serverPort}`)
    socket.onopen = () => {
        gameData.state = "connected"
        updateServerSettings()
        updatePlayerSettings()
    }
    socket.onmessage = e => {
        const oldGameData = JSON.parse(JSON.stringify(gameData))
        const newGameData = JSON.parse(e.data)
        newGameData.players.forEach(player => {
            if (oldGameData.players) {
                const oldPlayer = oldGameData.players.find(p => p.uuid === player.uuid)
                if (oldPlayer) {
                    if (oldPlayer.position && player.position) {
                        player.position = player.position.concat(oldPlayer.position).slice(0, player.length)
                    }
                }
            }
        })
        gameData = newGameData
    }
    socket.onclose = () => {
        gameData.state = "connecting"
        M.toast({html: "Failed to connect to server"})
        connectModal.open()
        updateServerSettings()
        updatePlayerSettings()
    }
}

// Make players with name, color, and preferred controls for up/down/left/right
function makeNewPlayer(name, color, controls) {
    hideElement(spectatorDisplay)
    return {
        name,
        color,
        uuid: genUuid(),
        controls: {
            preset: controls.preset,
            up: controls.up,
            down: controls.down,
            left: controls.left,
            right: controls.right,
            upPressed: false,
            downPressed: false,
            leftPressed: false,
            rightPressed: false,
            nextMove: ""
        }
    }
}

function smallerDim() {
    return windowHeight < windowWidth ? windowHeight : windowWidth
}

function sendPlayerToServer(player) {
    const message = {
        name: player.name,
        color: player.color,
        uuid: player.uuid,
        type: "newplayer"
    }
    try {
        socket.send(JSON.stringify(message))
    } catch (e) {
        console.error("Couldn't send player to server: " + e)
    }
}

function sendMovesToServer(moves) {
    socket.send(JSON.stringify({
        type: "movement",
        moves: moves
    }))
}

function drawAreas() {
    noFill()
    strokeWeight(2)
    // draw initial area
    const initialArea = gameData.area.init
    stroke("#777777")
    if (gameData.area.shape === "square") {
        // TODO: set color and stuff
        square(initialArea.x, initialArea.y, initialArea.r*2)
    } else if (gameData.area.shape === "circle") {
        circle(initialArea.x, initialArea.y, initialArea.r*2)
    }
    // draw new area
    const newArea = gameData.area.new
    stroke("blue")
    if (newArea.x) {
        if (gameData.area.shape === "square") {
            square(newArea.x, newArea.y, newArea.r*2)
        } else if (gameData.area.shape === "circle") {
            circle(newArea.x, newArea.y, newArea.r*2)
        }
    }
    // draw current area
    const currentArea = gameData.area.current
    if (gameData.wrap) {
        stroke("green")
    } else {
        stroke("red")
    }
    if (gameData.area.shape === "square") {
        square(currentArea.x, currentArea.y, currentArea.r*2)
    } else if (gameData.area.shape === "circle") {
        circle(currentArea.x, currentArea.y, currentArea.r*2)
    }
    noStroke()
}

function scaleGame() {
    if (dynamicScaling) {
        windowScale = smallerDim() / (gameData.area.current.r * 2)
        const [oldX, oldY] = lastCenter
        const [x, y] = [gameData.area.current.x, gameData.area.current.y]
        const [deltaX, deltaY] = [x - oldX, y - oldY]
        translate(deltaX, deltaY)
        lastCenter = [x, y]
    } else {
        windowScale = smallerDim() / (gameData.area.init.r * 2)
    }
    scale(windowScale, -windowScale) // negative to flip y axis
}

function drawPlayers() {
    totalEntities = 0
    gameData.players.forEach(player => {
        totalEntities += player.position.length
    })
    const drawFactor = Math.ceil(totalEntities/maxEntities)
    gameData.players.forEach(player => {
        // make rainbow option and other magic words
        fill(player.color)
        if (!player.alive) {
            fill("#777777")
        }
        let shape = player.shape
        if (Object.keys(player.powerups).includes("flipshape")) {
            shape = shape === "square" ? "circle" : "square"
        }
        let size = 40
        if (Object.keys(player.powerups).includes("sizeup")) {
            size *=2
        }
        if (Object.keys(player.powerups).includes("sizedown")) {
            size /=2
        }
        player.position.forEach((position, i) => {
            // always draw the head which is index 0
            if (i % drawFactor !== 0 && i !== 0) {
                return
            }
            if (shape === "square") {
                square(position[0], position[1], size)
            } else if (shape === "circle") {
                circle(position[0], position[1], size)
            }
        })
    })
}

function drawFood() {
    gameData.food.forEach(food => {
        fill(255)
        circle(food.x, food.y, 20)
    })
}

function drawPowerups() {
    gameData.powerups.forEach(powerup => {
        //TODO color powerup according to powerup.type
        fill("#ff00ff")
        circle(powerup.x, powerup.y, 40)
        translate(1, -1) // flip y back to render text
        scale(1, -1) // flip y back to render text
        //TODO fix text being at the wrong position, or remove it when colors are fixed
        text(powerup.type, powerup.x, powerup.y)
        translate(1, -1) // flip y back to render text
        scale(1, -1) // flip y back to render text
    })
}
