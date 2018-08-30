const express = require('express');
const childProcess = require('child_process');


const app = express();

function getMCStatus ({option, ip}) {
    return new Promise((resolve, reject) => {
        let child = childProcess.execFile('mcstatus', [ip, option]);    
        let response = '';
        child.stdout.on('data', (data) => {
            response += data.toString();
        })
        child.on("close", () => {
            resolve(response.trim());
        })
    });
} 

async function getStatus (ip) {
    function getVersion (versionLine) {
        let version = versionLine.replace('version:', '');
        return version;
    }

    function getDescription (descriptionLine) {
        let description = descriptionLine.replace('description: ', '');
        description = description.replace('u\'', '\'');
        description = description.replace(`"{'text': `, '');
        description = description.replace(`'}"`, '');
        description = description.replace('u\'', '');

        return description;
    }

    function getPlayers (playersLines) {
        let serverPlayerStatusRegex = /\d+\/\d+/g;
        let playersRegex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
        let playerIdRegex = /\(([^\)]+)\)/g

        let serverPlayerStatusData = serverPlayerStatusRegex.exec(playersLines)[0].split('/');
        let activePlayers = parseInt(serverPlayerStatusData[0]);
        let limitPlayers = parseInt(serverPlayerStatusData[1]);
        let rawPlayers = [];
        
        if(activePlayers) {
            rawPlayers = Array.from(playersRegex.exec(playersLines))
                .map((item) => item.replace('\'', ''))
                .filter((rawPlayer) => rawPlayer.length && rawPlayer.indexOf(' (' > -1))
                .map((rawPlayer) => {
                    let id = playerIdRegex.exec(rawPlayer)[0].replace('(', '').replace(')','');
                    let name = rawPlayer.replace(playerIdRegex, '').replace('\'', '').trim();
                    return {
                        id,
                        name
                    };
                });
        }
        
        let list = rawPlayers;

        let players = {
            activePlayers,
            limitPlayers,
            list
        };

        return players;
    }

    let mcStatusData = {
        ip,
        option: 'status'
    }

    return getMCStatus(mcStatusData)
        .then((response) => {
            let lines = response.split('\n');
            let version = getVersion(lines[0]);
            let description = getDescription(lines[1]);
            let players = getPlayers(lines[2]);
            return {
                version,
                description,
                players
            };
        })
}

async function getPing (ip) {
    return getMCStatus({
        ip,
        option: 'ping'
    })
}


app.get('/status/:ip', async (req, res) => {
    let ip = req.params.ip;

    try {
        let data = await getStatus(ip);
        let ping = await getPing(ip);
    
        data.ping = ping;
        
        res.json({data});
    } catch (err) {
        res.status(500).json(err);
    }
            
    
})

app.get('/ping/:ip', async (req, res) => {
    let ip = req.params.ip;
    try {
        let data = await getPing(ip);
        
        res.json({data});
    } catch (err) {
        res.status(500).json(err);
    }
})

app.listen(80);