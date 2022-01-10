/*
* World of Snek - Snake Battle Royale
* Copyright (C) 2019-2022 Jelmer van Arnhem
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

const {createServer} = require("http")
const {createReadStream, existsSync, lstatSync} = require("fs")

const serve = (port = 8000) => {
    createServer((req, res) => {
        const requestUrl = `${__dirname}/../client/${req.url}`
        const requestUrlIndex = `${requestUrl}/index.html`
        try {
            if (isFile(requestUrl)) {
                createReadStream(requestUrl).pipe(res)
                res.writeHead(200)
            } else if (isFile(requestUrlIndex)) {
                createReadStream(requestUrlIndex).pipe(res)
                res.writeHead(200)
            } else {
                res.writeHead(404)
                res.end()
            }
        } catch (e) {
            console.log(e)
        }
    }).listen(port)
}

const isFile = f => {
    try {
        return existsSync(f) && lstatSync(f).isFile()
    } catch (e) {
        return false
    }
}

if (require.main === module) {
    serve()
} else {
    module.exports = serve
}
