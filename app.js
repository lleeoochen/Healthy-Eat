/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');
var fetch = require('node-fetch');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

var msg, weight, height, loseWeight, loss;
bot.dialog('/', [
    function (session) {
        session.send("Welcome to Heathy Eat. ");
        builder.Prompts.text(session, "What's your name?");
    },
    function (session, results) {
        name = results.response;
        msg = "We need more info, " + name + ". How tall are you?";
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        height = results.response;
        msg = "Okay, " + name + ". You are " + height + " tall. How much do you weigh?";
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        weight = results.response;
        msg = "Okay, " + name + ". You weigh " + weight + ". Do you want to lose weight?";
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        loseWeight = results.response.toLowerCase().includes("y") || results.response.toLowerCase().includes("ok");
        // session.beginDialog('byWeightLoss');
        if (loseWeight) {
            msg = "By how much?";
            builder.Prompts.text(session, msg);
        }
        else {
            builder.Prompts.text(session, "");
        }
    },
    function (session, results) {

        if ()
        loss = parseInt(results.response);
        weight -= loss;
        msg = "Your target weight is now " + weight;
        session.send(msg);
    }
]);

