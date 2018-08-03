var util = require("util"),
    dota2Client = global.dota2Client,
    lobby = global.localData.lobby;

var cmdStart = '!start';

function strip(str) {
    return str.replace(/^\s+|\s+$/g, "");
}

function chatMessageHandler(channel, personaName, message) {
    if (channel != "Lobby_" + lobby.lobby_id) {
        return;
    }
    util.log("[" + channel + "] " + personaName + ": " + message);
    message = strip(message);
    switch (message) {
        case cmdStart:
            dota2Client.launchPracticeLobby(function(err, data) {
                util.log(JSON.stringify(data));
            })
            break;
        default:
            util.log("unknow cmd[" + message + "]");
    }
}

exports.chatMessageHandler = chatMessageHandler;