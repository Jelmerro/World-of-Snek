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

// hmm lekker uitje
/* global M connectSocket gameData serverIP serverPort localPlayers */

const playerlist = document.getElementById("player-list")
const menu = document.getElementById("menu")
let menuModal
const connect = document.getElementById("connect-modal")
let connectModal
const connectButton = document.getElementById("connect")
const closeConnect = document.getElementById("close-connect")
const ipField = document.getElementById("server-ip")
const portField = document.getElementById("server-port")
let preferredIP
let preferredPort
const serverSettings = document.getElementById("server-settings")
const playerSettings = document.getElementById("player-settings")
let dynamicScaling = false
const scalingControl = document.getElementById("dynamic-scaling")
let maxEntities = 500
const maxEntitiesControl = document.getElementById("max-entities")

let lastPlayers

// init modals
document.addEventListener("DOMContentLoaded", () => {
    const elems = document.querySelectorAll(".modal")
    const instances = M.Modal.init(elems, {dismissible: false})
    menuModal = M.Modal.getInstance(menu)
    connectModal = M.Modal.getInstance(connect)
})

window.addEventListener("keydown", e => {
    const key = e.keyCode
    // esc opens and closes menu
    if (key !== 27) {
        return
    }
    if (menuModal.isOpen) {
        menuModal.close()
    } else {
        updateServerSettings()
        updatePlayerSettings()
        menuModal.open()
    }
})

ipField.addEventListener("keydown", e => {
    const key = e.keyCode
    // if a colon is typed, go to port field
    if (key !== 186) {
        return
    }
    e.preventDefault()
    portField.focus()
})

ipField.addEventListener("input", () => {
    // if an IP with port is pasted, put them in the right fields
    const parts = ipField.value.split(":")
    if (parts.length > 1) {
        portField.value = parts[1]
        ipField.value = parts[0]
        M.updateTextFields()
    }
})

connect.addEventListener("keydown", e => {
    const key = e.keyCode
    // if enter is pressed within connect modal, submit field inputs
    if (key === 13) {
        connectFromModal()
    }
    // if esc is pressed, close the modal
    if (key === 27) {
        closeConnectModal()
        // prevent the menuModal trigger
        e.stopPropagation()
    }
})

connectButton.addEventListener("click", connectFromModal)

closeConnect.addEventListener("click", closeConnectModal)

scalingControl.addEventListener("change", () => {
    dynamicScaling = scalingControl.checked
})

maxEntitiesControl.addEventListener("change", () => {
    maxEntities = maxEntitiesControl.value
})

function connectFromModal() {
    preferredIP = ipField.value
    preferredPort = portField.value
    connectSocket()
    connectModal.close()
}

function closeConnectModal() {
    connectModal.close()
}

function emptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

function playerElement(player) {
    const element = document.createElement("div")
    element.className = "player"
    element.innerHTML =  `
    <div class="blob ${player.shape}" style="background-color:${player.color};">
    </div>
    <div class="name">${player.name}</div>
    <div class="wins">Wins: ${player.wins}</div>
    <div class="score">Score: ${player.score}</div>`
    return element
}

function updatePlayerList(players) {
    const newPlayers = filterPlayerData(players)
    if (JSON.stringify(lastPlayers) !== JSON.stringify(newPlayers)) {
        emptyElement(playerlist)
        players.forEach(player => {
            playerlist.appendChild(playerElement(player))
        })
    }
    lastPlayers = newPlayers
}

function filterPlayerData(players) {
    return players.map(player => {
        // filter to only info that is relevant to updating playerlist
        return {
            shape: player.shape,
            score: player.score,
            wins: player.wins
        }
    })
}

function showPlayerList() {
    if (playerlist.style.display !== "flex") {
        playerlist.style.display = "flex"
    }
}

function hidePlayerlist() {
    if (playerlist.style.display !== "none") {
        playerlist.style.display = "none"
    }
}

function updateServerSettings() {
    emptyElement(serverSettings)
    const serverInfo = document.createElement("div")
    if (gameData.state === "connecting") {
        serverInfo.textContent = "Not connected"
    } else {
        serverInfo.textContent = `Connected to ${serverIP}:${serverPort}`
    }
    serverSettings.appendChild(serverInfo)
    const button = document.createElement("button")
    button.textContent = "Change"
    button.classList.add("btn", "waves-effect", "waves-light")
    button.addEventListener("click", () => {
        connectModal.open()
    })
    serverSettings.appendChild(button)
}

function updatePlayerSettings() {
    emptyElement(playerSettings)
    localPlayers.forEach(player => {
        const element = document.createElement("div")
        element.classList.add("player")
        element.innerHTML =  `
        <div class="blob" style="background-color:${player.color};"></div>
        <div>${player.name}</div>
        <div>Controls: ????</div>`
        playerSettings.appendChild(element)
    })
    const addButton = document.createElement("button")
    addButton.textContent = "Add player"
    addButton.classList.add("btn", "waves-effect", "waves-light")
    if (gameData.state === "connecting") {
        addButton.setAttribute("disabled", "disabled")
    }
    playerSettings.appendChild(addButton)
}
