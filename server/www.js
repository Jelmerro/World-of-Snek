/*
* World of Snek - Snake Battle Royale
* Copyright (C) 2019-2020 Jelmer van Arnhem
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

const http = require("http")
const fs = require("fs")
require("colors")

const serve = (port = 8000) => {
    http.createServer((req, res) => {
        const requestUrl = `${__dirname}/../client/${req.url}`
        const requestUrlIndex = `${requestUrl}/index.html`
        try {
            if (isFile(requestUrl)) {
                fs.createReadStream(requestUrl).pipe(res)
                res.writeHead(200)
            } else if (isFile(requestUrlIndex)) {
                fs.createReadStream(requestUrlIndex).pipe(res)
                res.writeHead(200)
            } else {
                res.writeHead(404)
                res.end()
            }
        } catch (e) {
            console.log(e.toString().red)
        }
    }).listen(port)
}

const isFile = f => {
    try {
        return fs.existsSync(f) && fs.lstatSync(f).isFile()
    } catch (e) {
        return false
    }
}

if (module.parent) {
    module.exports = serve
} else {
    serve()
}
