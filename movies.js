const request = require('request');
const axios = require("axios");
const http = require('http');
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const express = require("express"); /* Accessing express module */
const { table } = require("console");
const { name } = require("ejs");
const app = express(); /* app is a request handler function */
const bodyParser = require("body-parser");

let myTitleContents = {};
let title = "";
let pref = "";
let sites = "";
let urls = "";
let myTable = "";

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));

//app.use(express.static(__dirname + '/images'));
app.use(express.static('public/assets'));
app.use('/public', express.static('public'));

/* view/templating engine */
app.set("view engine", "ejs");

/* Initializes request.body with post information */ 
app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (request, response) => {
    response.render("index");
 });

 app.post("/lookup", async (request, response) => {
    pref = request.body.fav_type;
    title = request.body.title;  
    const options = {
        method: 'POST',
        url: 'https://watch-here.p.rapidapi.com/wheretowatch',
        params: {title: request.body.title, mediaType: request.body.fav_type},
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': '6939c6eb92msh07a1be5ed9ff3f8p1e5c65jsn337fccb1baf9',
          'X-RapidAPI-Host': 'watch-here.p.rapidapi.com'
        },
        data: {"mediaType":request.body.fav_type,"title":request.body.title}
      };
      
      axios.request(options).then(function (response) {
        sites = "";
        urls = "";
        for (let i = 0; i < response.data.length; i++){
            length = response.data.length;
            sites += response.data[i].Watch + ", ";
            urls += response.data[i].WatchUrl + ", ";
           
        }
        myTitleContents = {
            Query : title,
            Watch : sites,
            WatchURL : urls
        }
      }).catch(function (error) {
          console.error(error);
      });
    await officalInsert(); 
    await officalTitleLookup()
    const variables = {
        pref : request.body.fav_type,
        title : request.body.title,
        message: myTable
    }
    response.render("lookupPage", variables);
 });

 process.stdin.setEncoding("utf8");
 let portNumber =  process.argv[2];
 console.log(`Web server started and running at http://localhost:${portNumber}`);
 app.listen(portNumber); 

const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", function () {
    let dataInput = process.stdin.read();
    let command = dataInput.trim();
    if (command === "stop") {
        process.stdout.write("Shutting down the server\n");
        process.exit(0);
    }
});

const databaseAndCollection = {db: "FINAL_PROJECT", collection:"myFavTitles"};
/****** DO NOT MODIFY FROM THIS POINT ONE ******/
const { MongoClient, ServerApiVersion } = require('mongodb');
async function officalInsert() {
    const uri = `mongodb+srv://${userName}:${password}@cluster0.3clsuur.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    
    try {
        await client.connect();
        
            await insertTitle(client, databaseAndCollection, myTitleContents);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    async function insertTitle(client, databaseAndCollection, myTitleContents) {
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(myTitleContents);
    }
    async function officalTitleLookup() {
        const uri = `mongodb+srv://${userName}:${password}@cluster0.3clsuur.mongodb.net/?retryWrites=true&w=majority`;
        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    
        try {
            await client.connect();
            await lookUpOneEntry(client, databaseAndCollection, title);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    async function lookUpOneEntry(client, databaseAndCollection, title) {
        let filter = {Query: title};
        const result = await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .findOne(filter);
        if (result) {
            let myFirstString = result.Watch;
            let mySecondString = result.WatchURL;
            const mySitesArray = myFirstString.split(",");
            const myUrlsArray = mySecondString.split(",");
            myTable = "";
            myTable = "<table border='1'>";
            myTable += `<thead><tr><th>Company Name</th><th>URL of the ${pref}: ${title}</th></tr></thead>`;
            for (let i = 0; i < mySitesArray.length; i++){
                myTable += "<tr><td>" + mySitesArray[i] + "</td><td>" + myUrlsArray[i] + "</td></tr>";
        }
        } else {
            console.log(`No title found with name ${title}`);
        }
    }