/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
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

var food, searchAPIURL, ndbnoList = [];
var msg, weight, steps, gender, genderFemale, loseWeight, loss = 0, calories = 0, calNeeded = 0;
var searchAPIURL1 = "https://api.nal.usda.gov/ndb/search/?format=json&q="
var searchAPIURL2 = "&sort=n&max=25&offset=0&api_key=DEMO_KEY"

bot.dialog('/', [
    function (session) {
        session.send("Welcome to Heathy Eat. ");
        builder.Prompts.text(session, "What's your name?");
    },
    function (session, results) {
        name = results.response;
        msg = "We need more info, " + name + ". May I ask what's your gender? Male or female.";
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        gender = results.response;
        if (gender.toLowerCase().includes("female")){
            genderFemale = true;
        }
        msg = "We need more info, " + name + ". How much do you weigh in pounds?";
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        weight = results.response;
        msg = "Okay, " + name + ". You weigh " + weight + ".";
        session.send(msg);
        session.beginDialog('weightLoss');
    },
    function (session, results) {

        try {
            loss = parseInt(results.response);
        }
        catch (err) {
            loss = 0;
        }

        weight -= loss;
        msg = "Your target weight is " + weight + ".";
        session.send(msg);
        
        msg = name + ", can you tell me what you eat today?";
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        food = results.response.split(" ");
        if (genderFemale){
            calNeeded = 2000;
        } else {
            calNeeded = 2500;
        }
        if (loss > 0) {
            calNeeded -= 500;
        }
        var count = 0;
        msg = "stub";
        calories = 3000;
        /*
        for (var i in food) {
            searchAPIURL = searchAPIURL1 + food[i] + searchAPIURL2;
            fetch(searchAPIURL)
                .then(res => res.json())
                .then(json => {
                        var ndbno = json.list.item[0].ndbno;
                        ndbnoList.push(ndbno);
                        msg += ndbno + " ";
                        console.log(msg);
                        count ++;
                        if (count == food.length) {
                            console.log("Final: " + msg);
                            session.send(msg);
                        }
                    });
        }
        */
        session.send("Ok, you ate " + msg);
        msg = name + ", how many steps you took today already?"
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        steps = parseInt(results.response);
        var extra_calories = calories - calNeeded - parseInt(weight)/3500.0 * steps;
        //exercise if calNeeded is positive
        if (extra_calories > 0) {
            var stepNeeded = parseInt(calNeeded * 3500.0 / parseInt(weight));
            msg = "I think you need to exercise for " + stepNeeded + " steps more.";
            msg += "\nThen you will lose one pound per week, and your weight after 5 weeks will be " + (parseInt(weight) - 5) + " pounds.";
        }
        else {
            msg = "I think you need " + parseInt(-extra_calories) + " calories more.";
        }
        session.send(msg); 
    }
]);


bot.dialog('weightLoss', [
    function (session) {
        msg = 'Do you want to lose weight?';
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        loseWeight = results.response.toLowerCase().includes("y") || results.response.toLowerCase().includes("ok");

        if (loseWeight) {
            msg = "By how much?";
            builder.Prompts.text(session, msg);
        }
        else {
            results.response = 0;
            session.endDialogWithResult(results);
        }
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);
