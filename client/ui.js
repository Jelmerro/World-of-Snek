/*
* World of Snek - Snake Battle Royale
* Copyright (C) 2020 Jelmer van Arnhem
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

/* global M connectSocket gameData serverIP serverPort localPlayers controls
makeNewPlayer removePlayer */

const playerlist = document.getElementById("player-list")
const areaShrink = document.getElementById("area-shrink")
const spectatorDisplay = document.getElementById("spectator-display")
const menu = document.getElementById("menu")
let menuModal
const connect = document.getElementById("connect-modal")
let connectModal
const addPlayer = document.getElementById("add-player")
let addPlayerModal
const connectButton = document.getElementById("connect")
const closeConnect = document.getElementById("close-connect")
const addPlayerButton = document.getElementById("confirm-player")
const closePlayer = document.getElementById("close-player")
const ipField = document.getElementById("server-ip")
const portField = document.getElementById("server-port")
let preferredIP
let preferredPort
const serverSettings = document.getElementById("server-settings")
const playerSettings = document.getElementById("player-settings")
let dynamicScaling = false
const scalingControl = document.getElementById("dynamic-scaling")
let maxEntities = 2000
const maxEntitiesControl = document.getElementById("max-entities")
const playerForm = document.getElementById("player-form")
const controlSelect = document.getElementById("control-select")
const playerColorField = document.getElementById("player-color")
const playerNameField = document.getElementById("player-name")
const controlUp = document.getElementById("up")
const controlDown = document.getElementById("down")
const controlLeft = document.getElementById("left")
const controlRight = document.getElementById("right")
// for materialize
const modals = document.querySelectorAll(".modal")
const selects = document.querySelectorAll("select")

let lastPlayers
let lastCountdown

