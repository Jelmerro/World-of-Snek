"use strict"

/* global players */

window.addEventListener("keydown", e => {
    const key = e.keyCode
    players.forEach(player => {
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
    const key = e.keyCode
    players.forEach(player => {
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
