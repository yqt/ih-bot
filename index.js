var steam = require("steam"),
    util = require("util"),
    fs = require("fs"),
    crypto = require("crypto"),
    dota2 = require("dota2"),
    steamClient = new steam.SteamClient(),
    steamUser = new steam.SteamUser(steamClient),
    steamFriends = new steam.SteamFriends(steamClient),
    dota2Client = new dota2.Dota2Client(steamClient, true);

global.config = require("./config");
global.dota2Client = dota2Client;
global.localData = {};
if (global.config.steam_servers && global.config.steam_servers != []) {
    steam.servers = global.config.steam_servers;
}

var handlers = require("./handlers");

var onSteamLogOn = function onSteamLogOn(logonResp) {
    if (logonResp.eresult == steam.EResult.OK) {
        steamFriends.setPersonaState(steam.EPersonaState.Busy);
        steamFriends.setPersonaName(global.config.steam_name);
        util.log("Logged on.");

        dota2Client.launch();
        dota2Client.on("ready", function() {
            util.log("Node-dota2 ready.");

            // ----------------------------------

            // LOBBY

            var creatingLobby = 0;
            var leavingLobby = 0;
            var destroyLobby = 0;
            var lobbyChannel = "";

            if(creatingLobby == 1){ // sets only password, nothing more
                var properties = {
                    "game_name": "ali_ih",
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
                    util.log('create lobby succeed - ' + JSON.stringify(data));
                });
            }

            if(leavingLobby == 1){
                setTimeout(function(){
                    dota2Client.leavePracticeLobby(function(err, data){
                        if (!err) {
                            dota2Client.abandonCurrentGame();
                            if(global.localData.lobbyChannel) dota2Client.leaveChat(global.localData.lobbyChannel);
                        } else {
                            util.log(err + ' - ' + JSON.stringify(data));
                        }
                    });
                }, 10000);
            }

            if(destroyLobby == 1){
                setTimeout(function(){
                    dota2Client.destroyLobby(function(err, data){
                        if (err) {
                            util.log(err + ' - ' + JSON.stringify(data));
                        } else {
                            if(global.localData.lobbyChannel) dota2Client.leaveChat(global.localData.lobbyChannel);
                        }
                    });
                }, 10000);
            }
            
            // ----------------------------------
            
            // TEAM
            
            var myTeamInfo = 0;
            
            if (myTeamInfo == 1) {
                dota2Client.requestMyTeams(function(err, data){
                    util.log(JSON.stringify(data));
                });
            }
            
            // ----------------------------------
            
            // SOURCETV
            
            var sourceGames = 0;
            
            if (sourceGames == 1) {
                dota2Client.requestSourceTVGames();
                dota2Client.on('sourceTVGamesData', (gamesData) => {
                    util.log(gamesData);
                });
            }
        });

        dota2Client.on("practiceLobbyUpdate", function(lobby) {
            util.log(JSON.stringify(lobby));
            global.localData.lobby = lobby;
            dota2Client.practiceLobbyKickFromTeam(dota2Client.AccountID);
            lobbyChannel = "Lobby_"+lobby.lobby_id;
            global.localData.lobbyChannel = lobbyChannel;
            dota2Client.joinChat(lobbyChannel, dota2.schema.lookupEnum('DOTAChatChannelType_t').values.DOTAChannelType_Lobby);
        });

        dota2Client.on("unready", function onUnready() {
            util.log("Node-dota2 unready.");
        });

        dota2Client.on("chatMessage", function(channel, personaName, message) {
            handlers.chat.chatMessageHandler(channel, personaName, message);
        });

        dota2Client.on("unhandled", function(kMsg) {
            util.log("UNHANDLED MESSAGE " + dota2._getMessageName(kMsg));
        });

        steamFriends.on("friendMsg", function(steamId, message, chatEntryType) {
            handlers.friend.friendMessageHandler(steamId, message, chatEntryType);
        })
    }
},
onSteamServers = function onSteamServers(servers) {
    util.log("Received servers.");
    fs.writeFile('servers', JSON.stringify(servers), (err) => {
        if (err) {if (this.debug) util.log("Error writing ");}
        else {if (this.debug) util.log("");}
    });
},
onSteamLogOff = function onSteamLogOff(eresult) {
    util.log("Logged off from Steam.");
},
onSteamError = function onSteamError(error) {
    util.log("Connection closed by server.");
};

steamUser.on('updateMachineAuth', function(sentry, callback) {
    var hashedSentry = crypto.createHash('sha1').update(sentry.bytes).digest();
    fs.writeFileSync('sentry', hashedSentry)
    util.log("sentryfile saved");

    callback({ sha_file: hashedSentry});
});

var logOnDetails = {
    "account_name": global.config.steam_user,
    "password": global.config.steam_pass,
};
if (global.config.steam_guard_code) logOnDetails.auth_code = global.config.steam_guard_code;
if (global.config.two_factor_code) logOnDetails.two_factor_code = global.config.two_factor_code;

try {
    var sentry = fs.readFileSync('sentry');
    if (sentry.length) logOnDetails.sha_sentryfile = sentry;
}
catch (beef){
    util.log("Cannot load the sentry. " + beef);
}

util.log("starting..");

steamClient.on('connected', function() {
    steamUser.logOn(logOnDetails);
});

steamClient.on('logOnResponse', onSteamLogOn);
steamClient.on('loggedOff', onSteamLogOff);
steamClient.on('error', onSteamError);
steamClient.on('servers', onSteamServers);

steamClient.connect();