// init modals
document.addEventListener("DOMContentLoaded", () => {
    M.Modal.init(modals, {dismissible: false})
    menuModal = M.Modal.getInstance(menu)
    connectModal = M.Modal.getInstance(connect)
    addPlayerModal = M.Modal.getInstance(addPlayer)
    M.FormSelect.init(selects)
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
    const key = e.key
    // if a colon is typed, go to port field
    if (key !== ":") {
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

addPlayer.addEventListener("keydown", e => {
    const key = e.keyCode
    // if esc is pressed, close the modal
    if (key === 27) {
        addPlayerModal.close()
        // prevent the menuModal trigger
        e.stopPropagation()
    }
})

connectButton.addEventListener("click", connectFromModal)

closeConnect.addEventListener("click", closeConnectModal)

closePlayer.addEventListener("click", e => {
    e.preventDefault()
    addPlayerModal.close()
})

scalingControl.addEventListener("change", () => {
    dynamicScaling = scalingControl.checked
})

maxEntitiesControl.addEventListener("change", () => {
    maxEntities = maxEntitiesControl.value
})

controlSelect.addEventListener("change", () => {
    if (controls[controlSelect.value]) {
        fillControlFields(controls[controlSelect.value])
        controlUp.disabled = true
        controlDown.disabled = true
        controlLeft.disabled = true
        controlRight.disabled = true
    } else {
        emptyControlFields()
        controlUp.disabled = false
        controlDown.disabled = false
        controlLeft.disabled = false
        controlRight.disabled = false
    }
    M.updateTextFields()
})

controlUp.addEventListener("keydown", setKeyControl)
controlDown.addEventListener("keydown", setKeyControl)
controlLeft.addEventListener("keydown", setKeyControl)
controlRight.addEventListener("keydown", setKeyControl)

function setKeyControl(e) {
    e.preventDefault()
    e.target.value = e.code
}

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
    element.innerHTML =  `<div class="player">
    <div class="blob ${player.shape}" style="background-color:${player.color};">
    </div>
    <div class="name">${player.name}</div>
    <div class="wins">Wins: ${player.wins}</div>
    <div class="score">Score: ${player.score}</div></div>`
    if (player.powerups && player.alive && Object.keys(player.powerups).length > 0) {
        let powerups = `<div class="powerups">`
        Object.keys(player.powerups).forEach(p => {
            powerups += `<div><img src="img/${p}.png"><span>${player.powerups[p]}</span></div>`
        })
        powerups += "</div>"
        element.innerHTML += powerups
    }
    return element
}

function updatePlayerList(gamemode, players) {
    const newPlayers = filterPlayerData(players)
    if (JSON.stringify(lastPlayers) !== JSON.stringify(newPlayers)) {
        emptyElement(playerlist)
        const header = document.createElement("div")
        header.className = "player"
        let fancyMode = gamemode
        if (fancyMode === "score") {
            fancyMode = "Highest score"
        }
        if (fancyMode === "lastalive") {
            fancyMode = "Survive the longest"
        }
        header.textContent = `Goal: ${fancyMode}`
        playerlist.appendChild(header)
        players.forEach(player => {
            playerlist.appendChild(playerElement(player))
        })
    }
    lastPlayers = newPlayers
}

function updateAreaShrink(countdown) {
    if (lastCountdown !== countdown) {
        areaShrink.textContent = countdown
    }
    lastCountdown = countdown
}

function filterPlayerData(players) {
    return players.map(player => {
        // filter to only info that is relevant to updating playerlist
        const detailedPowerups = JSON.parse(JSON.stringify(player.powerups))
        player.powerups = {}
        Object.keys(detailedPowerups).forEach(p => {
            player.powerups[p] = (detailedPowerups[p] / 1000000000).toFixed(1)
        })
        return {
            shape: player.shape,
            score: player.score,
            alive: player.alive,
            powerups: player.powerups,
            wins: player.wins
        }
    })
}

function showElement(element) {
    if (element.style.display !== "flex") {
        element.style.display = "flex"
    }
}

function hideElement(element) {
    if (element.style.display !== "none") {
        element.style.display = "none"
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
    serverSettings.appendChild(document.createElement("br"))
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
    hideElement(spectatorDisplay)
    // if there are no players yet, inform of spectator mode
    if (!localPlayers.length) {
        const element = document.createElement("div")
        element.textContent = "You are spectating, add a player to start."
        playerSettings.appendChild(element)
        playerSettings.appendChild(document.createElement("hr"))
        if (gameData.state !== "connecting") {
            showElement(spectatorDisplay)
        }
    }
    localPlayers.forEach(player => {
        const element = document.createElement("div")
        element.classList.add("player")
        const registedPlayer = gameData && gameData.players && gameData.players
            .find(p => p.uuid === player.uuid)
        let extraInfo = ""
        if (!registedPlayer) {
            extraInfo = `<span class="warning">Player has yet to be comfirmed
            by the server, room might be full or the username is taken</span>`
            element.classList.add("grey-text")
        }
        element.innerHTML =  `<div class="blob" style="background-color:
        ${registedPlayer?.color || player.color};"></div>
        <div>${player.name} ${extraInfo}</div>`
        const editButton = document.createElement("button")
        editButton.textContent = "Edit"
        editButton.classList.add("btn", "waves-effect", "waves-light")
        editButton.style.marginRight = "1em"
        editButton.addEventListener("click", () => {
            updateAddPlayer(true, player)
            addPlayerModal.open()
        })
        const deleteButton = document.createElement("button")
        deleteButton.textContent = "Remove"
        deleteButton.classList.add("btn", "red", "waves-effect", "waves-light")
        deleteButton.addEventListener("click", () => {
            removePlayer(player.uuid)
            updatePlayerSettings()
        })
        playerSettings.appendChild(element)
        playerSettings.appendChild(editButton)
        playerSettings.appendChild(deleteButton)
        playerSettings.appendChild(document.createElement("hr"))
    })
    const addButton = document.createElement("button")
    addButton.textContent = "Add player"
    addButton.classList.add("btn", "waves-effect", "waves-light")
    addButton.addEventListener("click", () => {
        updateAddPlayer()
        addPlayerModal.open()
    })
    playerSettings.appendChild(addButton)
}

function updateAddPlayer(edit = false, player) {
    const title = addPlayer.querySelector("h3")
    if (edit) {
        title.textContent = "Edit a player"
        playerColorField.value = player.color
        playerColorField.disabled = true
        playerNameField.value = player.name
        playerNameField.disabled = true
        if (player.controls.preset) {
            controlSelect.value = player.controls.preset
        } else {
            controlSelect.value = "Custom"
        }
        fillControlFields(player.controls)
        // onclick to override function
        addPlayerButton.onclick = e => {
            e.preventDefault()
            const formValid = playerForm.checkValidity()
            const selectValid = controlSelect.selectedIndex !== 0
            if (formValid && selectValid) {
                const editedPlayer = localPlayers.find(p => p.uuid === player.uuid)
                if (controls[controlSelect.value]) {
                    Object.assign(editedPlayer.controls, controls[controlSelect.value])
                } else {
                    Object.assign(editedPlayer.controls, getControls())
                }
                addPlayerModal.close()
            }
        }
    } else {
        title.textContent = "Add a new player"
        playerColorField.value = "#000000"
        playerColorField.disabled = false
        playerNameField.value = null
        playerNameField.disabled = false
        controlSelect.selectedIndex = 0
        emptyControlFields()
        // onclick to override function
        addPlayerButton.onclick = e => {
            e.preventDefault()
            const formValid = playerForm.checkValidity()
            const selectValid = controlSelect.selectedIndex !== 0
            if (formValid && selectValid) {
                const [name, color] = getNameAndColor()
                let ctrls
                if (controls[controlSelect.value]) {
                    ctrls = controls[controlSelect.value]
                } else {
                    ctrls = getControls()
                }
                const newPlayer = makeNewPlayer(name, color, ctrls)
                localPlayers.push(newPlayer)
                updatePlayerSettings()
                addPlayerModal.close()
            }
        }
    }
    M.updateTextFields()
    M.FormSelect.init(selects)
}

function fillControlFields(controls) {
    controlUp.value = controls.up
    controlDown.value = controls.down
    controlLeft.value = controls.left
    controlRight.value = controls.right
}

function emptyControlFields() {
    controlUp.value = null
    controlDown.value = null
    controlLeft.value = null
    controlRight.value = null
}

function getNameAndColor() {
    return [playerNameField.value, playerColorField.value]
}

function getControls() {
    return {
        preset: null,
        up: controlUp.value,
        down: controlDown.value,
        left: controlLeft.value,
        right: controlRight.value
    }
}
