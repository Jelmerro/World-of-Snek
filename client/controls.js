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

/* global localPlayers */

const controls = {
    Arrows: {
        preset: "Arrows",
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight"
    },
    WASD: {
        preset: "WASD",
        up: "KeyW",
        down: "KeyS",
        left: "KeyA",
        right: "KeyD"
    }
}

window.addEventListener("keydown", e => {
    const key = e.code
    localPlayers.forEach(player => {
        if (player.controls.up === key) {
            player.controls.upPressed =  true
        }
        if (player.controls.down === key) {
            player.controls.downPressed =  true
        }
        if (player.controls.left === key) {
            player.controls.leftPressed =  true
        }
        if (player.controls.right === key) {
            player.controls.rightPressed =  true
        }
    })
})

window.addEventListener("keyup", e => {
    const key = e.code
    localPlayers.forEach(player => {
        if (player.controls.up === key) {
            player.controls.upPressed =  false
        }
        if (player.controls.down === key) {
            player.controls.downPressed =  false
        }
        if (player.controls.left === key) {
            player.controls.leftPressed =  false
        }
        if (player.controls.right === key) {
            player.controls.rightPressed =  false
        }
    })
})
