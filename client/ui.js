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
/* global M */

const playerlist = document.getElementById("player-list")
const menu = document.getElementById("menu")
let menuModal

// init modals
document.addEventListener("DOMContentLoaded", () => {
    const elems = document.querySelectorAll(".modal")
    const instances = M.Modal.init(elems, {dismissible: false})
    menuModal = M.Modal.getInstance(menu)
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
        menuModal.open()
    }
})

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

function renderPlayers(players) {
    emptyElement(playerlist)
    players.forEach(player => {
        playerlist.appendChild(playerElement(player))
    })
}

function showPlayerList() {
    playerlist.style.display = "flex"
}

function hidePlayerlist() {
    playerlist.style.display = "none"
}
