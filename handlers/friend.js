var util = require("util"),
    steam = require("steam"),
    dota2 = require("dota2"),
    dota2Client = global.dota2Client;

var cmdCreateLobby = '!create_lobby',
    cmdDestroyLobby = '!destroy_lobby';

function strip(str) {
    return str.replace(/^\s+|\s+$/g, "");
}

function createLobby(properties) {
    properties = properties || {
        "game_name": "test_ih",
        "server_region": dota2.ServerRegion.PWTELECOMSHANGHAI,
        "game_mode": dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_AP,
        "series_type": dota2.SeriesType.BEST_OF_THREE,
        "game_version": 1,
        "allow_cheats": false,
        "fill_with_bots": false,
        "allow_spectating": true,
        "pass_key": "ap",
        "radiant_series_wins": 0,
        "dire_series_wins": 0,
        "allchat": true
    }

    dota2Client.createPracticeLobby(properties, function(err, data){
        if (err) {
            util.log(err + ' - ' + JSON.stringify(data));
        }
    });
    // dota2Client.on("practiceLobbyUpdate", function(lobby) {
    //     util.log(JSON.stringify(lobby));
    //     global.localData.lobby = lobby;
    //     dota2Client.practiceLobbyKickFromTeam(dota2Client.AccountID);
    //     lobbyChannel = "Lobby_"+lobby.lobby_id;
    //     dota2Client.joinChat(lobbyChannel, dota2.schema.lookupEnum('DOTAChatChannelType_t').values.DOTAChannelType_Lobby);
    // });
}

function destroyLobby() {
    setTimeout(function(){
        dota2Client.destroyLobby(function(err, data){
            if (err) {
                util.log(err + ' - ' + JSON.stringify(data));
            } else {
                if(global.localData.lobbyChannel) {
                    dota2Client.leaveChat(global.localData.lobbyChannel);
                    global.localData.lobbyChannel = null;
                }
            }
        });
    }, 200);
}

function friendMessageHandler(steamId, message, chatEntryType) {
    if (global.config.admin_steam_id && steamId != global.config.admin_steam_id) {
        return;
    }

    util.log("receive friend[" + steamId + "] msg[" + message + "] chatEntryType[" + chatEntryType + "]");
    if (chatEntryType != steam.EChatEntryType.ChatMsg) {
        return;
    }
    message = strip(message);
    switch (message) {
        case cmdCreateLobby:
            createLobby();
            break;
        case cmdDestroyLobby:
            destroyLobby();
            break;
        default:
            util.log("unknow cmd[" + message + "]");
    }
}

exports.friendMessageHandler = friendMessageHandler;