require('express-async-errors');
require('dotenv/config');
const express = require('express');
const paladinsJS = require('paladins.js');

const server = express();
server.use(express.urlencoded({ extended: false }));
server.use(express.json());

let api = new paladinsJS.API({
    devId: process.env.DEV_ID,
    authKey: process.env.API_KEY
});

async function alwaysReturnsId(player) {
    isNaN(player) &&
    (
        await api.getPlayerIdByName(player)
        .then((res) => {
            player = res[0].player_id;
        })
        .catch(() => {
            return null;
        })
    )
    
    return parseInt(player);
}

async function findChampion(champion) {
    return await api.getChampions()
    .then((res) => {
        return res.filter(function (el) {
            return (el.Name).toLowerCase() === champion.toLowerCase();
        })
    })
    .catch((err) => {
        console.log(err);
        return null;
    })
}

server.get('/', (request, response) => {
    response.status(200).send({'sucess' : 'Server running', 'doc' : 'https://vhrita.github.io' });
});

// returns player information and verify if a code or a name was provided
server.get('/players/:player', async (request, response) => {
    var player = request.params.player;

    player ?
    (
        id = await alwaysReturnsId(player),
        id && id.length!==0 ? (
            await api.getPlayer(id)
            .then((res) => {
                response.status(200).send(res);
            })
        ) : response.status(400).send({'error' : `Player ${player} doesn't exists or is a private account`})
    ) : 
    (
        response.status(400).send({
            "error" : "Please provide player name" 
        })
    )
});

// returns player status and match_queue_id
server.get('/players/:player/status', async (request, response) => {
    var player = request.params.player;

    id = await alwaysReturnsId(player),
    id && id.length!==0 ? (
        player ?
        (
            await api.getPlayerStatus(id)
            .then((res) => {
                response.status(200).send(res);
            })
        ) : 
        (
            response.status(400).send({
                "error" : "Please provide player name" 
            })
        )
    ) : response.status(400).send({'error' : `Player ${player} doesn't exists or is a private account`})
});

// returns player champions rank information or specific player champion status
server.get('/players/:player/champions/:champion?', async (request, response) => {
    var player = request.params.player;
    var champion = request.params.champion;
    var id;

    player ?
    (   
        id = await alwaysReturnsId(player),
        id && id.length!==0 ? 
        (
            await api.getPlayerChampionRanks(id)
            .then(async (res) => {
                if(champion) {
                    let championExists = await findChampion(champion);
                    if(championExists && championExists.length!==0) {
                        let filtered = res.filter(function (el) {
                            return (el.champion).toLowerCase() === champion.toLowerCase();
                        })
                        filtered.length > 0 ? response.status(200).send(filtered)
                        : response.status(404).send({'error' : `Champion ${champion} not found in ${player}'s rank`})
                    } else {
                        response.status(400).send({'error' : `Champion ${champion} doesn't exists in Paladins`})
                    }
                } else {
                    response.status(200).send(res);
                }
            })
        ) : response.status(400).send({'error' : `Player ${player} doesn't exists or is a private account`})
    ) : 
    (
        response.status(400).send({
            "error" : "Please provide player name" 
        })
    )
});

// returns all player decks or specific champion player decks
server.get('/players/:player/loadouts/:champion?', async (request, response) => {
    const player = request.params.player;
    const champion = request.params.champion;
    var finder;
    var loadouts;
    var id;

    player ?
    (   
        id = await alwaysReturnsId(player),
        id && id.length!==0 ? 
        (
            loadouts = await api.getPlayerLoadouts(id),
            champion ? (
                finder = await findChampion(champion),
                finder && finder.length!==0 ? (
                    response.status(200).send(
                        loadouts.filter(function (el) {
                            return (el.ChampionName).toLowerCase() === champion.toLowerCase();
                        })
                    )
                ) : response.status(400).send({'error' : `Champion ${champion} doesn't exists in Paladins`})
            ) : response.status(200).send(loadouts)
        ) : response.status(400).send({'error' : `Player ${player} doesn't exists or is a private account`})
    ) : 
    (
        response.status(400).send({
            "error" : "Please provide player name" 
        })
    )
});

// returns all paladins champions information or specific one
server.get('/champions/:champion?', async (request, response) => {
    const champion = request.params.champion;
    var champions;

    champion ? (
        champions = await findChampion(champion),
        champions && champions.length!==0 ? (
            response.status(200).send(champions)
        ) : response.status(400).send({'error' : `Champion ${champion} doesn't exists in Paladins`})
    ) : response.status(200).send(await api.getChampions())
});



server.use((error, req, response, next) => {
    console.log(`${error.stack}`);
    response.status(error.statusCode ? error.statusCode : 500)
    .send({'error' : error.statusCode ? error.message : 'Internal Server Error'});
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});