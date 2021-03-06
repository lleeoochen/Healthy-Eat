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

var food, searchAPIURL, ndbnoList = [];
var msg, weight, steps, gender, genderFemale, loseWeight, loss = 0, calories = 0, calNeeded = 0;
var searchAPIURL1 = "https://api.nal.usda.gov/ndb/search/?format=json&q="
var searchAPIURL2 = "&sort=n&max=25&offset=0&api_key=DEMO_KEY"
var text; // food text lookup result
var label; // food lookup result description
var quantity; // IN PROGRESS: NLP quantity of food item
var measureURI;
var foodURI;   
var obj;
var requests;
var cal=0, fat=0, chocdf=0, fibtg=0, sugar=0, procnt=0, chole=0;
var messageConsume;
var messageResult;

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
        msg = "Okay, " + name + ". You weigh " + weight + " pounds.";
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
        food = results.response.split(" and ");
        
        if (genderFemale)
            calNeeded = 2000;
        else
            calNeeded = 2500;

        if (loss > 0)
            calNeeded -= 500;

        calories = 0;
        requests = 0;
        msg = "";
        messageConsume = "You consumed something like:\n\n";
        messageResult = "Your nutrition results:\n\n";

        for (var index in food) {
            var encodeFood = encodeURI(food[index]);
            console.log(encodeFood);

            fetch("https://api.edamam.com/api/food-database/parser?ingr=" + encodeFood + "&app_id=b748a952&app_key=cc939ba207e01222b0737319798f84e6&page=0")
                .then(res=>res.json())
                .then(json => {
                    text = json.text;

                    if (json.hints[0] != undefined) {
                        label = json.hints[0].food.label;
                        measureURI = json.hints[1].measures[0].uri;
                        foodURI = json.hints[0].food.uri;
                        messageConsume += label + ".\n";
                        session.beginDialog('calories');
                    }
                    else {
                        requests++;
                    }
                    
                    if (requests == food.length)
                        session.beginDialog('none');
                })
        }

    },
    function (session, results) {
        if (fat > 78) {
            messageResult += "You ate " + parseInt(fat) + "g fat today. It should be less than 78 g.\n";
        }
        if (chocdf > 325) {
            messageResult += "You ate " + parseInt(chocdf) + "g carbs today. It should be less than 325 g.\n";
        }
        if (fibtg < (cal/1000*14)) {
            messageResult += "You ate " + parseInt(fitbtg) + "g fiber today. Suggest you to eat" + (cal/1000*14) + " g of fiber everyday.\n";
        }
        if (genderFemale && sugar > 20) {
            messageResult += "You shall eat no more than 20g sugar.\n";
        }
        if (!genderFemale && sugar > 36) {
            messageResult += "You shall eat no more than 36g sugar.\n";
        }
        if (procnt < (parseInt(weight)*0.36)){
            messageResult += "You should eat more proteins.\n";
        }
        if (chole > 300) {
            messageResult += "You ate " + parseInt(chole) + "mg cholesterol. Doctor usually suggests that you consume no more than 300 mg -- 200 mg if you had a high risk of heart disease.\n";
        }

        builder.Prompts.text(session, messageConsume + "\n\n Please confirm.");
    },
    function (session, result) {  
        builder.Prompts.text(session, messageResult + "\n\n Please confirm.");
    },
    function (session, result) {
        msg = name + ", how many steps have you walked today?";
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
        steps = parseInt(results.response);
        var extra_calories = calories - calNeeded - parseInt(weight)/3500.0 * steps;
        //exercise if calNeeded is positive
        if (extra_calories > 0) {
            var stepNeeded = parseInt(calNeeded * 3500.0 / parseInt(weight));
            msg = "I think you need to walk " + stepNeeded + " steps more.";

            if (loseWeight)
                msg += "\nThen you will lose one pound per week, and your weight after 5 weeks will be " + (parseInt(weight) - 5) + " pounds.";
        }
        else {
            msg = "I think you need to eat " + parseInt(-extra_calories) + " calories more.";
        }
        session.send(msg);
        session.endDialog();
    }
]);

bot.dialog('calories', [
    function (session,results) {

        // session.send("Calculating nutrient information...");

        // session.send("Calculating calories...");
        obj = {
            "yield": 1,
            "ingredients": [{
                "quantity": 1,
                "measureURI": measureURI,
                "foodURI": foodURI
            }]
        }
        fetch("https://api.edamam.com/api/food-database/nutrients?app_id=b748a952&app_key=cc939ba207e01222b0737319798f84e6", {
            body: JSON.stringify(obj),
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST" })
            .then(res=>res.json())
            .then(json => {
                cal = json.calories;
                var nutrient;
                var nutriLabel;
                //console.log(cal);
                // session.send(label + ": " + "Calories: " + cal);
                // for (var nutrient in json.totalNutrients) {
                //     for (var property in json.totalNutrients[nutrient]) {
                //         console.log("Property: " + property);
                //         //console.log(json.totalNutrients[nutrient][property]);
                //         //console.log(json.totalNutrients[nutrient][property]);
                //         nutriLabel = json.totalNutrients[nutrient][property];
                //         session.send(property + ": " + nutriLabel);
                //     }
                // }
                calories += json.calories;
                // console.log(calories);
                // session.send("Calories: " + calories);

                if (json.totalNutrients.FAT != undefined)
                    fat += json.totalNutrients.FAT.quantity;
                if (json.totalNutrients.CHOCDF != undefined)
                    chocdf += json.totalNutrients.CHOCDF.quantity;
                if (json.totalNutrients.FIBTG != undefined)
                    fibtg += json.totalNutrients.FIBTG.quantity;
                if (json.totalNutrients.SUGAR != undefined)
                    sugar += json.totalNutrients.SUGAR.quantity;
                if (json.totalNutrients.PROCNT != undefined)
                    procnt += json.totalNutrients.PROCNT.quantity;
                if (json.totalNutrients.CHOLE != undefined)
                    chole += json.totalNutrients.CHOLE.quantity;
                requests++;

                if (requests == food.length)
                    session.endDialogWithResult(results);
            });

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

bot.dialog('none', [
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);
