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
let menuOpen = false

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
    if (menuOpen) {
        menuModal.close()
    } else {
        menuModal.open()
    }
    menuOpen = !menuOpen
})

// function openModal(id) {
//     const modal = document.getElementById(id)
//     modal.style.display = "flex"
//     const content = modal.children[0]
//     content.style.maxHeight = content.scrollHeight+"px"
// }
//
// function closeModal(id) {
//     const modal = document.getElementById(id)
//     const content = modal.children[0]
//     modal.style.display = "none"
//     content.style.maxHeight = "0"
// }

function playerHTML(player) {
    return `
    <div class="player">
        <div class="blob ${player.shape}" style="background-color:${player.color};"></div>
        <div class="name">${player.name}</div>
        <div class="wins">Wins: ${player.wins}</div>
        <div class="score">Score: ${player.score}</div>
    </div>`
}

function renderPlayers(players) {
    playerlist.innerHTML = ""
    players.forEach(player => {
        playerlist.innerHTML += playerHTML(player)
    })
}

function showPlayerList() {
    playerlist.style.display = "flex"
}

function hidePlayerlist() {
    playerlist.style.display = "none"
}
