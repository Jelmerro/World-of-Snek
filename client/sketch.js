/*
* World of Snek - Snake Battle Royale
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
strokeWeight */

let testPacket
let socket, serverIP
let success
let gameData
let nextDirection
let playerOneUUID
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
    testPacket = {
        "players": [
            {
                "uuid": "5132e4ef-5bbf-416e-a3ca-1640aa3641aa",
                "position": [[0, 0], [0, 100], [-100, 100]],
                "size": 20
            }
        ],
        "area": {
            "old": {
                "x": 0,
                "y": 0,
                "size": 1000
            },
            "new": {
                "x": 0,
                "y": 200,
                "size": 800
            },
            "time": 4200
        },
        "powerups": [
            {
                "x": 20,
                "y": -300,
                "type": "cornerup"
            }
        ]
    }
    gameData = {
        "state": "connecting"
    }
    serverIP = prompt("Enter server IP")
    // try to connect websocket
    try {
        connectSocket()
    } catch (e) {
        alert("Cannot connect to server")
    }

    playerOneUUID = genUuid()
    players.push(makeNewPlayer("May", "orange", exampleControls))
    players.push(makeNewPlayer("The cooler May", "cyan", exampleControls2))
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight)
}

function draw() {
    background(0)
    fill(255)
    stroke(255)
    textAlign("center")
    textSize(64)
    rectMode("center")
    translate(windowWidth/2, windowHeight/2)
    // center circle
    circle(0, 0, 5)
    if (gameData.state === "connecting") {
        text("The blutüth device is ready to pair")
    }
    if (gameData.state === "lobby") {
        noStroke()
        translate(0, 64-windowHeight/2)
        gameData.players.forEach(player => {
            fill(player.color)
            text(player.name, 0, 16)
            translate(0, 80)
        })
        players.forEach(player => {
            sendPlayerToServer(player)
        })
    }
    if (gameData.state === "game") {
        scale(1, -1)
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
        // draw players
        gameData.players.forEach(player => {
            noStroke()
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
        // socket.send(JSON.stringify({
        //     "type": "movement",
        //     "moves": [
        //         {
        //             "uuid": playerOneUUID,
        //             "dir": nextDirection
        //         }
        //     ]
        // }))
    }
    // console.log(nextDirection)
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
        // socket.send(JSON.stringify({
        //     "type": "newplayer",
        //     "uuid": playerOneUUID,
        //     "color": "#FF0000",
        //     "name": "Mayyy lmao"
        // }))
        // socket.send(JSON.stringify({
        //     "type": "newplayer",
        //     "uuid": genUuid(),
        //     "color": "#0000FF",
        //     "name": "Mayyy 2"
        // }))
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
