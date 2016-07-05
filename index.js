'use strict'
const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const concourse = require('./middleware/concourse')

//---- Wit.ai
// When not cloning the `node-wit` repo, replace the `require` like so:
// const Wit = require('node-wit').Wit;
const Wit = require('node-wit').Wit;

const token = '6M6DIYGQXZDPCSVV6WXWNPBVLHZCO4NY';

const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};
//--- /Wit.ai 

//--- Messenger Bot
const Bot = require('messenger-bot')

let bot = new Bot({
  token: 'EAAHxpxPh2PUBAKLyLlV9u3tQRZBqeE2WsTKlGSpXvSzuR403ZCvSQZBtcpOZAsj5xLd9XIfLKaCnZBZCxr4ZB8BGhAZCLlpQl2tymZBcEBHO54qwlZCwmHHyu4z3kdVHGV5qBgkbsc7yRu1gYTDYWcCRSZCZBZAmZB3C2cdxCq7A0dA88BUgZDZD',
  verify: 'the_mantis_sits_upon_the_white_lotus',
  app_secret: '1e16fd0a5415b7f6bde0de7a4df29747'
})
//--- /Messenger Bot

//--- Wit.ai 
const actions = {
  say(sessionId, context, message, cb) {
    console.log(message);
    let text = message
    // console.log("text")
    // console.log(text)
    // let reply = "Hello"
    console.log("Talking to session:")
    // console.log(context)
    bot.sendMessage(sessions[sessionId].fbid.id, { text: message }, (err) => {
      if (err) console.log( err )

      // console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${message}`)
    })
    cb();
  },
  merge(sessionId, context, entities, message, cb) {
    const pipeline_name = firstEntityValue(entities, 'pipeline_name');
    if (pipeline_name) {
      context.pipeline_name = pipeline_name;
    }
    cb(context);
  },
  error(sessionId, context, err) {
    console.log(err.message);
  },
  fetch_pipelines(sessionId, context, cb) {
    var pipelines = new Object()

    concourse.fetchPipelines().then(function(res){
      return res.json()
    }).then(function(pJson){
      var buttons = new Array()
      var count = 0
      pJson.forEach(function(pipeline){
        // console.log("pipeline", pipeline)
        pipelines[pipeline.name] = pipeline
        if(count < 3){
          buttons.push({
            "type":"postback",
            "title":pipeline.name,
            "payload":pipeline.name + " pipeline"
          })
          count++
        }
        // console.log("buttons", buttons)
      })

      return buttons
    }).then(function(buttons){
      console.log("buttons", buttons)
      var msg = {
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"button",
            "text":"Here are some of your pipelines:",
            "buttons":buttons
          }
        }
      }

      context.pipelines = pipelines

      return bot.sendMessage(sessions[sessionId].fbid.id, msg, (err) => {
      if (err) console.log( err )

        // console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${message}`)
      })
    }).then(function(){
      cb(context)
    })
  },
  get_pipeline_status(sessionId, context, cb){
    console.log("pipeline status context")
    console.log(context)
    var failed_job_count = 0
    var failed_resource_count = 0
    
    concourse.fetchJobs(context.pipeline_name).then(function(res){
      return res.json()
    }).then(function(jobsJson){
      jobsJson.forEach(function(concourse_job){
        if(concourse_job.finished_build.status !== "succeeded"){
          failed_job_count++
        }
      })

      return concourse.fetchResources(context.pipeline_name)
    }).then(function(res){
      return res.json()
    }).then(function(resourcesJson){
      resourcesJson.forEach(function(concourse_resource){
        if(concourse_resource.check_error){
          failed_resource_count++
        }
      })

      var msg
      if(failed_resource_count === 0 && failed_job_count === 0){
        msg = context.pipeline_name + " is all good."
      }else{
        msg = context.pipeline_name + " has " + failed_job_count + "failed jobs and " + failed_resource_count + " failed resources."
      }

      return bot.sendMessage(sessions[sessionId].fbid.id, { "text": msg } , (err) => {
      if (err) console.log( err )

        // console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${message}`)
      })
    }).then(function(){
      cb()
    })
  }
};

const wit = new Wit(token, actions);
//--- /Wit.ai 

bot.on('error', (err) => {
  console.log(err.message)
})

bot.on('message', (payload, reply) => {
  let text = payload.message.text
  const sessionId = findOrCreateSession(payload.sender);
  // Let's forward the message to the Wit.ai Bot Engine
  // This will run all actions until our bot has nothing left to do
  wit.runActions(
    sessionId, // the user's current session
    text, // the user's message 
    sessions[sessionId].context, // the user's current session state
    (error, context) => {
      if (error) {
        console.log('Oops! Got an error from Wit:', error);
      } else {

        console.log("Have a response from Wit, the context is:")
        console.log(context)
        // Our bot did everything it has to do.
        // Now it's waiting for further messages to proceed.
        console.log('Waiting for futher messages.');

        // Based on the session state, you might want to reset the session.
        // This depends heavily on the business logic of your bot.
        // Example:
        // if (context['done']) {
        //   delete sessions[sessionId];
        // }

        // Updating the user's current session state
        sessions[sessionId].context = context;
      }
    }
  );


  console.log(payload)
  // bot.reply({ text }, (err) => {
  //     if (err) throw err

  //     console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
  //   })
  // })
})

bot.on('postback', (payload, reply) => {
  console.log("postback", payload)
  let text = payload.postback.payload
  const sessionId = findOrCreateSession(payload.sender);
  // Let's forward the message to the Wit.ai Bot Engine
  // This will run all actions until our bot has nothing left to do
  wit.runActions(
    sessionId, // the user's current session
    text, // the user's message 
    sessions[sessionId].context, // the user's current session state
    (error, context) => {
      if (error) {
        console.log('Oops! Got an error from Wit:', error);
      } else {

        console.log("Have a response from Wit, the context is:")
        console.log(context)
        // Our bot did everything it has to do.
        // Now it's waiting for further messages to proceed.
        console.log('Waiting for futher messages.');

        // Based on the session state, you might want to reset the session.
        // This depends heavily on the business logic of your bot.
        // Example:
        // if (context['done']) {
        //   delete sessions[sessionId];
        // }

        // Updating the user's current session state
        sessions[sessionId].context = context;
      }
    }
  );


  console.log(payload)
  // bot.reply({ text }, (err) => {
  //     if (err) throw err

  //     console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
  //   })
  // })
})

let app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

app.get('/', (req, res) => {
  return bot._verify(req, res)
})

app.post('/', (req, res) => {
  bot._handleMessage(req.body)
  res.end(JSON.stringify({status: 'ok'}))
})

http.createServer(app).listen(process.env.PORT || 3000)
