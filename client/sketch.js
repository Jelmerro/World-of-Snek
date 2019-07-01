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

/* global resizeCanvas windowWidth windowHeight background translate stroke
circle text textSize textAlign fill square rectMode noFill noStroke scale
strokeWeight */

let socket, serverIP
let success
let gameData = {
    state: "connecting"
}
let windowScale = 1
let dynamicScaling = true
let lastCenter = [0, 0]
const players = []

const exampleControls = {
    up: 38,
    down: 40,
    left: 37,
    right: 39
}

const exampleControls2 = {
    up: 87,
    down: 83,
    left: 65,
    right: 68
}

function setup() {
    resizeCanvas(windowWidth, windowHeight)
    serverIP = prompt("Enter server IP")
    // try to connect websocket
    try {
        connectSocket()
    } catch (e) {
        alert("Cannot connect to server")
    }
    players.push(makeNewPlayer("May", "orange", exampleControls))
    players.push(makeNewPlayer("The cooler May", "cyan", exampleControls2))
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
    // center circle
    circle(0, 0, 5)
    if (gameData.state === "connecting") {
        text("Ze blutüth device is ready to pair", 0, 0)
    }
    if (gameData.state === "ready") {
        const countdown = Math.abs(Math.ceil(gameData.countdown / 1000000000))
        // dividing to get seconds from nanoseconds
        translate(0, 64-windowHeight/2)
        text("Get ready!", 0, 16)
        translate(0, 80)
        if (countdown > 2) {
            fill("green")
        } else if (countdown > 1) {
            fill("orange")
        } else {
            fill("red")
        }
        text(countdown, 0, 16)
    }
    if (gameData.state === "lobby") {
        const countdown = Math.abs(Math.ceil(gameData.countdown / 1000000000))
        // dividing to get seconds from nanoseconds
        translate(0, 64-windowHeight/2)
        text(`Welcome to the lobby! Next game in ${countdown}s`, 0, 16)
        gameData.players.forEach(player => {
            translate(0, 80)
            fill(player.color)
            const winOrWins = player.wins === 1 ? "win" : "wins"
            text(`${player.name} - ${player.wins} ${winOrWins}`, 0, 16)
        })
        players.forEach(player => {
            sendPlayerToServer(player)
        })
    }
    if (gameData.state === "game") {
        if (dynamicScaling) {
            windowScale = smallerDim() / (gameData.area.current.r * 2)
            const [oldX, oldY] = lastCenter
            const [x, y] = [gameData.area.current.x, gameData.area.current.y]
            const [deltaX, deltaY] = [x - oldX, y - oldY]
            translate(deltaX, -deltaY) // flipped y?
            lastCenter = [x, y]
        } else {
            windowScale = smallerDim() / (gameData.area.init.r * 2)
        }
        scale(windowScale, -windowScale) // negative to flip y axis
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
        // draw food
        gameData.food.forEach(food => {
            fill("#ffffff")
            circle(food.x, food.y, food.r*2)
        })
        // draw players
        gameData.players.forEach(player => {
            // make rainbow option and other magic words
            fill(player.color)
            if (!player.alive) {
                fill("#777777")
            }
            player.position.forEach(position => {
                if (player.shape === "square") {
                    square(position[0], position[1], player.size*2)
                } else if (player.shape === "circle") {
                    circle(position[0], position[1], player.size*2)
                }
            })
        })
        // send player moves to server
        const moves = []
        players.forEach(player => {
            player.controls.nextMove = ""
            if (player.controls.upPressed) {
                player.controls.nextMove = "up"
            }
            if (player.controls.downPressed) {
                player.controls.nextMove = "down"
            }
            if (player.controls.leftPressed) {
                player.controls.nextMove = "left"
            }
            if (player.controls.rightPressed) {
                player.controls.nextMove = "right"
            }
            moves.push({
                uuid: player.uuid,
                dir: player.controls.nextMove
            })
        })
        sendMovesToServer(moves)
    }
    if (success) {
        // text("Connectedu successfurry", 0, 0)
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
    socket = new WebSocket("ws://"+serverIP)
    socket.onopen = () => {
        success = true
    }
    socket.onmessage = e => {
        gameData = JSON.parse(e.data)
    }
    socket.onclose = () => {
        alert("closed")
        gameData.state = "connecting"
        if (confirm("reconnect to " + serverIP + "?")) {
            connectSocket()
        }
    }
}

function openModal(id) {
    const modal = document.getElementById(id)
    modal.style.display = "flex"
    const content = modal.children[0]
    content.style.maxHeight = content.scrollHeight+"px"
}

function closeModal(id) {
    const modal = document.getElementById(id)
    const content = modal.children[0]
    modal.style.display = "none"
    content.style.maxHeight = "0"
}

// Make players with name, color, and preferred controls for up/down/left/right
function makeNewPlayer(name, color, controls) {
    return {
        name,
        color,
        uuid: genUuid(),
        controls: {
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
