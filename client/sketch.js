"use strict"

/* global resizeCanvas windowWidth windowHeight background translate stroke
circle text textSize textAlign fill square rectMode noFill noStroke*/

let testPacket
let socket, serverIP
let success
let gameData
let nextDirection
let playerOneUUID
let players = []

const exampleControls = {
    up: 38,
    down: 40,
    left: 37,
    right: 39
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
    // serverIP = prompt("Enter server IP")
    // try to connect websocket
    try {
        connectSocket()
    } catch (e) {
        // alert("Cannot connect to server")
    }

    playerOneUUID = genUuid()
    players.push(makeNewPlayer("May", "red", exampleControls))
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
    }
    if (gameData.state === "game") {
        gameData.players.forEach(player => {
            noStroke()
            // make rainbow option and other magic words
            fill(player.color)
            if (!player.alive) {
                fill("#777777")
            }
            player.position.forEach(position => {
                circle(position[0], position[1], player.size)
            })
        })
        socket.send(JSON.stringify({
            "type": "movement",
            "moves": [
                {
                    "uuid": playerOneUUID,
                    "dir": nextDirection
                }
            ]
        }))
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
        // alert("closed")
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
